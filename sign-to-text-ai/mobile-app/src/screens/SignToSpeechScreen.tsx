import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { SignToSpeechScreenProps } from '@navigation/types';
import { COLORS, FONT_SIZES, SPACING } from '@utils/constants';
import { getTranslation } from '@utils/translations';
import { Language } from '../types';
// Removed mock data import - using real backend only
import apiService from '@services/api';
import localInferenceService from '@services/localInference';
import backendHealthService from '@services/backendHealthService';
import CameraCapture from '@components/CameraCapture';
import { extractFramesFromVideo, validateVideoFile } from '@utils/videoProcessor';
import { useSettings } from '@contexts/SettingsContext';
import { useTheme } from '@theme/index';
import { lightTheme } from '@theme/theme';
import config from '@config/environment';

// Filter to only English and German
const OUTPUT_LANGUAGES: Record<'en' | 'de', string> = {
  en: 'English',
  de: 'Deutsch',
};

const SignToSpeechScreen: React.FC<SignToSpeechScreenProps> = () => {
  const { settings } = useSettings();
  const { theme, themeMode } = useTheme();
  const selectedOutputLanguage = (settings.preferredLanguage === 'en' || settings.preferredLanguage === 'de') 
    ? settings.preferredLanguage 
    : 'en';

  // Simple theme logging (no forced re-renders needed - React Context handles it)
  React.useEffect(() => {
    console.log('SignToSpeechScreen theme:', { 
      themeMode,
      backgroundColor: theme.colors.background,
      textColor: theme.colors.text
    });
  }, [themeMode, theme.colors.background]);
  const [isVideoMode, setIsVideoMode] = useState(false); // true when video uploaded
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('back');
  const [uploadedVideo, setUploadedVideo] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [recordedVideoUri, setRecordedVideoUri] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isRecordedPlaying, setIsRecordedPlaying] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [previewThumbnail, setPreviewThumbnail] = useState<string | null>(null);
  const [localInferenceReady, setLocalInferenceReady] = useState(false);
  
  // Video player for recorded video (also used for uploaded videos)
  const recordedVideoPlayer = useVideoPlayer(recordedVideoUri || '', (player) => {
    player.loop = false;
    player.muted = false;
  });

  // Initialize local inference service on mount
  React.useEffect(() => {
    const initLocalInference = async () => {
      try {
        const ready = await localInferenceService.initialize();
        setLocalInferenceReady(ready);
        if (ready) {
          console.log('Local inference service ready');
        } else {
          console.log('Local inference not available, will use backend');
        }
      } catch (error) {
        console.error('Failed to initialize local inference:', error);
        setLocalInferenceReady(false);
      }
    };
    initLocalInference();
  }, []);
  
  React.useEffect(() => {
    let isMounted = true;

    const preparePreviewState = async () => {
      if (!recordedVideoUri) {
        if (isMounted) {
          setIsRecordedPlaying(false);
          setPreviewThumbnail(null);
          setIsVideoLoading(false);
        }
        return;
      }

      try {
        await recordedVideoPlayer.pause();
      } catch {}

      if (isMounted) {
        setIsRecordedPlaying(false);
      }
    };

    preparePreviewState();

    return () => {
      isMounted = false;
      try {
        recordedVideoPlayer.pause();
      } catch {}
      setIsRecordedPlaying(false);
    };
  }, [recordedVideoUri, recordedVideoPlayer]);
  
  const t = getTranslation(settings.preferredLanguage);

  const generatePreviewThumbnail = useCallback(async (uri: string) => {
    try {
      const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(uri, {
        time: 0,
      });
      setPreviewThumbnail(thumbUri);
    } catch (thumbError) {
      console.warn('Failed to generate video thumbnail:', thumbError);
      setPreviewThumbnail(null);
    } finally {
      setIsVideoLoading(false);
    }
  }, []);

  const handleRecordingStart = useCallback(() => {
    // Clear previous results when starting new recording
    setRecognizedText('');
    setConfidence(0);
    setRecordedVideoUri(null);
    setPreviewThumbnail(null);
  }, []);

  const handleRecordingComplete = useCallback((videoUri: string) => {
    console.log('Recording complete, setting video URI:', videoUri);
    setIsRecording(false);
    setRecordedVideoUri(videoUri);
    setIsRecordedPlaying(false);
    setIsVideoLoading(true);
    generatePreviewThumbnail(videoUri);
  }, [generatePreviewThumbnail]);

  const handleSendVideo = useCallback(async () => {
    if (!recordedVideoUri) {
      Alert.alert('Error', 'No video to send');
      return;
    }
    
    console.log('Processing video:', {
      uri: recordedVideoUri,
      outputLanguage: selectedOutputLanguage,
      localInferenceAvailable: localInferenceReady,
    });
    
    setIsProcessing(true);
    
    try {
      let result: { text: string; confidence: number } | null = null;

      // Try local inference first if available
      if (localInferenceReady && localInferenceService.isAvailable()) {
        try {
          console.log('Attempting local inference...');
          // Extract frames from video for local inference
          const frames = await extractFramesFromVideo(recordedVideoUri, 6, 50);
          
          if (frames.length > 0) {
            // Convert frames to base64 strings if needed
            const base64Frames = frames.map(frame => {
              // If frame is already base64, use it; otherwise convert
              if (typeof frame === 'string') {
                return frame.includes('data:') ? frame.split(',')[1] : frame;
              }
              return frame;
            });
            
            const localResult = await localInferenceService.predict(base64Frames);
            
            if (localResult && localResult.text) {
              console.log('Local inference successful:', localResult);
              result = {
                text: localResult.text,
                confidence: localResult.confidence,
              };
            }
          }
        } catch (localError) {
          console.warn('Local inference failed, falling back to backend:', localError);
        }
      }

      // Fallback to backend if local inference not available or failed
      if (!result) {
        console.log('Using backend inference...');
        
        // Check backend health before attempting upload
        try {
          const healthStatus = await backendHealthService.checkHealth();
          if (!healthStatus.isHealthy) {
            const errorMsg = backendHealthService.getErrorMessage(healthStatus);
            Alert.alert(
              'Backend Not Available',
              errorMsg,
              [
                { text: 'OK', style: 'default' },
                { 
                  text: 'Retry', 
                  onPress: () => handleSendVideo(),
                  style: 'default'
                }
              ]
            );
            setIsProcessing(false);
            return;
          }
          console.log('Backend health check passed');
        } catch (healthError) {
          console.warn('Health check failed, proceeding anyway:', healthError);
        }
        
        const backendResult = await apiService.uploadAndProcessVideo(
          recordedVideoUri,
          selectedOutputLanguage,
          `recorded_sign_${Date.now()}.mp4`
        );
        
        result = {
          text: backendResult.text || '',
          confidence: backendResult.confidence || 0,
        };
      }
      
      console.log('Video processed successfully:', result);
      
      // Set recognized text and confidence
      setRecognizedText(result.text || '');
      setConfidence(result.confidence || 0);
      
      // Inform user and reset to camera view
      if (result.text) {
        try {
          Alert.alert('Success', result.text);
        } catch {}
      }
      
      setRecordedVideoUri(null);
      setIsVideoMode(false);
      setIsRecording(false);
      
    } catch (error: any) {
      console.error('Error processing video:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
      });
      
      // Enhanced error message with troubleshooting
      let errorMessage = 'Failed to process video. Please try again.';
      let errorTitle = t.common.error || 'Error';
      
      if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNREFUSED' || error.message?.includes('Network')) {
        errorTitle = 'Backend Not Running';
        const apiUrl = config.apiBaseUrl;
        const baseUrl = apiUrl.replace('/api/v1', '');
        errorMessage = `Network error. Backend is not reachable.

API URL: ${apiUrl}

Please check:
1. Backend is running: cd backend && python run.py
2. Backend URL is correct in .env file
3. Test in browser: ${baseUrl}/health
4. Device and computer on same Wi-Fi network
5. Firewall allows port 8000`;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert(
        errorTitle,
        errorMessage,
        [
          { text: 'OK', style: 'default' },
          { 
            text: 'Retry', 
            onPress: () => handleSendVideo(),
            style: 'default'
          }
        ]
      );
    } finally {
      setIsProcessing(false);
    }
  }, [recordedVideoUri, selectedOutputLanguage, t, localInferenceReady]);

  const handleCancelRecording = useCallback(() => {
    // Clear recorded video and allow re-recording
    setRecordedVideoUri(null);
    setRecognizedText('');
    setConfidence(0);
    setPreviewThumbnail(null);
  }, []);

  const processVideo = useCallback(async (videoUri: string) => {
    setIsProcessing(true);

    try {
      // Strategy: Upload video to backend, backend will extract frames and process
      // The backend extract_frames endpoint returns frame count, not frames
      // So we need to either:
      // 1. Have backend return frames in extract_frames response
      // 2. Or use a combined endpoint
      // For now: Upload video and extract frames locally as fallback
      
      try {
        // Try uploading video to backend first
        const uploadResult = await apiService.uploadVideoFromUri(
          videoUri, 
          `recorded_sign_${Date.now()}.mp4`
        );
        
        console.log('Video uploaded successfully:', uploadResult);
        
        // TODO: Backend should have an endpoint that:
        // - Takes video file
        // - Extracts frames
        // - Processes through sign-to-text
        // For now, we'll extract frames locally and send to sign-to-text
        
        // Extract frames from video file (simplified - sends video as base64)
        const frames = await extractFramesFromVideo(videoUri, 6, 50);
        
        if (frames.length > 0) {
          // Send frames to sign-to-text API
          const result = await apiService.signToText({
            videoFrames: frames,
            signLanguage: 'DGS',
          });
          
          setRecognizedText(result.text);
          setConfidence(result.confidence || 0);
        } else {
          throw new Error('No frames extracted from video');
        }
      } catch (uploadError: any) {
        // If upload fails (e.g., auth required), try extracting frames locally
        console.log('Video upload failed or skipped, processing locally:', uploadError.message);
        
        try {
          // Extract frames from video file
          const frames = await extractFramesFromVideo(videoUri, 6, 50);
          
          if (frames.length > 0) {
            // Send frames to sign-to-text API
            const result = await apiService.signToText({
            videoFrames: frames,
            signLanguage: 'DGS',
            });
            
            setRecognizedText(result.text);
            setConfidence(result.confidence || 0);
          } else {
            throw new Error('No frames extracted');
          }
        } catch (frameError: any) {
          console.error('Frame extraction failed:', frameError);
          throw new Error(`Failed to extract frames from video: ${frameError.message || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Error processing video:', error);
      Alert.alert(t.common.error, 'Failed to process video. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [t]);

  const handleStartRecording = async () => {
    setIsVideoMode(false);
    setUploadedVideo(null);
    setIsRecording(true);
  };

  const handleStopCamera = () => {
    // Stop recording by setting isRecording to false
    // CameraCapture component will handle stopping the actual recording
    setIsRecording(false);
  };

  const handleUploadVideo = useCallback(async () => {
    try {
      setUploading(true);
      
      // Pick video file
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        setUploading(false);
        return;
      }

      const videoAsset = result.assets[0];
      const videoUri = videoAsset.uri;

      // Validate video file
      if (!validateVideoFile(videoUri)) {
        Alert.alert('Invalid File', 'Please select a valid video file (mp4, mov, avi, etc.)');
        setUploading(false);
        return;
      }

      // Set uploaded video as recordedVideoUri so it shows preview with send/cancel buttons
      setRecordedVideoUri(videoUri);
      setIsVideoMode(false);
      setIsRecording(false);
      setRecognizedText('');
      setConfidence(0);
      setPreviewThumbnail(null);
      setIsVideoLoading(true);
      generatePreviewThumbnail(videoUri);
      setUploading(false);
    } catch (error) {
      console.error('Error uploading video:', error);
      Alert.alert('Error', 'Failed to upload video');
      setUploading(false);
    }
  }, []);

  const handleRemoveVideo = () => {
    setUploadedVideo(null);
    setIsVideoMode(false);
    setRecognizedText('');
    setConfidence(0);
    setRecordedVideoUri(null);
    setPreviewThumbnail(null);
  };

  const handlePlayAudio = useCallback(async () => {
    if (!recognizedText) {
      return;
    }
    
    try {
      // Stop any currently playing speech
      if (isPlayingAudio) {
        Speech.stop();
        setIsPlayingAudio(false);
        return;
      }
      
      setIsPlayingAudio(true);
      
      // Map language to expo-speech language codes
      const languageMap: Record<string, string> = {
        'en': 'en-US',
        'de': 'de-DE',
        'es': 'es-ES',
        'fr': 'fr-FR',
        'ar': 'ar-SA',
      };
      
      const speechLanguage = languageMap[selectedOutputLanguage] || 'en-US';
      
      // Use expo-speech for local TTS
      Speech.speak(recognizedText, {
        language: speechLanguage,
        pitch: 1.0,
        rate: 1.0,
        onStart: () => {
          setIsPlayingAudio(true);
        },
        onDone: () => {
          setIsPlayingAudio(false);
        },
        onStopped: () => {
          setIsPlayingAudio(false);
        },
        onError: (error: any) => {
          console.error('Speech error:', error);
          setIsPlayingAudio(false);
          Alert.alert('Error', 'Failed to play audio');
        },
      });
      
    } catch (error: any) {
      console.error('Error playing audio:', error);
      setIsPlayingAudio(false);
      Alert.alert('Error', `Failed to play audio: ${error.message || 'Unknown error'}`);
    }
  }, [recognizedText, selectedOutputLanguage, isPlayingAudio]);
  
  // Cleanup speech on unmount
  React.useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  // Force re-render when theme changes - use themeMode directly to ensure updates
  const containerStyle = React.useMemo(() => {
    console.log('SignToSpeechScreen: Creating container style', { themeMode, backgroundColor: theme.colors.background });
    return { 
      backgroundColor: theme.colors.background,
      flex: 1 
    };
  }, [themeMode, theme.colors.background]);

  console.log('SignToSpeechScreen RENDER:', { themeMode, backgroundColor: theme.colors.background });

  const actionTopPadding = SPACING.md;
  const actionBottomPadding = SPACING.md;
  const actionButtonHeight = recordedVideoUri ? 60 : 72;

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Full Screen Camera/Video View */}
      <View style={[styles.cameraContainer, containerStyle]}>
        {recordedVideoUri ? (
          <View style={styles.videoPreviewContainer}>
            {isVideoLoading && (
              <View
                style={[
                  styles.videoLoadingOverlay,
                  {
                    backgroundColor: theme.mode === 'dark'
                      ? 'rgba(0, 0, 0, 0.85)'
                      : 'rgba(0, 0, 0, 0.7)',
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: theme.colors.header,
                    shadowColor: theme.colors.header,
                    shadowOpacity: 0.6,
                    shadowRadius: 18,
                    shadowOffset: { width: 0, height: 12 },
                    elevation: 12,
                  },
                ]}
              >
                <ActivityIndicator size="large" color={theme.colors.header} />
                <Text
                  style={[
                    styles.videoLoadingText,
                    {
                      color: '#FFFFFF',
                      fontWeight: '700',
                      letterSpacing: 0.5,
                      textTransform: 'uppercase',
                    },
                  ]}
                >
                  Preparing preview...
                </Text>
              </View>
            )}
            <VideoView
              player={recordedVideoPlayer}
              style={styles.videoPreview}
              nativeControls={false}
              contentFit="cover"
              allowsFullscreen={false}
            />
            {previewThumbnail && !isRecordedPlaying && (
              <Image
                source={{ uri: previewThumbnail }}
                style={styles.videoPreviewImage}
                resizeMode="cover"
              />
            )}
            {/* Center Play/Pause Overlay */}
            <TouchableOpacity
              style={[
                styles.playPauseOverlay,
                {
                  backgroundColor: theme.mode === 'dark'
                    ? `${theme.colors.header}${isRecordedPlaying ? '26' : '33'}`
                    : `${theme.colors.header}${isRecordedPlaying ? '40' : '55'}`,
                  borderColor: theme.colors.header,
                  shadowColor: theme.colors.header,
                  shadowOpacity: theme.mode === 'dark' ? 0.35 : 0.45,
                  shadowOffset: { width: 0, height: 8 },
                  shadowRadius: 16,
                  opacity: isVideoLoading ? 0.6 : 1,
                },
              ]}
              activeOpacity={0.7}
              onPress={async () => {
                try {
                  if (isRecordedPlaying) {
                    await recordedVideoPlayer.pause();
                    setIsRecordedPlaying(false);
                  } else {
                    setIsVideoLoading(false);
                    await recordedVideoPlayer.play();
                    setIsRecordedPlaying(true);
                  }
                } catch (playErr) {
                  console.warn('Failed to toggle preview playback:', playErr);
                }
              }}
            >
              {isVideoLoading ? (
                <ActivityIndicator size="small" color={theme.mode === 'dark' ? theme.colors.text : '#FFFFFF'} />
              ) : (
                <Ionicons
                  name={isRecordedPlaying ? 'pause' : 'play'}
                  size={36}
                  color={theme.mode === 'dark' ? theme.colors.text : '#FFFFFF'}
                />
              )}
            </TouchableOpacity>
          </View>
        ) : (
          // Show camera
          <CameraCapture 
            isActive={isRecording}
            onRecordingStart={handleRecordingStart}
            onRecordingComplete={handleRecordingComplete}
            facing={cameraFacing}
            onFacingChange={setCameraFacing}
          />
        )}
        
        {/* Processing Overlay */}
        {isProcessing && (
          <View style={[styles.processingOverlay, { backgroundColor: theme.colors.overlay }]}>
            <ActivityIndicator size="large" color={theme.colors.textInverse} />
            <Text style={[styles.processingText, { color: theme.colors.textInverse }]}>{t.signToSpeech.processing}</Text>
          </View>
        )}

        {/* Results Display - Overlay on Camera */}
        {recognizedText && !isProcessing && (
          <View style={styles.resultsOverlay}>
            <View style={[styles.resultCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={[styles.resultText, { color: theme.colors.text }]}>{recognizedText}</Text>
              {confidence > 0 && (
                <View style={styles.confidenceContainer}>
                  <View style={[styles.confidenceBarContainer, { backgroundColor: theme.colors.border }]}>
                    <View
                      style={[
                        styles.confidenceBar,
                        { width: `${confidence * 100}%`, backgroundColor: theme.colors.success },
                      ]}
                    />
                  </View>
                  <Text style={[styles.confidenceLabel, { color: theme.colors.textSecondary }]}>
                    {(confidence * 100).toFixed(0)}% confidence
                  </Text>
                </View>
              )}
              {/* Play Audio Button at bottom right */}
              <View style={styles.playButtonContainer}>
                <TouchableOpacity
                  style={[styles.playButtonRight, { backgroundColor: theme.colors.primary }, isPlayingAudio && styles.playButtonSmallPlaying]}
                  onPress={handlePlayAudio}
                  disabled={isProcessing || isPlayingAudio}>
                  {isPlayingAudio ? (
                    <ActivityIndicator size="small" color={theme.colors.textInverse} />
                  ) : (
                    <Ionicons name="volume-high" size={18} color={theme.colors.textInverse} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Divider before action bar - divides screen content from actions */}
        <View
          style={[
            styles.bottomDivider,
            {
              backgroundColor: theme.mode === 'dark'
                ? theme.colors.background
                : 'rgba(0, 0, 0, 0.35)',
              bottom: actionTopPadding + actionButtonHeight + actionBottomPadding,
            },
          ]}
        />

        {/* Bottom Dark Control Bar - Camera App Style */}
        <View
          style={[
            styles.bottomControlBar,
            {
              backgroundColor: theme.mode === 'dark' ? theme.colors.surface : 'rgba(255, 255, 255, 0.9)',
              paddingTop: actionTopPadding,
              paddingBottom: actionBottomPadding,
            },
          ]}
        >
          {recordedVideoUri ? (
            // Show Send/Cancel buttons (WhatsApp style) when video is recorded
            <>
              {/* Left - Cancel/Delete Button */}
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: theme.colors.overlayLight, borderColor: theme.colors.border }]}
                onPress={handleCancelRecording}
                disabled={isProcessing}
                activeOpacity={0.7}>
                <Ionicons name="close" size={28} color={theme.colors.text} />
              </TouchableOpacity>

              {/* Right - Send Button */}
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  {
                    backgroundColor: theme.colors.header,
                    borderColor: theme.colors.header,
                  },
                  isProcessing && styles.sendButtonDisabled,
                ]}
                onPress={handleSendVideo}
                disabled={isProcessing}
                activeOpacity={0.8}>
                <Ionicons name="send" size={24} color={theme.colors.textInverse} />
              </TouchableOpacity>
            </>
          ) : (
            // Show normal camera controls
            <>
              {/* Left - Upload Icon Button */}
              <TouchableOpacity
                style={styles.iconButton}
                onPress={handleUploadVideo}
                disabled={uploading || isProcessing || isRecording}
                activeOpacity={0.7}>
                <Ionicons
                  name="folder-open-outline"
                  size={28}
                  color={uploading || isProcessing || isRecording ? theme.colors.textTertiary : theme.colors.text}
                />
              </TouchableOpacity>

              {/* Center - Record/Shutter Button */}
              <View style={styles.shutterButtonContainer}>
                <TouchableOpacity
                  style={[
                    styles.shutterButton,
                  { 
                    borderColor: theme.colors.text,
                    shadowColor: theme.mode === 'dark' ? '#000' : 'transparent',
                    shadowOpacity: theme.mode === 'dark' ? 0.3 : 0,
                    elevation: theme.mode === 'dark' ? 5 : 0,
                  },
                  isRecording && [styles.shutterButtonRecording, { backgroundColor: theme.colors.error, borderColor: theme.colors.text }],
                  ]}
                  onPress={isRecording ? handleStopCamera : handleStartRecording}
                  disabled={isProcessing || uploading}
                  activeOpacity={0.8}>
                  {isRecording ? (
                  <View style={[styles.shutterButtonStop, { backgroundColor: theme.colors.text }]} />
                  ) : (
                  <View style={[styles.shutterButtonInner, { backgroundColor: theme.colors.text }]} />
                  )}
                </TouchableOpacity>
              </View>

              {/* Right - Camera Facing Toggle Icon */}
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => setCameraFacing(cameraFacing === 'front' ? 'back' : 'front')}
                disabled={isRecording || isProcessing}
                activeOpacity={0.7}>
                <Ionicons
                  name={cameraFacing === 'front' ? 'camera-outline' : 'camera-reverse-outline'}
                  size={28}
                  color={isRecording || isProcessing ? theme.colors.textTertiary : theme.colors.text}
                />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  topLanguageBar: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.lg,
    zIndex: 10,
  },
  fullWidthLanguageButton: {
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fullWidthLanguageText: {
    color: '#FFF',
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
  },
  languageModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  languageModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  languageModalContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: SPACING.lg,
    paddingBottom: 50,
  },
  languageModalTitle: {
    fontSize: FONT_SIZES.large,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  languageModalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 12,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  languageModalItemSelected: {
    backgroundColor: COLORS.primary + '20',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  languageModalItemText: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.text,
    fontWeight: '500',
  },
  languageModalItemTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  processingText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.medium,
    marginTop: SPACING.md,
    fontWeight: '600',
  },
  videoPreviewContainer: {
    flex: 1,
    position: 'relative',
  },
  videoPreview: {
    ...StyleSheet.absoluteFillObject,
  },
  videoPreviewImage: {
    ...StyleSheet.absoluteFillObject,
  },
  playPauseOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -36 }, { translateY: -36 }],
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  videoLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  videoLoadingText: {
    color: '#FFF',
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.medium,
  },
  removeVideoButton: {
    position: 'absolute',
    top: 50,
    right: SPACING.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  removeVideoText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  resultsOverlay: {
    position: 'absolute',
    top: 120,
    left: SPACING.lg,
    right: SPACING.lg,
    zIndex: 15,
  },
  resultCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resultText: {
    fontSize: FONT_SIZES.large,
    color: COLORS.text,
    lineHeight: 24,
    marginBottom: SPACING.sm,
  },
  playButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: SPACING.sm,
  },
  confidenceContainer: {
    marginTop: SPACING.xs,
  },
  confidenceBarContainer: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  confidenceBar: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: 3,
  },
  confidenceLabel: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
  },
  bottomDivider: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    zIndex: 19,
  },
  bottomControlBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    // backgroundColor set dynamically in JSX
    paddingBottom: 24,
    paddingHorizontal: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  iconButton: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
  },
  shutterButtonContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'transparent',
    borderWidth: 4,
    // borderColor set dynamically
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  shutterButtonRecording: {
    backgroundColor: COLORS.error,
    // borderColor set dynamically
  },
  shutterButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF',
  },
  shutterButtonStop: {
    width: 32,
    height: 32,
    backgroundColor: '#FFF',
    borderRadius: 4,
  },
  processVideoButtonBottom: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  processVideoButtonTextBottom: {
    color: '#FFF',
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
  },
  playButtonSmall: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 20,
    marginTop: SPACING.sm,
    alignSelf: 'flex-start',
    minWidth: 140,
    alignItems: 'center',
  },
  playButtonRight: {
    backgroundColor: COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonSmallPlaying: {
    backgroundColor: COLORS.primary + 'CC',
  },
  playButtonLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonText: {
    color: '#FFF',
    fontSize: FONT_SIZES.small,
    fontWeight: '600',
  },
  // WhatsApp-style Send/Cancel buttons
  cancelButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  sendButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
});

export default SignToSpeechScreen;


import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { SpeechToSignScreenProps } from '@navigation/types';
import { COLORS, FONT_SIZES, SPACING } from '@utils/constants';
import { getTranslation } from '@utils/translations';
import { Language } from '../types';
// Removed mock data imports - using real backend only
import apiService from '@services/api';
import { useAudioRecorder } from '@components/AudioRecorder';
// Use full avatar renderer with proper 3D animation support
import AvatarRenderer from '@components/AvatarRenderer';
import QuickAvatar from '@components/QuickAvatar';
import { useSettings } from '@contexts/SettingsContext';
import { useTheme } from '@theme/index';
import config from '@config/environment';
import { getAvatarConfig, AvatarSource } from '@config/avatarConfig';

// Filter to only English and German for input language
const INPUT_LANGUAGES: Record<'en' | 'de', string> = {
  en: 'English',
  de: 'Deutsch',
};

const SpeechToSignScreen: React.FC<SpeechToSignScreenProps> = () => {
  const { settings } = useSettings();
  const { theme, themeMode } = useTheme();
  const selectedInputLanguage = (settings.preferredLanguage === 'en' || settings.preferredLanguage === 'de') 
    ? settings.preferredLanguage 
    : 'en';

  // Simple theme logging (no forced re-renders needed - React Context handles it)
  React.useEffect(() => {
    console.log('SpeechToSignScreen theme:', { 
      themeMode,
      backgroundColor: theme.colors.background,
      textColor: theme.colors.text
    });
  }, [themeMode, theme.colors.background]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  const [showAvatar, setShowAvatar] = useState(false);
  const [avatarAnimationData, setAvatarAnimationData] = useState<any>(null);
  
  // Get avatar configuration from avatarConfig.ts
  // This allows easy switching between ReadyPlayer.me, local GLB files, or procedural avatar
  const avatarConfig = React.useMemo(() => getAvatarConfig(), []);
  
  const [avatarModelPath] = useState<string | undefined>(avatarConfig.modelPath);
  const [avatarId] = useState<string | undefined>(avatarConfig.avatarId);
  const [avatarQueryParams] = useState(avatarConfig.avatarQueryParams);
  const [avatarSource] = useState<AvatarSource>(avatarConfig.source);
  const [quickAvatarImage] = useState(avatarConfig.quickImage);

  const t = getTranslation(settings.preferredLanguage);

  const actionTopPadding = SPACING.md;
  const actionBottomPadding = SPACING.md;
  const actionButtonHeight = 72;

  const processAudioFile = useCallback(async (audioDataUri: string) => {
    setIsProcessing(true);

    try {
      // Extract base64 from data URI (remove "data:audio/...;base64," prefix)
      let base64Audio = audioDataUri;
      let fileExtension = '.m4a';
      if (audioDataUri.includes(';base64,')) {
        const parts = audioDataUri.split(';base64,');
        base64Audio = parts[1];
        // Try to extract extension from mime type
        const mimePart = parts[0];
        if (mimePart.includes('/')) {
          const mimeType = mimePart.split('/')[1];
          if (mimeType === 'm4a' || mimeType === 'x-m4a') fileExtension = '.m4a';
          else if (mimeType === 'mp3') fileExtension = '.mp3';
          else if (mimeType === 'wav') fileExtension = '.wav';
          else if (mimeType === 'aac') fileExtension = '.aac';
          else if (mimeType === 'ogg') fileExtension = '.ogg';
        }
      } else if (audioDataUri.startsWith('data:')) {
        // Handle case where it might be just "data:base64,..."
        base64Audio = audioDataUri.split(',')[1] || audioDataUri;
      }

      console.log('Processing audio with backend...', {
        audioLength: base64Audio.length,
        fileExtension,
        language: selectedInputLanguage,
      });

      // Upload audio to backend first (optional, for storage)
      try {
        const uploadResult = await apiService.uploadAudio(base64Audio, fileExtension);
        console.log('✓ Audio uploaded successfully:', uploadResult);
      } catch (uploadError: any) {
        console.warn('Audio upload failed (non-critical), continuing with processing:', uploadError.message);
        // Continue even if upload fails - it's optional
      }

      // Step 1: Speech-to-text using real backend
      console.log('Step 1: Converting speech to text...');
      const sttResult = await apiService.speechToText({
        audio_data: base64Audio,
        language: selectedInputLanguage as Language,
      });
      
      if (!sttResult || !sttResult.text) {
        throw new Error('No text returned from speech-to-text service');
      }
      
      console.log('✓ Speech-to-text result:', sttResult.text);
      setSpokenText(sttResult.text);

      // Step 2: Text-to-sign (avatar animation) using real backend
      if (sttResult.text.trim()) {
        console.log('Step 2: Converting text to sign language animation...');
        const animationResult = await apiService.textToSign({
          text: sttResult.text,
          sourceLanguage: selectedInputLanguage as Language,
          signLanguage: 'DGS',
        });
        
        console.log('✓ Animation generated:', {
          hasAnimationData: !!animationResult.animationData,
          hasVideoUrl: !!animationResult.videoUrl,
        });
        
        // Set animation data for 3D avatar
        if (animationResult.animationData) {
          console.log('Animation data structure:', {
            duration: animationResult.animationData.duration,
            format: animationResult.animationData.format,
            keyframesCount: animationResult.animationData.keyframes?.length || 0,
            firstKeyframe: animationResult.animationData.keyframes?.[0],
          });
          setAvatarAnimationData(animationResult.animationData);
          setShowAvatar(true);
          console.log('✓ Avatar animation ready');
        } else if (animationResult.videoUrl) {
          // If video URL is provided instead of animation data
          setAvatarAnimationData({ videoUrl: animationResult.videoUrl });
          setShowAvatar(true);
          console.log('✓ Avatar video ready');
        } else {
          // Show avatar even without animation (idle state)
          setShowAvatar(true);
          console.warn('No animation data returned, showing idle avatar');
        }
      } else {
        Alert.alert(t.common.error || 'Error', 'No speech detected. Please try again.');
      }
    } catch (error: any) {
      console.error('Error processing audio:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
      });
      
      let errorMessage = 'Failed to process audio. Please try again.';
      if (error.code === 'NETWORK_ERROR' || error.isNetworkError) {
        const apiUrl = config.apiBaseUrl;
        errorMessage = `Network error. Please check:\n1. Backend is running (python run.py)\n2. Same Wi-Fi network\n3. API URL includes port :8000\n4. Current API URL: ${apiUrl}\n5. Expected format: http://YOUR_IP:8000/api/v1`;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert(
        t.common.error || 'Error',
        errorMessage
      );
    } finally {
      setIsProcessing(false);
    }
  }, [selectedInputLanguage, t]);

  const handleRecordingComplete = useCallback(async (audioData: string) => {
    await processAudioFile(audioData);
  }, [processAudioFile]);

  // Use AudioRecorder hook
  const { isRecording, startRecording, stopRecording } = useAudioRecorder(handleRecordingComplete);

  const handleStartRecording = async () => {
    setSpokenText('');
    setShowAvatar(false);
    await startRecording();
  };

  const handleStopRecording = async () => {
    await stopRecording();
  };

  const handleUploadAudio = useCallback(async () => {
    try {
      setUploading(true);
      
      // Pick audio file
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        setUploading(false);
        return;
      }

      const audioAsset = result.assets[0];
      const audioUri = audioAsset.uri;

      // Clear previous results
      setSpokenText('');
      setShowAvatar(false);
      setAvatarAnimationData(null);

      // Read audio file as base64
      try {
        // Use FileSystem.EncodingType if available, otherwise use string literal
        let base64Audio: string;
        try {
          // Try to use the enum if available
          const EncodingType = (FileSystem as any).EncodingType;
          if (EncodingType && EncodingType.Base64) {
            base64Audio = await FileSystem.readAsStringAsync(audioUri, {
              encoding: EncodingType.Base64,
            });
          } else {
            // Fallback to string literal
            base64Audio = await FileSystem.readAsStringAsync(audioUri, {
              encoding: 'base64' as any,
            });
          }
        } catch (encodingError: any) {
          // If that fails, try direct string
          base64Audio = await FileSystem.readAsStringAsync(audioUri, {
            encoding: 'base64' as any,
          });
        }

        // Format as data URI for internal use (we'll extract base64 when sending to API)
        const audioDataUri = `data:audio/${audioAsset.mimeType?.split('/')[1] || 'm4a'};base64,${base64Audio}`;
        
        // Process the audio file
        await processAudioFile(audioDataUri);
      } catch (readError) {
        console.error('Error reading audio file:', readError);
        Alert.alert('Error', 'Failed to read audio file');
      } finally {
        setUploading(false);
      }
    } catch (error) {
      console.error('Error uploading audio:', error);
      Alert.alert('Error', 'Failed to upload audio');
      setUploading(false);
    }
  }, [processAudioFile]);

  // Force re-render when theme changes - use themeMode directly to ensure updates
  const containerStyle = React.useMemo(() => {
    console.log('SpeechToSignScreen: Creating container style', { themeMode, backgroundColor: theme.colors.background });
    return { 
      backgroundColor: theme.colors.background,
      flex: 1 
    };
  }, [themeMode, theme.colors.background]);

  console.log('SpeechToSignScreen RENDER:', { themeMode, backgroundColor: theme.colors.background });

  const renderAvatarScene = () => {
    if (avatarSource === 'image' && quickAvatarImage) {
      return <QuickAvatar imageSource={quickAvatarImage} />;
    }

    return (
      <AvatarRenderer 
        animationData={avatarAnimationData || undefined}
        isLoading={false}
        modelPath={avatarModelPath}
        avatarId={avatarId}
        avatarQueryParams={avatarQueryParams}
      />
    );
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Full Screen Avatar View */}
      <View style={[styles.avatarContainer, containerStyle]}>
        {isProcessing ? (
          <View style={[styles.avatarLoading, { backgroundColor: theme.colors.background }]}>
            <ActivityIndicator size="large" color={theme.colors.textInverse} />
            <Text style={[styles.loadingText, { color: theme.colors.textInverse }]}>{t.speechToSign.avatarLoading || 'Processing...'}</Text>
          </View>
        ) : (
          <View style={[styles.avatarActive, { backgroundColor: theme.colors.background }]}>
            {/* Rounded Frame Container for Avatar */}
            <View style={styles.avatarFrame}>
              {renderAvatarScene()}
            </View>
          </View>
        )}

        {/* Avatar Ready Text - Above Bottom Bar */}
        {!showAvatar && !isProcessing && (
          <View style={styles.avatarReadyTextContainer}>
            <Text style={[styles.inactiveText, { color: theme.mode === 'dark' ? theme.colors.textInverse : theme.colors.text }]}>Avatar Ready - Say something!</Text>
          </View>
        )}

        {/* Processing Overlay */}
        {isProcessing && (
          <View style={[styles.processingOverlay, { backgroundColor: theme.colors.overlay }]}>
            <ActivityIndicator size="large" color={theme.colors.textInverse} />
            <Text style={[styles.processingText, { color: theme.colors.textInverse }]}>{t.speechToSign.processing || 'Processing...'}</Text>
          </View>
        )}

        {/* Results Display - Chat Bubble at Bottom */}
        {spokenText && !isProcessing && (
          <View style={styles.resultsOverlay}>
            <View style={styles.resultCard}>
              <Text style={styles.resultText}>{spokenText}</Text>
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
          {/* Left - Upload Audio Icon Button */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleUploadAudio}
            disabled={uploading || isProcessing || isRecording}
            activeOpacity={0.7}>
            <Ionicons
              name="folder-open-outline"
              size={28}
              color={uploading || isProcessing || isRecording ? theme.colors.textTertiary : theme.colors.text}
            />
          </TouchableOpacity>

          {/* Center - Record/Mic Button */}
          <View style={styles.shutterButtonContainer}>
              <TouchableOpacity
                style={[
                  styles.shutterButton,
                  { 
                    borderColor: theme.colors.text,
                    backgroundColor: 'transparent', // Always transparent when inactive
                    // Shadow only in dark mode, and ensure it doesn't appear inside border
                    ...(theme.mode === 'dark' ? {
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      //shadowOpacity: 0.3,
                      //shadowRadius: 4,
                     // elevation: 5,
                    } : {
                      shadowColor: 'transparent',
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0,
                      shadowRadius: 0,
                      elevation: 0,
                    }),
                  },
                  // Only apply background color when recording
                  isRecording && { backgroundColor: theme.colors.error },
                ]}
                onPress={isRecording ? handleStopRecording : handleStartRecording}
                disabled={isProcessing || uploading}
                activeOpacity={0.8}>
                {isRecording ? (
                  <View style={[styles.shutterButtonStop, { backgroundColor: theme.colors.text }]} />
                ) : (
                  <View style={styles.micIconContainer}>
                    <Ionicons 
                      name="mic" 
                      size={36} 
                      color={theme.colors.text}
                      style={styles.micIcon}
                    />
                  </View>
                )}
              </TouchableOpacity>
          </View>

          {/* Right - Placeholder for symmetry */}
          <View style={styles.iconButton} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  avatarContainer: {
    flex: 1,
    position: 'relative',
  },
  avatarActive: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFrame: {
    width: '90%',
    maxWidth: 400,
    aspectRatio: 0.75, // Portrait orientation
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarInactive: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inactiveText: {
    fontSize: FONT_SIZES.large,
    color: '#FFF',
    textAlign: 'center',
  },
  avatarReadyTextContainer: {
    position: 'absolute',
    bottom: 160,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
  },
  loadingText: {
    fontSize: FONT_SIZES.medium,
    color: '#FFFFFF',
    marginTop: SPACING.md,
    fontWeight: '600',
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
  resultsOverlay: {
    position: 'absolute',
    bottom: 100, // Position at bottom, above control bar
    left: SPACING.lg,
    right: SPACING.lg,
    zIndex: 15,
    alignItems: 'center',
  },
  resultCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // Dark semi-transparent background
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 20,
    maxWidth: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  resultText: {
    fontSize: FONT_SIZES.large,
    color: '#FFFFFF', // White text
    lineHeight: 24,
    textAlign: 'center',
    fontWeight: '500',
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
    // Shadow completely removed from StyleSheet - set dynamically in JSX
    // This prevents shadow from appearing inside border in light mode
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
  micIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    
  },
  micIcon: {
    // Remove any text shadow or icon shadow
    textShadowColor: 'transparent',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 0,
  },
});

export default SpeechToSignScreen;

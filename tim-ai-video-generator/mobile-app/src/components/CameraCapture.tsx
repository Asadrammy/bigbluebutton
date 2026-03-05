import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Alert, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Audio } from 'expo-av';
import { useTheme } from '@theme/index';

interface CameraCaptureProps {
  onFrameCapture?: (frame: string) => void; // Deprecated - kept for backward compatibility
  isActive: boolean;
  onRecordingStart?: () => void;
  onRecordingStop?: (videoUri: string) => void; // Updated to return video URI
  onRecordingComplete?: (videoUri: string) => void; // New: called when video is ready
  facing?: 'front' | 'back';
  onFacingChange?: (facing: 'front' | 'back') => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({
  onFrameCapture,
  isActive,
  onRecordingStart,
  onRecordingStop,
  onRecordingComplete,
  facing = 'front',
  onFacingChange,
}) => {
  const { theme } = useTheme();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isRecording, setIsRecording] = useState(false);
  const recordingPromiseRef = useRef<Promise<string> | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>(facing);
  const [audioPermission, setAudioPermission] = useState(false);

  // Update camera facing when prop changes
  useEffect(() => {
    if (facing !== cameraFacing) {
      setCameraFacing(facing);
    }
  }, [facing]);

  useEffect(() => {
    if (isActive && permission?.granted && !isRecording) {
      startVideoRecording();
    } else if (!isActive && isRecording) {
      stopVideoRecording();
    }

    return () => {
      if (isRecording && recordingPromiseRef.current) {
        // Stop recording on cleanup
        stopVideoRecording();
      }
    };
  }, [isActive, permission?.granted]);

  const startVideoRecording = async () => {
    if (!cameraRef.current || isRecording) return;

    try {
      setIsRecording(true);
      onRecordingStart?.();

      // Start recording video - recordAsync returns a promise that resolves when recording stops
      // We store this promise so we can await it when stopping
      // Note: mute: true to avoid RECORD_AUDIO permission requirement
      // Sign language recognition doesn't require audio
      const recordingPromise = cameraRef.current.recordAsync({
        quality: '720p', // Good quality for sign language recognition
        maxDuration: 60, // Max 60 seconds
        mute: true, // Mute audio to avoid RECORD_AUDIO permission (not needed for sign language)
        videoBitrate: 5000000, // 5 Mbps for good quality
        codec: 'h264', // MP4 compatible codec (Android/iOS)
      });

      recordingPromiseRef.current = recordingPromise;
      console.log('Video recording started');
    } catch (error) {
      console.error('Error starting video recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
      setIsRecording(false);
      recordingPromiseRef.current = null;
    }
  };

  const stopVideoRecording = async () => {
    if (!recordingPromiseRef.current || !cameraRef.current) {
      setIsRecording(false);
      return;
    }

    try {
      // Stop the recording - this will cause the promise to resolve with the video URI
      cameraRef.current.stopRecording();
      
      // Wait for the recording promise to resolve with the video URI
      const videoResult = await recordingPromiseRef.current as any;
      const uriString = typeof videoResult === 'string' ? videoResult : (videoResult?.uri || '');
      
      setIsRecording(false);
      recordingPromiseRef.current = null;

      // Notify parent with video URI
      if (uriString) {
        console.log('Video recording completed:', { uri: uriString });
        onRecordingStop?.(uriString);
        onRecordingComplete?.(uriString);
      }
    } catch (error) {
      console.error('Error stopping video recording:', error);
      Alert.alert('Error', 'Failed to stop recording');
      setIsRecording(false);
      recordingPromiseRef.current = null;
    }
  };

  const toggleCameraFacing = () => {
    const newFacing = cameraFacing === 'front' ? 'back' : 'front';
    setCameraFacing(newFacing);
    onFacingChange?.(newFacing);
  };

  useEffect(() => {
    // Request camera permission
    if (permission === null) {
      // Permission status is being checked
      requestPermission();
    } else if (!permission.granted) {
      // Permission denied
      Alert.alert(
        'Camera Permission Required',
        'Please grant camera permission to record sign language',
        [{ text: 'OK' }]
      );
    }
    
    // Request audio permission (but we'll mute video, so this is optional)
    // However, Android still requires the permission even if muted
    Audio.getPermissionsAsync().then(({ status }) => {
      if (status !== 'granted') {
        Audio.requestPermissionsAsync().then(({ status: newStatus }) => {
          setAudioPermission(newStatus === 'granted');
        });
      } else {
        setAudioPermission(true);
      }
    }).catch(() => {
      // If audio permission fails, we'll record muted video
      setAudioPermission(false);
    });
  }, [permission]);

  if (permission === null) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.permissionText, { color: theme.colors.text }]}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.permissionText, { color: theme.colors.text }]}>Camera permission is required</Text>
        <Text style={[styles.permissionSubtext, { color: theme.colors.textSecondary }]}>
          Please enable camera access in your device settings
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={cameraFacing}
        mode="video"
        videoQuality="720p"
        onCameraReady={() => {
          console.log('Camera is ready');
        }}
      />
      
      {/* Camera toggle is now handled by parent screen */}

      {isRecording && (
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>Recording video...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  permissionSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
  },
  recordingIndicator: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFF',
    marginRight: 8,
  },
  recordingText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  flipButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  flipButtonSmall: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  flipButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flipIcon: {
    fontSize: 20,
    marginRight: 6,
  },
  flipText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default CameraCapture;

import React, { useState, useRef } from 'react';
import { Alert } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';

interface AudioRecorderProps {
  onRecordingComplete?: (audioData: string) => void;
}

interface AudioRecorderReturn {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
}

export const useAudioRecorder = (onRecordingComplete?: (audioData: string) => void): AudioRecorderReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordingUriRef = useRef<string | null>(null);

  const requestMicrophonePermission = async (): Promise<boolean> => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting microphone permission:', error);
      return false;
    }
  };

  const startRecording = async (): Promise<void> => {
    try {
      // Check if already recording
      if (isRecording || recordingRef.current) {
        console.warn('Recording already in progress');
        return;
      }

      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Microphone permission is required to record audio');
        return;
      }

      // Configure audio mode for recording with error handling
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });
      } catch (audioModeError: any) {
        console.warn('Audio mode configuration warning:', audioModeError.message);
        // Continue anyway - some platforms may not support all options
      }

      // Create a new recording with better error handling
      let recording: Audio.Recording;
      try {
        const result = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY,
          undefined, // onRecordingStatusUpdate callback
          0 // progressUpdateIntervalMillis
        );
        recording = result.recording;
      } catch (createError: any) {
        console.error('Failed to create recording:', createError);
        throw new Error(`Failed to create recording: ${createError.message || 'Unknown error'}`);
      }

      recordingRef.current = recording;
      setIsRecording(true);
      console.log('Recording started successfully');
    } catch (error: any) {
      console.error('Failed to start recording:', error);
      setIsRecording(false);
      recordingRef.current = null;
      
      // Provide user-friendly error message
      const errorMessage = error.message || 'Failed to start recording. Please try again.';
      Alert.alert('Error', errorMessage);
    }
  };

  const stopRecording = async (): Promise<void> => {
    try {
      if (!recordingRef.current) {
        console.warn('No recording to stop');
        setIsRecording(false);
        return;
      }

      // Stop the recording with error handling
      let uri: string | null = null;
      try {
        await recordingRef.current.stopAndUnloadAsync();
        uri = recordingRef.current.getURI();
      } catch (stopError: any) {
        console.error('Error stopping recording:', stopError);
        // Try to get URI anyway
        try {
          uri = recordingRef.current.getURI();
        } catch (uriError) {
          console.error('Could not get recording URI:', uriError);
        }
      }
      
      if (!uri) {
        throw new Error('Recording URI not available');
      }

      recordingUriRef.current = uri;
      setIsRecording(false);

      // Reset audio mode with error handling
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: false,
        });
      } catch (audioModeError: any) {
        console.warn('Audio mode reset warning:', audioModeError.message);
        // Continue anyway - not critical
      }

      // Convert audio file to base64
      try {
        // Use FileSystem.EncodingType if available, otherwise use string literal
        let base64Audio: string;
        try {
          // First try: Direct string literal (most reliable)
          base64Audio = await FileSystem.readAsStringAsync(uri, {
            encoding: 'base64' as any,
          });
        } catch (firstError: any) {
          // Second try: Check if EncodingType exists and use it
          const FileSystemModule = FileSystem as any;
          if (FileSystemModule.EncodingType && FileSystemModule.EncodingType.Base64) {
            base64Audio = await FileSystem.readAsStringAsync(uri, {
              encoding: FileSystemModule.EncodingType.Base64,
            });
          } else {
            // Third try: Use the string directly without type casting
            base64Audio = await FileSystem.readAsStringAsync(uri, {
              encoding: 'base64',
            } as any);
          }
        }

        // Format as data URI for internal use (we'll extract base64 when sending to API)
        const audioDataUri = `data:audio/m4a;base64,${base64Audio}`;
        
        if (onRecordingComplete) {
          onRecordingComplete(audioDataUri);
        }

        // Clean up: delete the temporary recording file
        try {
          await FileSystem.deleteAsync(uri, { idempotent: true });
        } catch (deleteError) {
          console.warn('Failed to delete temporary recording file:', deleteError);
        }
      } catch (conversionError) {
        console.error('Failed to convert audio to base64:', conversionError);
        Alert.alert('Error', 'Failed to process recording');
      }

      // Clean up recording reference
      recordingRef.current = null;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to stop recording');
      setIsRecording(false);
      
      // Try to clean up
      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch (cleanupError) {
          console.error('Cleanup error:', cleanupError);
        }
        recordingRef.current = null;
      }
    }
  };

  return {
    isRecording,
    startRecording,
    stopRecording,
  };
};

// Default export for backward compatibility
export default useAudioRecorder;

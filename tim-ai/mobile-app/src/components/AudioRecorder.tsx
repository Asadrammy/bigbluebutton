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
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Microphone permission is required to record audio');
        return;
      }

      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Create a new recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        undefined, // onRecordingStatusUpdate callback
        0 // progressUpdateIntervalMillis
      );

      recordingRef.current = recording;
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async (): Promise<void> => {
    try {
      if (!recordingRef.current) {
        return;
      }

      // Stop the recording
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      
      if (!uri) {
        throw new Error('Recording URI not available');
      }

      recordingUriRef.current = uri;
      setIsRecording(false);

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
      });

      // Convert audio file to base64
      try {
        // Use string literal 'base64' - works even if EncodingType enum is not available
        const base64Audio = await FileSystem.readAsStringAsync(uri, {
          encoding: 'base64' as any,
        });

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

import { useState, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import { CameraView, CameraType } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';

interface UseCameraRecorderReturn {
  isRecording: boolean;
  capturedFrames: string[];
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  clearFrames: () => void;
  captureFrame: (cameraRef: React.RefObject<CameraView>) => Promise<string | null>;
}

/**
 * Hook for managing camera recording and frame capture
 * Captures frames at regular intervals during recording
 */
export const useCameraRecorder = (
  onFramesCaptured?: (frames: string[]) => void,
  frameCaptureInterval: number = 150 // Capture frame every 150ms (approx 6-7 fps)
): UseCameraRecorderReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [capturedFrames, setCapturedFrames] = useState<string[]>([]);
  const captureIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cameraRefRef = useRef<React.RefObject<CameraView> | null>(null);

  const requestCameraPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { Camera } = await import('expo-camera');
      const { status } = await Camera.requestCameraPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      return false;
    }
  }, []);

  const captureFrame = useCallback(async (
    cameraRef: React.RefObject<CameraView>
  ): Promise<string | null> => {
    try {
      if (!cameraRef.current) {
        return null;
      }

      // Take a picture
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8, // Good quality but not maximum for performance
        base64: true, // Get base64 encoded image
        skipProcessing: false,
      });

      if (photo?.base64) {
        // Return base64 string (without data URL prefix for consistency with backend)
        return photo.base64;
      }

      return null;
    } catch (error) {
      console.error('Error capturing frame:', error);
      return null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Camera permission is required to record sign language');
        return;
      }

      setIsRecording(true);
      setCapturedFrames([]); // Clear previous frames

      // The actual frame capturing will be handled by the component
      // using the captureFrame function at intervals
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start camera recording');
      setIsRecording(false);
    }
  }, [requestCameraPermission]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);

    // Clear any ongoing capture interval
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }

    // Callback with captured frames
    if (capturedFrames.length > 0 && onFramesCaptured) {
      onFramesCaptured(capturedFrames);
    }
  }, [capturedFrames, onFramesCaptured]);

  const clearFrames = useCallback(() => {
    setCapturedFrames([]);
  }, []);

  // Function to start frame capture interval (called by component)
  const startFrameCapture = useCallback((
    cameraRef: React.RefObject<CameraView>,
    interval: number = frameCaptureInterval
  ) => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
    }

    cameraRefRef.current = cameraRef;

    captureIntervalRef.current = setInterval(async () => {
      if (cameraRef.current) {
        const frame = await captureFrame(cameraRef);
        if (frame) {
          setCapturedFrames(prev => {
            const newFrames = [...prev, frame];
            // Limit to reasonable number of frames (e.g., max 30 seconds = ~200 frames at 6-7 fps)
            if (newFrames.length > 200) {
              return newFrames.slice(-200); // Keep last 200 frames
            }
            return newFrames;
          });
        }
      }
    }, interval);
  }, [captureFrame, frameCaptureInterval]);

  // Expose startFrameCapture through a ref pattern
  // The component will call this
  return {
    isRecording,
    capturedFrames,
    startRecording,
    stopRecording,
    clearFrames,
    captureFrame,
    // Internal method exposed for component use
    startFrameCapture: startFrameCapture as any,
  };
};


/**
 * Video Processing Utilities
 * Handles frame extraction from video files
 */
import * as FileSystem from 'expo-file-system/legacy';

export interface VideoFrame {
  uri: string;
  base64: string;
  timestamp: number;
}

/**
 * Extract frames from video file as base64 images
 * 
 * Note: This is a simplified implementation. For production:
 * - Backend should handle frame extraction from uploaded video
 * - Or use react-native-ffmpeg for proper client-side extraction
 * 
 * Current approach: Convert video file to base64 and let backend extract frames
 */
export async function extractFramesFromVideo(
  videoUri: string,
  targetFps: number = 6,
  maxFrames: number = 50
): Promise<string[]> {
  try {
    // For now, we'll read the video file as base64
    // Backend will extract frames from it, or we'll upload the video file
    // In a production app, you'd use FFmpeg or similar to extract frames here
    
    // Read video file as base64 - backend can process this
    // Use string literal 'base64' directly - works even if EncodingType enum is not available
    const base64Video = await FileSystem.readAsStringAsync(videoUri, {
      encoding: 'base64' as any,
    });

    // Return as single frame (backend will extract actual frames)
    // TODO: Implement proper frame extraction using expo-av or react-native-ffmpeg
    return [base64Video];
  } catch (error: any) {
    console.error('Error reading video file:', error);
    // Provide more detailed error information
    if (error.message) {
      throw new Error(`Failed to process video file: ${error.message}`);
    }
    throw new Error('Failed to process video file. Please ensure the file is valid and try again.');
  }
}

/**
 * Validate video file
 */
export function validateVideoFile(uri: string): boolean {
  const validExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
  const extension = uri.toLowerCase().substring(uri.lastIndexOf('.'));
  return validExtensions.includes(extension);
}


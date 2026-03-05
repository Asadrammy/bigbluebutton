/**
 * Example: Using ReadyPlayer.me Avatars
 * 
 * This file demonstrates how to use ReadyPlayer.me avatars in your app.
 * Replace 'your-avatar-id' with your actual ReadyPlayer.me avatar ID.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import AvatarRenderer from '@components/AvatarRenderer';
import { AnimationData } from '../types';

// Example 1: Basic usage with avatarId
export const BasicReadyPlayerMeExample: React.FC = () => {
  return (
    <View style={styles.container}>
      <AvatarRenderer 
        avatarId="65a8dba831b23abb4f401bae"
        animationData={undefined}
      />
    </View>
  );
};

// Example 2: With animation data
export const ReadyPlayerMeWithAnimation: React.FC<{ animationData?: AnimationData }> = ({ animationData }) => {
  return (
    <View style={styles.container}>
      <AvatarRenderer 
        avatarId="65a8dba831b23abb4f401bae"
        animationData={animationData}
      />
    </View>
  );
};

// Example 3: With query parameters for better mobile performance
export const ReadyPlayerMeOptimized: React.FC<{ animationData?: AnimationData }> = ({ animationData }) => {
  return (
    <View style={styles.container}>
      <AvatarRenderer 
        avatarId="65a8dba831b23abb4f401bae"
        avatarQueryParams={{
          lod: 2,              // Level of Detail (0-3, lower = better performance)
          textureAtlas: 'none'  // Disable texture atlas for better performance
        }}
        animationData={animationData}
      />
    </View>
  );
};

// Example 4: Fallback to local model if avatarId fails
export const ReadyPlayerMeWithFallback: React.FC = () => {
  return (
    <View style={styles.container}>
      <AvatarRenderer 
        avatarId="65a8dba831b23abb4f401bae"
        modelPath={(() => {
          // Fallback to local model if ReadyPlayer.me fails
          try {
            return require('../../assets/avatar.glb');
          } catch {
            return undefined;
          }
        })()}
        animationData={undefined}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});

/**
 * ReadyPlayer.me Avatar Integration Examples
 * 
 * API Documentation: https://docs.readyplayer.me/ready-player-me/api-reference/rest-api/avatars/get-3d-avatars
 * 
 * How to get your ReadyPlayer.me Avatar ID:
 * 
 * 1. Visit https://readyplayer.me/
 * 2. Create or select your avatar
 * 3. Your avatar ID is typically in the URL or API response
 * 4. The avatar URL format is: https://models.readyplayer.me/{avatarId}.glb
 * 
 * Example avatar IDs (from ReadyPlayer.me docs):
 * - '65a8dba831b23abb4f401bae' (example from official docs)
 * 
 * Query Parameters:
 * - lod: Level of Detail (0-3). Lower = better performance
 * - textureAtlas: 'none' | '1024' | '2048' | '4096'. 'none' = better performance
 * - textureQuality: 'high' | 'medium' | 'low'
 * - morphTargetQuality: 'high' | 'medium' | 'low'
 * 
 * Recommended for mobile: { lod: 2, textureAtlas: 'none' }
 * 
 * The app will automatically:
 * - Download the avatar from ReadyPlayer.me
 * - Cache it locally for faster loading
 * - Use it with your sign language animations
 */


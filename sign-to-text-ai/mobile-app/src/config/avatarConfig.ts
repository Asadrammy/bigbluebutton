import type { ReadyPlayerMeQueryParams } from '@services/avatarService';
import type { ImageSourcePropType } from 'react-native';

/**
 * Avatar Configuration
 * 
 * This file allows you to easily configure which avatar to use:
 * 1. ReadyPlayer.me avatar (recommended - free realistic avatars)
 * 2. Local GLB file
 * 3. Procedural avatar (fallback)
 */

// ============================================
// OPTION 1: ReadyPlayer.me Avatar (RECOMMENDED)
// ============================================
// To get your own avatar:
// 1. Go to https://readyplayer.me/
// 2. Create or select an avatar
// 3. Copy the avatar ID from the URL (e.g., from https://readyplayer.me/avatar/65a8dba831b23abb4f401bae)
// 4. Replace the AVATAR_ID below with your avatar ID

// ReadyPlayer.me Avatar ID - This is a working example avatar
// The app will automatically download this avatar on first use
// You can replace this with your own avatar ID from https://readyplayer.me/
export const READY_PLAYER_ME_AVATAR_ID = '65a8dba831b23abb4f401bae'; // Realistic human avatar (automatically downloaded)

// ReadyPlayer.me query parameters for performance optimization
export const READY_PLAYER_ME_PARAMS = {
  lod: 1, // Level of Detail (0-3, lower = better performance, less detail)
  textureAtlas: '1024', // Texture atlas size ('none', '1024', '2048', '4096')
  textureQuality: 'medium' as const, // 'high' | 'medium' | 'low'
  morphTargetQuality: 'low' as const, // 'high' | 'medium' | 'low'
};

// ============================================
// OPTION 2: Local GLB File
// ============================================
// If you have a local GLB file, uncomment and set the path below
// The file should be in the mobile-app directory or assets folder

// Example: Using a file from test-avatars folder
// export const LOCAL_GLB_PATH = require('../../test-avatars/high-quality-avatar.glb');

// Example: Using a file from assets folder
// Local realistic avatar has been downloaded to assets/realistic-avatar.glb
// To use it, change AVATAR_SOURCE to 'local' and uncomment the line below:
// export const LOCAL_GLB_PATH = require('../../assets/realistic-avatar.glb'); // Realistic human avatar (3.5MB, downloaded automatically)

// For now, using ReadyPlayer.me which downloads automatically and works the same way
export const LOCAL_GLB_PATH: string | undefined = undefined;

// Quick static real-photo avatar (replace with your own image in assets for custom look)
export const QUICK_AVATAR_IMAGE = require('../../assets/quick-realistic-avatar.png');

// ============================================
// AVATAR CONFIGURATION
// ============================================
// Set which option to use:
// - 'readyplayer' - Use ReadyPlayer.me avatar
// - 'local' - Use local GLB file
// - 'procedural' - Use procedural avatar (fallback, not recommended)

export type AvatarSource = 'readyplayer' | 'local' | 'procedural' | 'image';

// FIXED: Using ReadyPlayer.me with direct URL (no file download needed)
// This avoids file URI conversion issues - useGLTF can load directly from URL
export const AVATAR_SOURCE: AvatarSource = 'readyplayer'; // Using ReadyPlayer.me (direct URL loading)

// ============================================
// HELPER FUNCTIONS
// ============================================

export interface AvatarConfig {
  source: AvatarSource;
  modelPath?: string;
  avatarId?: string;
  avatarQueryParams?: ReadyPlayerMeQueryParams;
  quickImage?: ImageSourcePropType;
}

export function getAvatarConfig(): AvatarConfig {
  if (AVATAR_SOURCE === 'local' && LOCAL_GLB_PATH) {
    return {
      source: AVATAR_SOURCE,
      modelPath: LOCAL_GLB_PATH,
      avatarId: undefined,
      avatarQueryParams: undefined,
    };
  }
  
  if (AVATAR_SOURCE === 'readyplayer' && READY_PLAYER_ME_AVATAR_ID) {
    return {
      source: AVATAR_SOURCE,
      modelPath: undefined,
      avatarId: READY_PLAYER_ME_AVATAR_ID,
      avatarQueryParams: READY_PLAYER_ME_PARAMS,
    };
  }

  if (AVATAR_SOURCE === 'image') {
    return {
      source: AVATAR_SOURCE,
      quickImage: QUICK_AVATAR_IMAGE,
    };
  }
  
  // Fallback to procedural
  return {
    source: 'procedural',
  };
}


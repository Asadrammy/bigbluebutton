/**
 * ReadyPlayer.me Avatar Service
 * Handles fetching and caching 3D avatars from ReadyPlayer.me API
 * 
 * API Documentation: https://docs.readyplayer.me/ready-player-me/api-reference/rest-api/avatars/get-3d-avatars
 * Base URL: https://models.readyplayer.me (must use this, not api.readyplayer.me)
 */

// Use legacy API to avoid deprecation warnings in Expo SDK 54
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

const READY_PLAYER_ME_BASE_URL = 'https://models.readyplayer.me';

/**
 * ReadyPlayer.me Avatar Query Parameters
 * See: https://docs.readyplayer.me/ready-player-me/api-reference/rest-api/avatars/get-3d-avatars
 */
export interface ReadyPlayerMeQueryParams {
  /** Level of Detail (0-3). Lower values = better performance, less detail */
  lod?: 0 | 1 | 2 | 3;
  /** Texture atlas setting. Options: 'none' | '1024' | '2048' | '4096' */
  textureAtlas?: 'none' | '1024' | '2048' | '4096';
  /** Texture quality preset */
  textureQuality?: 'high' | 'medium' | 'low';
  /** Morph target quality */
  morphTargetQuality?: 'high' | 'medium' | 'low';
}

export interface AvatarConfig {
  avatarId: string;
  quality?: 'high' | 'medium' | 'low';
  format?: 'glb' | 'gltf';
  queryParams?: ReadyPlayerMeQueryParams;
}

/**
 * Build query string from parameters
 */
function buildQueryString(params: ReadyPlayerMeQueryParams): string {
  const queryParts: string[] = [];
  
  if (params.lod !== undefined) {
    queryParts.push(`lod=${params.lod}`);
  }
  if (params.textureAtlas !== undefined) {
    queryParts.push(`textureAtlas=${params.textureAtlas}`);
  }
  if (params.textureQuality !== undefined) {
    queryParts.push(`textureQuality=${params.textureQuality}`);
  }
  if (params.morphTargetQuality !== undefined) {
    queryParts.push(`morphTargetQuality=${params.morphTargetQuality}`);
  }
  
  return queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
}

/**
 * Get the URL for a ReadyPlayer.me avatar
 * 
 * @param avatarId - The ReadyPlayer.me avatar ID (e.g., '65a8dba831b23abb4f401bae')
 * @param format - File format (default: 'glb'). MUST include .glb extension or you'll get 404
 * @param queryParams - Optional query parameters for customization
 * @returns The full URL to the avatar model
 * 
 * @example
 * // Basic usage
 * getReadyPlayerMeAvatarUrl('65a8dba831b23abb4f401bae')
 * // Returns: https://models.readyplayer.me/65a8dba831b23abb4f401bae.glb
 * 
 * @example
 * // With query parameters
 * getReadyPlayerMeAvatarUrl('65a8dba831b23abb4f401bae', 'glb', { lod: 2, textureAtlas: 'none' })
 * // Returns: https://models.readyplayer.me/65a8dba831b23abb4f401bae.glb?lod=2&textureAtlas=none
 */
export function getReadyPlayerMeAvatarUrl(
  avatarId: string, 
  format: 'glb' | 'gltf' = 'glb',
  queryParams?: ReadyPlayerMeQueryParams
): string {
  if (!avatarId || avatarId.trim() === '') {
    throw new Error('Avatar ID is required');
  }

  // Remove any leading/trailing slashes, whitespace, or .glb extension if present
  let cleanId = avatarId.trim().replace(/^\/+|\/+$/g, '').replace(/\.(glb|gltf)$/i, '');
  
  // Ensure we have a valid ID
  if (!cleanId) {
    throw new Error('Invalid avatar ID');
  }
  
  // Build base URL with .glb extension (required by API)
  const baseUrl = `${READY_PLAYER_ME_BASE_URL}/${cleanId}.${format}`;
  
  // Add query parameters if provided
  const queryString = queryParams ? buildQueryString(queryParams) : '';
  
  return `${baseUrl}${queryString}`;
}

/**
 * Download and cache a ReadyPlayer.me avatar to local storage
 * 
 * @param avatarId - The ReadyPlayer.me avatar ID (e.g., '65a8dba831b23abb4f401bae')
 * @param format - File format (default: 'glb')
 * @param queryParams - Optional query parameters for avatar customization
 * @returns Local file URI that can be used with useGLTF
 * 
 * @example
 * // Basic download
 * await downloadReadyPlayerMeAvatar('65a8dba831b23abb4f401bae');
 * 
 * @example
 * // With performance optimizations
 * await downloadReadyPlayerMeAvatar('65a8dba831b23abb4f401bae', 'glb', { 
 *   lod: 2, 
 *   textureAtlas: 'none' 
 * });
 */
export async function downloadReadyPlayerMeAvatar(
  avatarId: string,
  format: 'glb' | 'gltf' = 'glb',
  queryParams?: ReadyPlayerMeQueryParams
): Promise<string> {
  try {
    const avatarUrl = getReadyPlayerMeAvatarUrl(avatarId, format, queryParams);
    
    // Create cache directory if it doesn't exist
    const cacheDir = `${FileSystem.cacheDirectory}avatars/`;
    const dirInfo = await FileSystem.getInfoAsync(cacheDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
    }

    // Create cache key that includes query params for proper caching
    // Clean avatar ID for filename
    const cleanId = avatarId.trim().replace(/^\/+|\/+$/g, '').replace(/\.(glb|gltf)$/i, '');
    
    // Build cache key that includes query params to avoid conflicts
    const cacheKey = queryParams 
      ? `${cleanId}_${JSON.stringify(queryParams).replace(/[^a-zA-Z0-9]/g, '_')}`
      : cleanId;
    
    const fileName = `${cacheKey}.${format}`;
    const localUri = `${cacheDir}${fileName}`;

    // Check if file already exists in cache
    const fileInfo = await FileSystem.getInfoAsync(localUri);
    if (fileInfo.exists) {
      console.log(`Avatar: Using cached avatar from ${localUri}`);
      return localUri;
    }

    // Download the avatar
    console.log(`Avatar: Downloading avatar from ${avatarUrl}`);
    const downloadResult = await FileSystem.downloadAsync(avatarUrl, localUri);

    if (downloadResult.status !== 200) {
      throw new Error(`Failed to download avatar: HTTP ${downloadResult.status}`);
    }

    console.log(`Avatar: Successfully downloaded avatar to ${localUri}`);
    return localUri;
  } catch (error: any) {
    console.error('Avatar: Error downloading ReadyPlayer.me avatar:', error);
    throw new Error(`Failed to download avatar: ${error.message}`);
  }
}

/**
 * Clear cached avatars
 * @param avatarId - Optional specific avatar ID to clear, or clear all if not provided
 */
export async function clearAvatarCache(avatarId?: string): Promise<void> {
  try {
    const cacheDir = `${FileSystem.cacheDirectory}avatars/`;
    
    if (avatarId) {
      // Clear specific avatar
      const fileName = `${avatarId}.glb`;
      const localUri = `${cacheDir}${fileName}`;
      const fileInfo = await FileSystem.getInfoAsync(localUri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(localUri, { idempotent: true });
        console.log(`Avatar: Cleared cache for ${avatarId}`);
      }
    } else {
      // Clear all avatars
      const dirInfo = await FileSystem.getInfoAsync(cacheDir);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(cacheDir, { idempotent: true });
        console.log('Avatar: Cleared all avatar cache');
      }
    }
  } catch (error: any) {
    console.error('Avatar: Error clearing avatar cache:', error);
  }
}

/**
 * Get cache size for avatars
 */
export async function getAvatarCacheSize(): Promise<number> {
  try {
    const cacheDir = `${FileSystem.cacheDirectory}avatars/`;
    const dirInfo = await FileSystem.getInfoAsync(cacheDir);
    
    if (!dirInfo.exists) {
      return 0;
    }

    // Note: FileSystem doesn't have a direct way to get directory size
    // This would require iterating through files, which we'll skip for now
    return 0;
  } catch (error) {
    console.error('Avatar: Error getting cache size:', error);
    return 0;
  }
}

/**
 * Check if an avatar is cached locally
 */
export async function isAvatarCached(avatarId: string, format: 'glb' | 'gltf' = 'glb'): Promise<boolean> {
  try {
    const cacheDir = `${FileSystem.cacheDirectory}avatars/`;
    const fileName = `${avatarId}.${format}`;
    const localUri = `${cacheDir}${fileName}`;
    const fileInfo = await FileSystem.getInfoAsync(localUri);
    return fileInfo.exists;
  } catch (error) {
    return false;
  }
}


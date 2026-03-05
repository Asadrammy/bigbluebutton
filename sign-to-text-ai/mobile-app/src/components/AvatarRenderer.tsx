import React, { useEffect, useRef, useState, Suspense, useMemo } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { Canvas, useFrame, useLoader } from '@react-three/fiber/native';
import { OrbitControls } from '@react-three/drei/native';
import * as THREE from 'three';
import * as FileSystem from 'expo-file-system/legacy';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { COLORS } from '@utils/constants';
import { AnimationData } from '../types';
import { downloadReadyPlayerMeAvatar, getReadyPlayerMeAvatarUrl, ReadyPlayerMeQueryParams } from '@services/avatarService';

interface AvatarRendererProps {
  animationData?: AnimationData;
  isLoading?: boolean;
  modelPath?: string; // Path to GLB model (local require or file URI)
  avatarId?: string; // ReadyPlayer.me avatar ID (alternative to modelPath)
  avatarQueryParams?: ReadyPlayerMeQueryParams; // Optional query parameters for ReadyPlayer.me API
}

/**
 * 3D Human Avatar Component
 * Renders a realistic human character performing sign language gestures
 * Uses useFrame hook for proper animation updates in React Three Fiber
 */
// Hook to convert file URI to data URI for useGLTF
function useFileToDataUri(fileUri: string | null): { dataUri: string | null; isLoading: boolean; error: string | null } {
  const [dataUri, setDataUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fileUri || !fileUri.startsWith('file://')) {
      setDataUri(fileUri);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);
    setDataUri(null);

    const convertFile = async () => {
      try {
        console.log('Avatar: Converting file URI to data URI using FileSystem API:', fileUri);
        
        // Check if file exists using legacy API (more reliable)
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        if (!fileInfo.exists) {
          throw new Error(`File does not exist: ${fileUri}`);
        }

        console.log('Avatar: File exists, reading as base64 using FileSystem API');
        // Use FileSystem.readAsStringAsync for reading base64
        // Use string literal 'base64' directly - this is the most reliable approach
        let base64Data: string;
        try {
          // Directly use 'base64' as string - this works across all Expo versions
          base64Data = await FileSystem.readAsStringAsync(fileUri, {
            encoding: 'base64' as any,
          });
        } catch (encodingError: any) {
          console.error('Avatar: Error reading file as base64:', encodingError);
          // Re-throw with more context
          throw new Error(`Failed to read file as base64: ${encodingError.message || encodingError}`);
        }
        console.log('Avatar: Successfully read base64 data using FileSystem.readAsStringAsync, length:', base64Data?.length || 0);

        const dataUriResult = `data:model/gltf-binary;base64,${base64Data}`;
        if (isMounted) {
          setDataUri(dataUriResult);
          setIsLoading(false);
          console.log('Avatar: Successfully converted file URI to data URI');
        }
      } catch (err: any) {
        console.error('Avatar: Error converting file to data URI:', err);
        if (isMounted) {
          setError(err.message || 'Failed to convert file');
          setIsLoading(false);
          setDataUri(null);
        }
      }
    };

    convertFile();

    return () => {
      isMounted = false;
    };
  }, [fileUri]);

  return { dataUri, isLoading, error };
}

// Hook to preload URL and convert to data URI (avoids useGLTF internal FileSystem issues)
function useUrlToDataUri(url: string | null): { dataUri: string | null; isLoading: boolean; error: string | null } {
  const [dataUri, setDataUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
      setDataUri(url);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);
    setDataUri(null);

    const loadUrl = async () => {
      try {
        console.log('Avatar: Loading GLB from URL and converting to data URI:', url);
        
        // Download file to local cache using FileSystem
        const fileUri = `${FileSystem.cacheDirectory}avatar_${Date.now()}.glb`;
        const downloadResult = await FileSystem.downloadAsync(url, fileUri);
        
        if (!downloadResult.uri) {
          throw new Error('Failed to download avatar file');
        }
        
        console.log('Avatar: Downloaded to cache, converting to base64');
        
        // Read the downloaded file as base64
        const base64Data = await FileSystem.readAsStringAsync(downloadResult.uri, {
          encoding: 'base64' as any,
        });
        
        const dataUriResult = `data:model/gltf-binary;base64,${base64Data}`;
        if (isMounted) {
          setDataUri(dataUriResult);
          setIsLoading(false);
          console.log('Avatar: Successfully loaded URL and converted to data URI');
        }
      } catch (err: any) {
        console.error('Avatar: Error loading URL:', err);
        if (isMounted) {
          setError(err.message || 'Failed to load URL');
          setIsLoading(false);
          setDataUri(null);
        }
      }
    };

    loadUrl();

    return () => {
      isMounted = false;
    };
  }, [url]);

  return { dataUri, isLoading, error };
}

// Inner component that loads GLB via GLTFLoader to avoid internal EncodingType.Base64 usage
function GLBLoaderInner({ gltfPath, animationData, modelPath }: { gltfPath: string; animationData?: AnimationData; modelPath: string }) {
  // Validate path before calling loader - reject placeholder strings and empty paths
  if (!gltfPath || gltfPath.includes('placeholder') || gltfPath.trim() === '') {
    console.warn('Avatar: Invalid gltfPath provided to loader', { gltfPath, modelPath });
    throw new Error(`Invalid GLB path: ${gltfPath}`);
  }
  
  // Load GLB model using GLTFLoader (avoids EncodingType.Base64 in useGLTF)
  // Suspense will still catch loader errors
  const gltfData = useLoader(GLTFLoader, gltfPath);
  
  // Validate gltfData after Suspense resolves
  if (!gltfData) {
    console.error('Avatar: GLTFLoader returned null or undefined', { 
      gltfPath: gltfPath.substring(0, 100) + '...',
      isFileUri: gltfPath.startsWith('file://')
    });
    throw new Error('GLTFLoader returned null or undefined');
  }
  
  if (!gltfData.scene) {
    console.error('Avatar: GLB model loaded but scene is null', { 
      hasGltfData: !!gltfData,
      animations: gltfData.animations?.length || 0,
      gltfPath: gltfPath.substring(0, 100) + '...'
    });
    throw new Error('GLB model loaded but scene is null');
  }

  console.log('Avatar: Successfully loaded GLB model', {
    hasScene: !!gltfData.scene,
    animationCount: gltfData.animations?.length || 0,
    childrenCount: gltfData.scene.children.length,
    path: modelPath,
    loadedFrom: gltfPath.startsWith('data:') ? 'file URI (converted to data URI)' : 'direct path'
  });

  return <GLBAvatar gltfData={gltfData} animationData={animationData} />;
}

// Component to load GLB model using useGLTF with proper path handling
function GLBAvatarLoader({ modelPath, animationData }: { modelPath: string; animationData?: AnimationData }) {
  // Check path type
  const isFileUri = modelPath.startsWith('file://');
  const isUrl = modelPath.startsWith('http://') || modelPath.startsWith('https://');
  const isDataUri = modelPath.startsWith('data:');
  
  // For URLs, preload and convert to data URI (avoids useGLTF/GLTFLoader internal FileSystem issues)
  const { dataUri: urlDataUri, isLoading: isConvertingUrl, error: urlError } = useUrlToDataUri(
    isUrl ? modelPath : null
  );
  
  // For file URIs, convert to data URI (useGLTF/GLTFLoader doesn't support file:// on React Native)
  const { dataUri: fileDataUri, isLoading: isConvertingFile, error: fileError } = useFileToDataUri(
    isFileUri ? modelPath : null
  );
  
  // Determine the path to use with useGLTF
  const gltfPath = useMemo(() => {
    if (isUrl) {
      // URLs must be converted to data URIs to avoid useGLTF internal FileSystem issues
      if (!urlDataUri || urlDataUri.includes('placeholder') || urlDataUri.trim() === '') {
        return null;
      }
      console.log('Avatar: Using data URI (converted from URL)');
      return urlDataUri;
    }
    
    if (isFileUri) {
      // File URIs must be converted to data URIs
      if (!fileDataUri || fileDataUri.includes('placeholder') || fileDataUri.trim() === '') {
        return null;
      }
      console.log('Avatar: Using data URI (converted from file URI)');
      return fileDataUri;
    }
    
    // Data URIs can be used directly
    if (isDataUri) {
      console.log('Avatar: Using data URI directly');
      return modelPath;
    }
    
    // For require() paths or other direct paths, use directly
    if (modelPath && !modelPath.includes('placeholder') && modelPath.trim() !== '') {
      console.log('Avatar: Using direct path with useGLTF');
      return modelPath;
    }
    
    return null;
  }, [isFileUri, isUrl, isDataUri, urlDataUri, fileDataUri, modelPath]);
  
  // If still converting, return null (component will re-render when dataUri is set)
  if ((isUrl && (!urlDataUri || isConvertingUrl)) || (isFileUri && (!fileDataUri || isConvertingFile))) {
    return null;
  }
  
  // If conversion failed, throw error (error boundary will catch it)
  if (urlError || fileError) {
    throw new Error(`Failed to load avatar: ${urlError || fileError}`);
  }

  // Only render GLBLoaderInner when we have a valid path (never pass placeholder)
  // Type guard: ensure gltfPath is a non-empty string
  if (!gltfPath || typeof gltfPath !== 'string' || gltfPath.trim() === '' || gltfPath.includes('placeholder')) {
    console.warn('Avatar: Invalid gltfPath, cannot load GLB model', {
      hasGltfPath: !!gltfPath,
      isFileUri,
      modelPath: modelPath?.substring(0, 50)
    });
    throw new Error('Invalid GLB model path');
  }

  // At this point, gltfPath is guaranteed to be a valid non-empty string
  // Log which approach we're using
  console.log('Avatar: Loading GLB with path type:', gltfPath.startsWith('file://') ? 'file URI (direct)' : 'direct path');
  return <GLBLoaderInner gltfPath={gltfPath} animationData={animationData} modelPath={modelPath} />;
}

// Error boundary component to catch GLB loading errors
class GLBErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: (error: Error) => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; onError: (error: Error) => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error for debugging
    console.error('Avatar: GLB loading error caught:', error.message, errorInfo);
    // Call error handler with the error
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) {
      // Return null - parent will handle fallback
      return null;
    }
    return this.props.children;
  }
}

// Component to handle GLB model with animation
const GLBAvatar: React.FC<{
  gltfData: any;
  animationData?: AnimationData;
}> = ({ gltfData, animationData }) => {
  const groupRef = useRef<THREE.Group>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const animationActionRef = useRef<THREE.AnimationAction | null>(null);
  
  // Validate gltfData
  if (!gltfData) {
    console.warn('Avatar: gltfData is null or undefined, using fallback');
    return null;
  }
  
  const { scene, animations } = gltfData || { scene: null, animations: [] };
  
  // Clone the scene to avoid mutations
  const clonedScene = React.useMemo(() => {
    if (!scene) {
      return null;
    }
    try {
      const clone = scene.clone();
      console.log('Avatar: Loaded GLB model', {
        hasScene: !!clone,
        animationCount: animations?.length || 0,
        childrenCount: clone.children.length
      });
      
      // Log all bones in the loaded model
      const bones: any[] = [];
      clone.traverse((child) => {
        if (child instanceof THREE.Bone || child instanceof THREE.SkinnedMesh) {
          bones.push({
            name: child.name,
            type: child.type
          });
        }
      });
      console.log('Avatar: GLB model bones', {
        boneCount: bones.length,
        boneNames: bones.map(b => b.name)
      });
      
      return clone;
    } catch (error: any) {
      console.warn('Avatar: Error cloning GLB scene, using fallback:', error.message);
      return null;
    }
  }, [scene, animations]);

  // Initialize animation mixer
  useEffect(() => {
    if (!clonedScene) return;
    
    mixerRef.current = new THREE.AnimationMixer(clonedScene);
    console.log('Avatar: GLB Animation mixer initialized');
    
    return () => {
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
      }
    };
  }, [clonedScene]);

  // Apply animation data to GLB model
  useEffect(() => {
    if (!clonedScene || !animationData || !animationData.keyframes || !mixerRef.current) {
      return;
    }

    const mixer = mixerRef.current;
    
    // Clear previous animation
    if (animationActionRef.current) {
      animationActionRef.current.stop();
      animationActionRef.current = null;
    }
    mixer.stopAllAction();

    // Build bone map from GLB model
    const boneMap = new Map<string, THREE.Bone>();
    clonedScene.traverse((child) => {
      if (child instanceof THREE.Bone) {
        const nameLower = child.name.toLowerCase();
        boneMap.set(nameLower, child);
        boneMap.set(child.name, child);
      }
      if (child instanceof THREE.SkinnedMesh && child.skeleton) {
        child.skeleton.bones.forEach((bone) => {
          const nameLower = bone.name.toLowerCase();
          boneMap.set(nameLower, bone);
          boneMap.set(bone.name, bone);
        });
      }
    });

    // Create animation tracks from keyframes
    const tracks: THREE.KeyframeTrack[] = [];
    const boneKeyframes = new Map<string, Array<{
      time: number;
      position?: [number, number, number];
      rotation?: [number, number, number, number];
    }>>();

    animationData.keyframes.forEach((kf) => {
      if (kf.bones && Array.isArray(kf.bones)) {
        kf.bones.forEach((boneTransform) => {
          const boneName = boneTransform.name.toLowerCase();
          if (!boneKeyframes.has(boneName)) {
            boneKeyframes.set(boneName, []);
          }
          boneKeyframes.get(boneName)!.push({
            time: kf.time,
            position: boneTransform.position,
            rotation: boneTransform.rotation,
          });
        });
      }
    });

    // Create tracks for each bone
    boneKeyframes.forEach((keyframes, boneName) => {
      let bone = boneMap.get(boneName);
      
      // Try alternative bone names (Mixamo, ReadyPlayerMe, etc.)
      if (!bone) {
        const alternatives = [
          boneName.replace('left', 'Left').replace('right', 'Right'),
          boneName.replace('hand', 'Hand').replace('arm', 'Arm'),
          `mixamorig_${boneName}`,
          `mixamorig${boneName.charAt(0).toUpperCase() + boneName.slice(1)}`,
          `Armature|${boneName}`,
        ];
        for (const alt of alternatives) {
          bone = boneMap.get(alt.toLowerCase()) || boneMap.get(alt);
          if (bone) {
            console.log(`Avatar: Found bone "${alt}" for "${boneName}"`);
            break;
          }
        }
      }
      
      if (!bone) {
        console.warn(`Avatar: Bone "${boneName}" not found in GLB model`);
        return;
      }

      // Create rotation track
      const rotationKeyframes = keyframes.filter((kf) => kf.rotation);
      if (rotationKeyframes.length > 0) {
        const times = rotationKeyframes.map((kf) => kf.time);
        const values: number[] = [];
        rotationKeyframes.forEach((kf) => {
          if (kf.rotation) {
            const quat = kf.rotation.length === 4 ? kf.rotation : [0, 0, 0, 1];
            values.push(...quat);
          }
        });

        const trackName = `${bone.name}.quaternion`;
        try {
          const rotationTrack = new THREE.QuaternionKeyframeTrack(
            trackName,
            times,
            values
          );
          tracks.push(rotationTrack);
        } catch (error) {
          console.error(`Avatar: Failed to create rotation track for "${bone.name}":`, error);
        }
      }

      // Create position track
      const positionKeyframes = keyframes.filter((kf) => kf.position);
      if (positionKeyframes.length > 0) {
        const times = positionKeyframes.map((kf) => kf.time);
        const values: number[] = [];
        positionKeyframes.forEach((kf) => {
          if (kf.position) {
            values.push(...kf.position);
          }
        });

        const trackName = `${bone.name}.position`;
        try {
          const positionTrack = new THREE.VectorKeyframeTrack(
            trackName,
            times,
            values
          );
          tracks.push(positionTrack);
        } catch (error) {
          console.error(`Avatar: Failed to create position track for "${bone.name}":`, error);
        }
      }
    });

    if (tracks.length > 0) {
      const duration = animationData.duration || 1.0;
      const clip = new THREE.AnimationClip('signAnimation', duration, tracks);
      const action = mixer.clipAction(clip, clonedScene);
      action.reset(); // Reset to beginning
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      action.timeScale = 1.0;
      action.play();
      animationActionRef.current = action;
      
      // Force initial update to start animation immediately
      mixer.update(0);
      
      console.log('Avatar: GLB Animation playing', {
        trackCount: tracks.length,
        duration,
        isPlaying: action.isRunning(),
        time: action.time,
        trackNames: tracks.map(t => t.name)
      });
    } else {
      console.warn('Avatar: No animation tracks created', {
        keyframesCount: animationData.keyframes.length,
        boneKeyframesSize: boneKeyframes.size
      });
    }
  }, [clonedScene, animationData]);

  // Update animation mixer - CRITICAL for animation playback
  useFrame((state, delta) => {
    if (mixerRef.current) {
      mixerRef.current.update(delta);
      // Log animation progress for debugging
      if (animationActionRef.current && animationActionRef.current.isRunning()) {
        const time = animationActionRef.current.time;
        const duration = animationActionRef.current.getClip().duration;
        if (Math.floor(time * 10) % 10 === 0) { // Log every 0.1 seconds
          console.log(`Avatar: Animation playing - ${(time / duration * 100).toFixed(1)}%`);
        }
      }
    }
  });

  if (!clonedScene) {
    return null;
  }

  return (
    <group ref={groupRef}>
      <primitive object={clonedScene} dispose={null} />
    </group>
  );
};

const Avatar: React.FC<{
  animationData?: AvatarRendererProps['animationData'];
  modelPath?: string;
  avatarId?: string;
  avatarQueryParams?: ReadyPlayerMeQueryParams;
}> = ({ animationData, modelPath, avatarId, avatarQueryParams }) => {
  const groupRef = useRef<THREE.Group>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const animationActionRef = useRef<THREE.AnimationAction | null>(null);
  const clockRef = useRef(new THREE.Clock());
  const sceneRef = useRef<THREE.Group | null>(null);
  const [readyPlayerModelPath, setReadyPlayerModelPath] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [glbLoadError, setGlbLoadError] = useState(false);
  
  // IMPORTANT: All hooks must be called before any conditional returns
  // Create procedural scene upfront (will only be used if no model path is available)
  const [proceduralScene] = useState(() => {
    const newScene = createProceduralHuman();
    
    // Log all meshes in the scene to verify they exist
    const meshes: any[] = [];
    newScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        meshes.push({
          name: child.name,
          position: child.position,
          visible: child.visible,
          material: child.material
        });
      }
    });
    
    console.log('Avatar: Created procedural human scene', {
      childrenCount: newScene.children.length,
      boneNames: newScene.children.map(c => c.name),
      meshCount: meshes.length,
      meshes: meshes.map(m => m.name)
    });
    sceneRef.current = newScene;
    return newScene;
  });
  
  // IMPORTANT: Call ALL hooks before any conditional returns
  // Use useFrame to update animation mixer every frame (must be called unconditionally)
  useFrame((state, delta) => {
    if (mixerRef.current) {
      mixerRef.current.update(delta);
      // Log animation progress for debugging
      if (animationActionRef.current && animationActionRef.current.isRunning()) {
        const time = animationActionRef.current.time;
        const duration = animationActionRef.current.getClip().duration;
        if (Math.floor(time * 10) % 10 === 0) { // Log every 0.1 seconds
          console.log(`Avatar: Procedural animation playing - ${(time / duration * 100).toFixed(1)}%`);
        }
      }
    }
  });

  // Use ReadyPlayer.me avatar URL directly (no download needed)
  // This avoids file URI conversion issues - useGLTF can load directly from HTTPS URL
  useEffect(() => {
    if (avatarId && !modelPath) {
      try {
        // Get the direct URL instead of downloading
        const avatarUrl = getReadyPlayerMeAvatarUrl(avatarId, 'glb', avatarQueryParams);
        console.log('Avatar: Using ReadyPlayer.me URL directly (no download):', avatarUrl);
        setReadyPlayerModelPath(avatarUrl); // Use URL directly, not file URI
        setGlbLoadError(false);
      } catch (error: any) {
        console.warn('Avatar: Failed to get ReadyPlayer.me URL:', error.message);
        setGlbLoadError(true);
      }
    }
  }, [avatarId, modelPath, avatarQueryParams]);
  
  // Animation effect for procedural avatar (must be called unconditionally)
  useEffect(() => {
    // Use procedural human scene (already created above)
    const scene = proceduralScene;
    console.log('Avatar: useEffect triggered', {
      hasScene: !!scene,
      hasAnimationData: !!animationData,
      keyframesCount: animationData?.keyframes?.length || 0
    });
    
    if (!scene) {
      console.warn('Avatar: No scene available');
      return;
    }
    
    // Always show avatar, even without animation data
    if (!animationData) {
      console.log('Avatar: No animation data, showing idle avatar');
      // Still show the avatar in idle state
      return;
    }

    console.log('Avatar: Processing animation data', {
      keyframesCount: animationData.keyframes?.length || 0,
      duration: animationData.duration,
      format: animationData.format,
      hasKeyframes: !!animationData.keyframes && animationData.keyframes.length > 0,
      firstKeyframe: animationData.keyframes?.[0],
      sceneChildren: scene.children.length
    });

    // If no keyframes, just show the avatar in idle state
    if (!animationData.keyframes || animationData.keyframes.length === 0) {
      console.log('Avatar: Empty keyframes, showing idle avatar');
      return;
    }

    // Find root bone in the scene
    let rootBone: THREE.Bone | null = null;
    scene.traverse((child) => {
      if (child instanceof THREE.Bone && child.name === 'root') {
        rootBone = child;
      }
    });
    
    // If no root bone found, use the scene itself
    const animationRoot = rootBone || scene;
    
    // Always recreate mixer when animation data changes to ensure clean state
    if (mixerRef.current) {
      mixerRef.current.stopAllAction();
      mixerRef.current.uncacheRoot(mixerRef.current.getRoot());
    }
    
    // Initialize animation mixer with the root bone (or scene if no root bone)
    mixerRef.current = new THREE.AnimationMixer(animationRoot);
    console.log('Avatar: Animation mixer initialized with', rootBone ? 'root bone' : 'scene');

    const mixer = mixerRef.current;
    
    // Clear previous animation
    if (animationActionRef.current) {
      animationActionRef.current.stop();
      animationActionRef.current = null;
    }

    // Create animation clip from keyframes
    const tracks: THREE.KeyframeTrack[] = [];
    const boneMap = new Map<string, THREE.Bone>();

    // Build bone map - traverse the scene to find all bones
    // Store both lowercase and original case versions for flexible matching
    scene.traverse((child) => {
      if (child instanceof THREE.Bone) {
        const nameLower = child.name.toLowerCase();
        boneMap.set(nameLower, child);
        // Also add with original case
        boneMap.set(child.name, child);
      }
      // Also check if it's a SkinnedMesh with skeleton
      if (child instanceof THREE.SkinnedMesh && child.skeleton) {
        child.skeleton.bones.forEach((bone) => {
          const nameLower = bone.name.toLowerCase();
          boneMap.set(nameLower, bone);
          boneMap.set(bone.name, bone);
        });
      }
    });
    
    console.log('Avatar: Bone map created', {
      boneCount: boneMap.size,
      boneNames: Array.from(boneMap.keys())
    });

    // Group keyframes by bone
    // Handle both new format (bones array) and old format (single bone property)
    const boneKeyframes = new Map<string, Array<{
      time: number;
      position?: [number, number, number];
      rotation?: [number, number, number, number];
    }>>();

    animationData.keyframes.forEach((kf) => {
      // Handle new format: keyframe has 'bones' array
      if (kf.bones && Array.isArray(kf.bones)) {
        kf.bones.forEach((boneTransform) => {
          const boneName = boneTransform.name.toLowerCase();
          if (!boneKeyframes.has(boneName)) {
            boneKeyframes.set(boneName, []);
          }
          boneKeyframes.get(boneName)!.push({
            time: kf.time,
            position: boneTransform.position,
            rotation: boneTransform.rotation,
          });
        });
      }
      // Fallback: handle old format with single 'bone' property (for backward compatibility)
      else if ((kf as any).bone) {
        const boneName = String((kf as any).bone).toLowerCase();
        if (!boneKeyframes.has(boneName)) {
          boneKeyframes.set(boneName, []);
        }
        boneKeyframes.get(boneName)!.push({
          time: kf.time,
          position: (kf as any).position,
          rotation: (kf as any).rotation,
        });
      }
    });

    console.log('Avatar: Grouped keyframes by bone', {
      boneCount: boneKeyframes.size,
      boneNames: Array.from(boneKeyframes.keys()),
      totalKeyframes: Array.from(boneKeyframes.values()).reduce((sum, kfs) => sum + kfs.length, 0)
    });

    // Create tracks for each bone
    boneKeyframes.forEach((keyframes, boneName) => {
      // Try to find bone with various name formats
      let bone = boneMap.get(boneName);
      if (!bone) {
        // Try alternative bone names
        const alternatives = [
          boneName.charAt(0).toUpperCase() + boneName.slice(1), // Capitalize first letter
          boneName.replace('left', 'Left').replace('right', 'Right'),
          boneName.replace('hand', 'Hand').replace('arm', 'Arm'),
          boneName.replace('upper', 'Upper').replace('lower', 'Lower'),
          boneName.replace('shoulder', 'Shoulder'),
          `mixamorig_${boneName}`,
          `mixamorig${boneName.charAt(0).toUpperCase() + boneName.slice(1)}`,
          `Armature|${boneName}`,
          // Try without prefixes
          boneName.replace('left', '').replace('right', '').replace('Left', '').replace('Right', ''),
        ];
        for (const alt of alternatives) {
          bone = boneMap.get(alt.toLowerCase()) || boneMap.get(alt);
          if (bone) {
            console.log(`Avatar: Found bone "${alt}" for "${boneName}"`);
            boneMap.set(boneName, bone);
            break;
          }
        }
      }
      
      if (!bone) {
        console.warn(`Avatar: Bone "${boneName}" not found in scene. Available bones:`, Array.from(boneMap.keys()));
        return;
      }

      // Position track
      const positionKeyframes = keyframes.filter((kf) => kf.position);
      if (positionKeyframes.length > 0) {
        const times = positionKeyframes.map((kf) => kf.time);
        const values: number[] = [];
        positionKeyframes.forEach((kf) => {
          if (kf.position) {
            values.push(...kf.position);
          }
        });

        // Track name must match the bone's name exactly as it appears in the scene
        // Three.js will find the bone by name in the scene hierarchy
        // Format: "boneName.property" where boneName must match the bone.name in the scene
        const trackName = `${bone.name}.position`;
        try {
          const positionTrack = new THREE.VectorKeyframeTrack(
            trackName,
            times,
            values
          );
          tracks.push(positionTrack);
          console.log(`Avatar: Created position track "${trackName}" with ${positionKeyframes.length} keyframes`, {
            boneName: bone.name,
            times: times.slice(0, 3),
            values: values.slice(0, 6)
          });
        } catch (error) {
          console.error(`Avatar: Failed to create position track for "${bone.name}":`, error);
        }
      }

      // Rotation track (quaternion)
      const rotationKeyframes = keyframes.filter((kf) => kf.rotation);
      if (rotationKeyframes.length > 0) {
        const times = rotationKeyframes.map((kf) => kf.time);
        const values: number[] = [];
        rotationKeyframes.forEach((kf) => {
          if (kf.rotation) {
            // Ensure quaternion has 4 components
            const quat = kf.rotation.length === 4 ? kf.rotation : [0, 0, 0, 1];
            values.push(...quat);
          }
        });

        const trackName = `${bone.name}.quaternion`;
        try {
          const rotationTrack = new THREE.QuaternionKeyframeTrack(
            trackName,
            times,
            values
          );
          tracks.push(rotationTrack);
          console.log(`Avatar: Created rotation track "${trackName}" with ${rotationKeyframes.length} keyframes`, {
            boneName: bone.name,
            times: times.slice(0, 3),
            quaternionCount: values.length / 4
          });
        } catch (error) {
          console.error(`Avatar: Failed to create rotation track for "${bone.name}":`, error);
        }
      }
    });

    if (tracks.length > 0) {
      const duration = animationData.duration || 1.0;
      const clip = new THREE.AnimationClip('signAnimation', duration, tracks);
      
      console.log('Avatar: Created animation clip', {
        trackCount: tracks.length,
        duration,
        trackNames: tracks.map(t => t.name)
      });
      
      // Create and play animation
      // IMPORTANT: clipAction needs the root object that contains the bones
      // Use the same root as the mixer (rootBone or scene)
      const action = mixer.clipAction(clip, animationRoot);
      action.setLoop(THREE.LoopOnce, 1); // Play once
      action.clampWhenFinished = true; // Stay at last frame
      action.timeScale = 1.0; // Normal playback speed
      action.play();
      animationActionRef.current = action;
      
      console.log('Avatar: Animation playing', {
        actionName: action.getClip().name,
        duration: action.getClip().duration,
        trackCount: tracks.length,
        trackNames: tracks.map(t => t.name),
        isPlaying: action.isRunning(),
        time: action.time
      });
      
      // Force update to ensure animation starts
      mixer.update(0);
    } else {
      console.warn('Avatar: No tracks created from keyframes', {
        boneKeyframesCount: boneKeyframes.size,
        boneNames: Array.from(boneKeyframes.keys()),
        availableBones: Array.from(boneMap.keys())
      });
    }

    return () => {
      if (animationActionRef.current) {
        animationActionRef.current.stop();
        animationActionRef.current = null;
      }
      if (mixer) {
        mixer.stopAllAction();
      }
    };
  }, [animationData, proceduralScene]); // Use proceduralScene instead of scene variable
  
  // Log scene structure for debugging (must be called before conditional returns)
  useEffect(() => {
    if (proceduralScene) {
      console.log('Avatar: Scene structure', {
        childrenCount: proceduralScene.children.length,
        children: proceduralScene.children.map(c => ({
          name: c.name,
          type: c.type,
          childrenCount: c.children.length
        })),
        position: proceduralScene.position,
        scale: proceduralScene.scale
      });
      
      // Log all bones in scene
      proceduralScene.traverse((obj) => {
        if (obj instanceof THREE.Bone) {
          console.log(`Avatar: Found bone "${obj.name}" at`, obj.position, 'children:', obj.children.length);
        }
      });
    }
  }, [proceduralScene]);
  
  // Reset error state when model path changes
  useEffect(() => {
    setGlbLoadError(false);
  }, [modelPath, readyPlayerModelPath]);
  
  // NOW we can do conditional returns - all hooks have been called
  // Determine which model path to use
  const effectiveModelPath = modelPath || readyPlayerModelPath || undefined;
  
  // Use procedural avatar as fallback when:
  // 1. No model path is available, OR
  // 2. GLB loading failed (glbLoadError is true), OR
  // 3. Still downloading ReadyPlayer.me avatar (show procedural while waiting)
  // This ensures the app always shows an avatar without blank screens
  const scene = proceduralScene;
  
  // Show loading state while downloading ReadyPlayer.me avatar, but show procedural avatar in background
  if (isDownloading && !effectiveModelPath) {
    // Show procedural avatar while downloading
    return (
      <group ref={groupRef} position={[0, 0, 0]}>
        {scene && <primitive object={scene} dispose={null} />}
        <ambientLight intensity={1.5} />
        <directionalLight position={[5, 8, 5]} intensity={2.5} castShadow />
        <directionalLight position={[-5, 8, 3]} intensity={1.5} />
        <pointLight position={[0, 4, 5]} intensity={2.0} />
        <spotLight position={[0, 6, 5]} angle={0.6} penumbra={0.3} intensity={1.8} />
        <directionalLight position={[0, 0, -5]} intensity={0.8} color="#ffffff" />
      </group>
    );
  }
  
  // Try to load GLB avatar if model path is available and no error occurred
  // Fall back to procedural avatar if GLB loading fails (per architecture guidelines)
  if (effectiveModelPath && !glbLoadError) {
    return (
      <GLBErrorBoundary 
        onError={(error) => {
          // Log error and trigger fallback to procedural avatar
          console.error('Avatar: GLB loading failed:', error.message);
          console.log('Avatar: Falling back to procedural avatar');
          setGlbLoadError(true);
        }}
      >
        <Suspense fallback={
          // Show procedural avatar immediately while GLB loads to prevent blank screen
          <group ref={groupRef} position={[0, 0, 0]}>
            {scene && <primitive object={scene} dispose={null} />}
            <ambientLight intensity={1.5} />
            <directionalLight position={[5, 8, 5]} intensity={2.5} castShadow />
            <directionalLight position={[-5, 8, 3]} intensity={1.5} />
            <pointLight position={[0, 4, 5]} intensity={2.0} />
            <spotLight position={[0, 6, 5]} angle={0.6} penumbra={0.3} intensity={1.8} />
            <directionalLight position={[0, 0, -5]} intensity={0.8} color="#ffffff" />
          </group>
        }>
          <GLBAvatarLoader 
            modelPath={effectiveModelPath} 
            animationData={animationData} 
          />
        </Suspense>
      </GLBErrorBoundary>
    );
  }

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Render procedural scene with bones for animation */}
      {scene && <primitive object={scene} dispose={null} />}
      
      {/* Enhanced lighting for better visibility - brighter and more focused */}
      <ambientLight intensity={1.5} />
      <directionalLight position={[5, 8, 5]} intensity={2.5} castShadow />
      <directionalLight position={[-5, 8, 3]} intensity={1.5} />
      <pointLight position={[0, 4, 5]} intensity={2.0} />
      <spotLight position={[0, 6, 5]} angle={0.6} penumbra={0.3} intensity={1.8} />
      
      {/* Additional rim lighting for better 3D effect */}
      <directionalLight position={[0, 0, -5]} intensity={0.8} color="#ffffff" />
    </group>
  );
};

/**
 * Create a realistic-looking procedural human avatar
 * This is a fallback when no 3D model is available
 * Creates a proper bone hierarchy for animation with realistic proportions
 */
function createProceduralHuman(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'avatar';
  group.position.set(0, 0, 0);
  // Increased scale for better visibility
  group.scale.set(1.5, 1.5, 1.5);

  // Root bone for the entire skeleton
  const rootBone = new THREE.Bone();
  rootBone.name = 'root';
  rootBone.position.set(0, 0, 0);
  group.add(rootBone);

  // HIPS - Base of the skeleton
  const hipsBone = new THREE.Bone();
  hipsBone.name = 'hips';
  hipsBone.position.set(0, 0, 0);
  rootBone.add(hipsBone);

  // SPINE - Connects hips to chest
  const spineBone = new THREE.Bone();
  spineBone.name = 'spine';
  spineBone.position.set(0, 0.3, 0);
  hipsBone.add(spineBone);

  // CHEST - Upper torso
  const chestBone = new THREE.Bone();
  chestBone.name = 'chest';
  chestBone.position.set(0, 0.4, 0);
  spineBone.add(chestBone);

  // NECK - Connects chest to head
  const neckBone = new THREE.Bone();
  neckBone.name = 'neck';
  neckBone.position.set(0, 0.3, 0);
  chestBone.add(neckBone);
  
  // Brighter, more visible skin tone material
  const skinMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xffdbac, // Skin tone
    metalness: 0.0,
    roughness: 0.7,
    side: THREE.DoubleSide,
    emissive: 0x000000,
    emissiveIntensity: 0.0,
  });

  // Clothing material (darker but still visible)
  const clothingMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x1a1a1a, // Dark grey/black
    metalness: 0.0,
    roughness: 0.8,
    side: THREE.DoubleSide,
  });

  // HEAD - More realistic with better proportions
  const headBone = new THREE.Bone();
  headBone.name = 'head';
  headBone.position.set(0, 0.4, 0);
  neckBone.add(headBone);
  
  // Head mesh - ellipsoid for more realistic shape
  const headGeometry = new THREE.SphereGeometry(0.4, 32, 32);
  // Scale to make it more head-like (slightly wider)
  headGeometry.scale(1.1, 1.2, 1.0);
  const headMesh = new THREE.Mesh(headGeometry, skinMaterial);
  headMesh.castShadow = true;
  headMesh.receiveShadow = true;
  headMesh.position.set(0, 0, 0);
  headMesh.name = 'headMesh';
  headBone.add(headMesh);

  // NECK mesh (visual representation)
  const neckGeometry = new THREE.CylinderGeometry(0.13, 0.16, 0.3, 16);
  const neckMesh = new THREE.Mesh(neckGeometry, skinMaterial);
  neckMesh.position.set(0, -0.2, 0);
  neckMesh.castShadow = true;
  neckBone.add(neckMesh);

  // BODY/TORSO - More realistic proportions with clothing
  const bodyGeometry = new THREE.BoxGeometry(1.0, 1.5, 0.6);
  const body = new THREE.Mesh(bodyGeometry, clothingMaterial);
  body.castShadow = true;
  body.receiveShadow = true;
  body.position.set(0, 0.5, 0);
  body.name = 'body';
  chestBone.add(body);

  // Shoulders - more visible
  const shoulderGeometry = new THREE.SphereGeometry(0.2, 16, 16);
  const leftShoulder = new THREE.Mesh(shoulderGeometry, clothingMaterial);
  leftShoulder.position.set(-0.55, 0.6, 0);
  body.add(leftShoulder);
  const rightShoulder = new THREE.Mesh(shoulderGeometry, clothingMaterial);
  rightShoulder.position.set(0.55, 0.6, 0);
  body.add(rightShoulder);

  // LEFT SHOULDER bone
  const leftShoulderBone = new THREE.Bone();
  leftShoulderBone.name = 'leftShoulder';
  leftShoulderBone.position.set(-0.55, 0.6, 0);
  chestBone.add(leftShoulderBone);

  // LEFT ARM - Realistic proportions
  const leftUpperArmBone = createRealisticBone('leftUpperArm', [0, -0.3, 0], 0.15, 0.55, skinMaterial);
  leftUpperArmBone.position.set(0, -0.3, 0);
  leftShoulderBone.add(leftUpperArmBone);
  
  const leftLowerArmBone = createRealisticBone('leftLowerArm', [0, -0.45, 0], 0.13, 0.5, skinMaterial);
  leftLowerArmBone.position.set(0, -0.275, 0);
  leftUpperArmBone.add(leftLowerArmBone);
  
  const leftHandBone = createRealisticBone('leftHand', [0, -0.45, 0], 0.11, 0.18, skinMaterial);
  leftHandBone.position.set(0, -0.25, 0);
  leftLowerArmBone.add(leftHandBone);

  // RIGHT SHOULDER bone
  const rightShoulderBone = new THREE.Bone();
  rightShoulderBone.name = 'rightShoulder';
  rightShoulderBone.position.set(0.55, 0.6, 0);
  chestBone.add(rightShoulderBone);

  // RIGHT ARM - THIS IS THE ONE WE ANIMATE (more realistic and visible)
  const rightUpperArmBone = createRealisticBone('rightUpperArm', [0, -0.3, 0], 0.15, 0.55, skinMaterial);
  rightUpperArmBone.position.set(0, -0.3, 0);
  rightShoulderBone.add(rightUpperArmBone);
  
  const rightLowerArmBone = createRealisticBone('rightLowerArm', [0, -0.45, 0], 0.13, 0.5, skinMaterial);
  rightLowerArmBone.position.set(0, -0.275, 0);
  rightUpperArmBone.add(rightLowerArmBone);
  
  const rightHandBone = createRealisticBone('rightHand', [0, -0.45, 0], 0.11, 0.18, skinMaterial);
  rightHandBone.position.set(0, -0.25, 0);
  rightLowerArmBone.add(rightHandBone);

  // Update matrix world for proper bone hierarchy
  rootBone.updateMatrixWorld(true);

  console.log('Avatar: Created procedural human with bone hierarchy', {
    rootChildren: rootBone.children.map(c => c.name),
    totalBones: countBones(rootBone),
    scale: group.scale
  });

  return group;
}

// Create realistic bone with cylindrical shape (more human-like)
function createRealisticBone(
  name: string, 
  position: [number, number, number], 
  radius: number, 
  length: number,
  material: THREE.Material
): THREE.Bone {
  const bone = new THREE.Bone();
  bone.name = name;
  bone.position.set(...position);
  
  // Use cylinder for more realistic limb shape - higher quality geometry
  const geometry = new THREE.CylinderGeometry(radius, radius * 0.9, length, 24);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.rotation.z = Math.PI / 2; // Rotate to align with bone direction
  mesh.position.set(0, length / 2, 0); // Position at bone end
  mesh.name = `${name}Mesh`;
  mesh.visible = true;
  // Ensure mesh is properly added to bone
  bone.add(mesh);
  
  // Make sure the bone is visible and properly positioned
  bone.visible = true;
  
  return bone;
}

// Legacy function for backward compatibility
function createBone(name: string, position: [number, number, number], size: [number, number, number]): THREE.Bone {
  const skinMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xffdbac,
    metalness: 0.0,
    roughness: 0.8,
    side: THREE.DoubleSide,
  });
  return createRealisticBone(name, position, size[0] / 2, size[1], skinMaterial);
}

function countBones(object: THREE.Object3D): number {
  let count = 0;
  object.traverse((child) => {
    if (child instanceof THREE.Bone) {
      count++;
    }
  });
  return count;
}

const AvatarRenderer: React.FC<AvatarRendererProps> = ({
  animationData,
  isLoading,
  modelPath, // e.g., require('./assets/avatar.glb') or local file URI
  avatarId, // ReadyPlayer.me avatar ID (e.g., '65a8dba831b23abb4f401bae')
  avatarQueryParams, // Optional query parameters (lod, textureAtlas, etc.)
}) => {
  const [hasError, setHasError] = useState(false);
  const [isDownloadingAvatar, setIsDownloadingAvatar] = useState(false);

  // Log when component renders
  useEffect(() => {
    console.log('AvatarRenderer: Component rendered', {
      hasAnimationData: !!animationData,
      isLoading,
      keyframesCount: animationData?.keyframes?.length || 0,
    });
  }, [animationData, isLoading]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.text}>Loading Avatar...</Text>
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>⚠️ Avatar Error</Text>
        <Text style={styles.subtext}>
          Using procedural avatar. Add a 3D model for better quality.
        </Text>
      </View>
    );
  }

  console.log('AvatarRenderer: Rendering Canvas with animationData', {
    hasAnimationData: !!animationData,
    duration: animationData?.duration,
  });

  return (
    <View style={styles.container}>
      <Canvas
        camera={{ position: [0, 1.8, 6], fov: 45 }}
        gl={{ 
          antialias: true, 
          alpha: false,
          powerPreference: "high-performance",
          stencil: false,
          depth: true,
          preserveDrawingBuffer: false
        }}
        dpr={[1, 2]}
        frameloop="always"
        onCreated={({ gl, scene, camera }) => {
          // Use dark background to match theme
          gl.setClearColor('#001C29', 1.0);
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
          
          // Look at the center where avatar should be (adjusted for better view)
          camera.lookAt(0, 1.2, 0);
          
          // Safely get GL info - gl.getParameter might not be available in expo-gl
          let glVersion = 'unknown';
          let canvasWidth = 0;
          let canvasHeight = 0;
          
          try {
            // Try to get GL version if available
            if (gl.getParameter && typeof gl.getParameter === 'function') {
              glVersion = gl.getParameter(gl.VERSION) || 'unknown';
            } else if (gl.getContext) {
              const context = gl.getContext();
              if (context && context.getParameter) {
                glVersion = context.getParameter(context.VERSION) || 'unknown';
              }
            }
            
            // Try to get canvas dimensions
            if (gl.domElement) {
              canvasWidth = gl.domElement.width || 0;
              canvasHeight = gl.domElement.height || 0;
            }
          } catch (error) {
            console.warn('AvatarRenderer: Could not get GL info:', error);
          }
          
          console.log('AvatarRenderer: Canvas created with enhanced rendering', {
            cameraPosition: camera.position,
            sceneChildren: scene.children.length,
            cameraLookAt: [0, 1.5, 0],
            glRenderer: glVersion,
            sceneObjects: scene.children.map(c => ({ name: c.name, type: c.type })),
            canvasWidth,
            canvasHeight,
            glType: gl.constructor?.name || typeof gl
          });
        }}>
        <Avatar 
          animationData={animationData} 
          modelPath={modelPath} 
          avatarId={avatarId}
          avatarQueryParams={avatarQueryParams}
        />
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          enableRotate={true}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.2}
          minDistance={3.0}
          maxDistance={7.0}
          target={[0, 1.2, 0]}
        />
      </Canvas>
      {animationData && (
        <View style={styles.infoOverlay}>
          <Text style={styles.infoText}>
            Duration: {animationData.duration?.toFixed(1)}s
            {animationData.keyframes && ` | ${animationData.keyframes.length} keyframes`}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#001C29', // Match dark theme background
    width: '100%',
    height: '100%',
  },
  text: {
    fontSize: 16,
    color: '#333',
    marginTop: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 18,
    color: COLORS.error,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  infoOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
    borderRadius: 8,
  },
  infoText: {
    color: '#FFF',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default AvatarRenderer;

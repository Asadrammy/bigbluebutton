import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { Canvas } from '@react-three/fiber/native';
import { OrbitControls } from '@react-three/drei/native';
import * as THREE from 'three';
import { COLORS } from '@utils/constants';

interface AvatarRendererProps {
  animationData?: {
    keyframes?: Array<{
      time: number;
      bone: string;
      position?: [number, number, number];
      rotation?: [number, number, number, number]; // quaternion
      scale?: [number, number, number];
    }>;
    tracks?: Record<string, any>;
    duration?: number;
  };
  isLoading?: boolean;
  modelPath?: string; // Path to GLB model
}

/**
 * 3D Human Avatar Component
 * Renders a realistic human character performing sign language gestures
 */
const Avatar: React.FC<{
  animationData?: AvatarRendererProps['animationData'];
  modelPath?: string;
}> = ({ animationData, modelPath }) => {
  const groupRef = useRef<THREE.Group>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const animationActionRef = useRef<THREE.AnimationAction | null>(null);
  
  // Try to load model, fallback to placeholder if not available
  let scene: THREE.Object3D | null = null;
  let skeleton: THREE.Skeleton | null = null;
  
  // Load 3D model if path provided
  // Note: Model loading in React Native requires the model to be bundled or served
  // For now, we'll use procedural avatar. To use a real model:
  // 1. Place GLB file in assets/models/
  // 2. Use require() to load it
  // 3. Implement GLTFLoader from three/examples/jsm/loaders/GLTFLoader
  
  // TODO: Implement model loading when you have a 3D model
  // const loader = new GLTFLoader();
  // loader.load(modelPath, (gltf) => {
  //   scene = gltf.scene;
  //   // Process skeleton...
  // });

  // Create procedural human if model not available
  if (!scene) {
    scene = createProceduralHuman();
  }

  useEffect(() => {
    if (!scene || !animationData?.keyframes) return;

    // Initialize animation mixer
    if (!mixerRef.current) {
      mixerRef.current = new THREE.AnimationMixer(scene);
    }

    const mixer = mixerRef.current;
    
    // Clear previous animation
    if (animationActionRef.current) {
      mixer.stopAllAction();
    }

    // Create animation clip from keyframes
    const tracks: THREE.KeyframeTrack[] = [];
    const boneMap = new Map<string, THREE.Bone>();

    // Build bone map
    scene.traverse((child) => {
      if (child instanceof THREE.Bone) {
        boneMap.set(child.name.toLowerCase(), child);
      }
      // Also check if it's a SkinnedMesh with skeleton
      if (child instanceof THREE.SkinnedMesh && child.skeleton) {
        child.skeleton.bones.forEach((bone) => {
          boneMap.set(bone.name.toLowerCase(), bone);
        });
      }
    });

    // Group keyframes by bone
    const boneKeyframes = new Map<string, Array<{
      time: number;
      position?: [number, number, number];
      rotation?: [number, number, number, number];
    }>>();

    animationData.keyframes.forEach((kf) => {
      const boneName = kf.bone.toLowerCase();
      if (!boneKeyframes.has(boneName)) {
        boneKeyframes.set(boneName, []);
      }
      boneKeyframes.get(boneName)!.push({
        time: kf.time,
        position: kf.position,
        rotation: kf.rotation,
      });
    });

    // Create tracks for each bone
    boneKeyframes.forEach((keyframes, boneName) => {
      const bone = boneMap.get(boneName);
      if (!bone) {
        // Try alternative bone names
        const alternatives = [
          boneName.replace('left', 'Left').replace('right', 'Right'),
          boneName.replace('hand', 'Hand').replace('arm', 'Arm'),
          `mixamorig_${boneName}`,
        ];
        for (const alt of alternatives) {
          const altBone = boneMap.get(alt);
          if (altBone) {
            boneMap.set(boneName, altBone);
            break;
          }
        }
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

        const positionTrack = new THREE.VectorKeyframeTrack(
          `${boneName}.position`,
          times,
          values
        );
        tracks.push(positionTrack);
      }

      // Rotation track (quaternion)
      const rotationKeyframes = keyframes.filter((kf) => kf.rotation);
      if (rotationKeyframes.length > 0) {
        const times = rotationKeyframes.map((kf) => kf.time);
        const values: number[] = [];
        rotationKeyframes.forEach((kf) => {
          if (kf.rotation) {
            values.push(...kf.rotation);
          }
        });

        const rotationTrack = new THREE.QuaternionKeyframeTrack(
          `${boneName}.quaternion`,
          times,
          values
        );
        tracks.push(rotationTrack);
      }
    });

    if (tracks.length > 0) {
      const duration = animationData.duration || 1.0;
      const clip = new THREE.AnimationClip('signAnimation', duration, tracks);
      
      // Create and play animation
      const action = mixer.clipAction(clip);
      action.play();
      animationActionRef.current = action;
    }

    // Animation loop
    let frameId: number;
    const clock = new THREE.Clock();
    
    const animate = () => {
      if (mixerRef.current) {
        mixerRef.current.update(clock.getDelta());
      }
      frameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      if (animationActionRef.current) {
        mixer.stopAllAction();
      }
    };
  }, [animationData, scene]);

  return (
    <group ref={groupRef}>
      {scene && <primitive object={scene} />}
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
      <pointLight position={[-5, 5, -5]} intensity={0.5} />
    </group>
  );
};

/**
 * Create a basic procedural human skeleton for testing
 * This is a fallback when no 3D model is available
 */
function createProceduralHuman(): THREE.Group {
  const group = new THREE.Group();

  // Body (torso)
  const bodyGeometry = new THREE.BoxGeometry(0.8, 1.2, 0.4);
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xffdbac }); // Skin tone
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.set(0, 1.0, 0);
  body.name = 'body';
  group.add(body);

  // Head
  const headGeometry = new THREE.SphereGeometry(0.3, 32, 32);
  const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffdbac });
  const head = new THREE.Mesh(headGeometry, headMaterial);
  head.position.set(0, 2.0, 0);
  head.name = 'head';
  group.add(head);

  // Left arm
  const leftUpperArm = createBone('leftUpperArm', [-0.5, 1.5, 0], [0.2, 0.5, 0.2]);
  const leftLowerArm = createBone('leftLowerArm', [-0.5, 1.0, 0], [0.15, 0.5, 0.15]);
  const leftHand = createBone('leftHand', [-0.5, 0.6, 0], [0.12, 0.12, 0.12]);
  leftUpperArm.add(leftLowerArm);
  leftLowerArm.add(leftHand);
  body.add(leftUpperArm);

  // Right arm
  const rightUpperArm = createBone('rightUpperArm', [0.5, 1.5, 0], [0.2, 0.5, 0.2]);
  const rightLowerArm = createBone('rightLowerArm', [0.5, 1.0, 0], [0.15, 0.5, 0.15]);
  const rightHand = createBone('rightHand', [0.5, 0.6, 0], [0.12, 0.12, 0.12]);
  rightUpperArm.add(rightLowerArm);
  rightLowerArm.add(rightHand);
  body.add(rightUpperArm);

  return group;
}

function createBone(name: string, position: [number, number, number], size: [number, number, number]): THREE.Bone {
  const bone = new THREE.Bone();
  bone.name = name;
  bone.position.set(...position);
  
  // Add visual representation
  const geometry = new THREE.BoxGeometry(...size);
  const material = new THREE.MeshStandardMaterial({ color: 0xffdbac });
  const mesh = new THREE.Mesh(geometry, material);
  bone.add(mesh);
  
  return bone;
}

const AvatarRenderer: React.FC<AvatarRendererProps> = ({
  animationData,
  isLoading,
  modelPath, // e.g., require('./assets/avatar.glb')
}) => {
  const [hasError, setHasError] = useState(false);

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

  return (
    <View style={styles.container}>
      <Canvas
        camera={{ position: [0, 1.6, 2.5], fov: 50 }}
        gl={{ antialias: true }}
        onCreated={({ gl }) => {
          gl.setClearColor('#E8E8E8');
        }}>
        <Avatar animationData={animationData} modelPath={modelPath} />
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 2.2}
          target={[0, 1.0, 0]}
        />
      </Canvas>
      {animationData && (
        <View style={styles.infoOverlay}>
          <Text style={styles.infoText}>
            Duration: {animationData.duration?.toFixed(1)}s
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8E8E8',
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

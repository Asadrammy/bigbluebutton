import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { Canvas } from '@react-three/fiber/native';
import { OrbitControls } from '@react-three/drei/native';
import * as THREE from 'three';
import { COLORS } from '@utils/constants';
import { AnimationData } from '../types';

interface AvatarRendererProps {
  animationData?: AnimationData;
  isLoading?: boolean;
}

/**
 * Simple Realistic Human Avatar Component
 * Creates a procedural 3D human figure without requiring GLB files
 * Similar to WhatsApp-style realistic avatar
 */
function HumanAvatar({ animationData }: { animationData?: AnimationData }) {
  const groupRef = useRef<THREE.Group>(null);

  // Apply animation data if available (simplified version)
  useEffect(() => {
    if (animationData && animationData.keyframes && groupRef.current) {
      // Simple animation application could go here
      // For now, just show the avatar in idle state
    }
  }, [animationData]);

  return (
    <group ref={groupRef}>
      {/* Head - more realistic proportions */}
      <mesh position={[0, 1.6, 0]}>
        <sphereGeometry args={[0.22, 32, 32]} />
        <meshStandardMaterial 
          color="#fdbcb4" 
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Neck */}
      <mesh position={[0, 1.35, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 0.15, 16]} />
        <meshStandardMaterial color="#fdbcb4" />
      </mesh>

      {/* Torso - more realistic shape */}
      <mesh position={[0, 0.95, 0]}>
        <boxGeometry args={[0.45, 0.65, 0.22]} />
        <meshStandardMaterial 
          color="#2d3748" 
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>

      {/* Left Shoulder */}
      <mesh position={[-0.25, 1.2, 0]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#fdbcb4" />
      </mesh>

      {/* Left Upper Arm */}
      <mesh position={[-0.32, 1.05, 0]} rotation={[0, 0, 0.25]}>
        <cylinderGeometry args={[0.06, 0.06, 0.4, 16]} />
        <meshStandardMaterial color="#fdbcb4" />
      </mesh>

      {/* Left Elbow */}
      <mesh position={[-0.5, 0.85, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#fdbcb4" />
      </mesh>

      {/* Left Lower Arm */}
      <mesh position={[-0.55, 0.7, 0]} rotation={[0, 0, 0.4]}>
        <cylinderGeometry args={[0.06, 0.05, 0.35, 16]} />
        <meshStandardMaterial color="#fdbcb4" />
      </mesh>

      {/* Left Hand */}
      <mesh position={[-0.65, 0.5, 0]}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshStandardMaterial color="#fdbcb4" />
      </mesh>

      {/* Right Shoulder */}
      <mesh position={[0.25, 1.2, 0]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#fdbcb4" />
      </mesh>

      {/* Right Upper Arm */}
      <mesh position={[0.32, 1.05, 0]} rotation={[0, 0, -0.25]}>
        <cylinderGeometry args={[0.06, 0.06, 0.4, 16]} />
        <meshStandardMaterial color="#fdbcb4" />
      </mesh>

      {/* Right Elbow */}
      <mesh position={[0.5, 0.85, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#fdbcb4" />
      </mesh>

      {/* Right Lower Arm */}
      <mesh position={[0.55, 0.7, 0]} rotation={[0, 0, -0.4]}>
        <cylinderGeometry args={[0.06, 0.05, 0.35, 16]} />
        <meshStandardMaterial color="#fdbcb4" />
      </mesh>

      {/* Right Hand */}
      <mesh position={[0.65, 0.5, 0]}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshStandardMaterial color="#fdbcb4" />
      </mesh>

      {/* Left Upper Leg */}
      <mesh position={[-0.15, 0.5, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.5, 16]} />
        <meshStandardMaterial color="#2d3748" />
      </mesh>

      {/* Left Lower Leg */}
      <mesh position={[-0.15, 0.1, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.4, 16]} />
        <meshStandardMaterial color="#2d3748" />
      </mesh>

      {/* Right Upper Leg */}
      <mesh position={[0.15, 0.5, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.5, 16]} />
        <meshStandardMaterial color="#2d3748" />
      </mesh>

      {/* Right Lower Leg */}
      <mesh position={[0.15, 0.1, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.4, 16]} />
        <meshStandardMaterial color="#2d3748" />
      </mesh>

      {/* Ground grid - subtle */}
      <gridHelper args={[4, 8, '#2a2a3e', '#1a1a2e']} position={[0, -0.2, 0]} />
    </group>
  );
}

/**
 * Simple Avatar Renderer Component
 * Renders a procedural 3D human avatar without GLB dependencies
 */
const AvatarRendererSimple: React.FC<AvatarRendererProps> = ({
  animationData,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading avatar...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Canvas
        camera={{ position: [0, 1.2, 2.5], fov: 50 }}
        style={styles.canvas}
        gl={{ antialias: true, alpha: true }}
      >
        {/* Lighting - more realistic */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 5, 3]} intensity={1.0} castShadow />
        <directionalLight position={[-3, 3, -2]} intensity={0.5} />
        <pointLight position={[0, 4, 2]} intensity={0.4} />

        {/* Avatar */}
        <HumanAvatar animationData={animationData} />

        {/* Camera controls */}
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 1.5}
        />
      </Canvas>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1a2e',
  },
  canvas: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  loadingText: {
    marginTop: 16,
    color: '#fff',
    fontSize: 16,
  },
});

export default AvatarRendererSimple;
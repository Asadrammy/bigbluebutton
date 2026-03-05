'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Html, useGLTF } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { AnimationData, Keyframe } from '@/lib/api/types';
import { Group, Object3D, Quaternion, Vector3 } from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { GLTF } from 'three-stdlib';

type AvatarViewerProps = {
  animation?: AnimationData | null;
};

type BoneFrame = Required<Keyframe['bones']>[number] & { time: number };

type BoneTimeline = {
  bone: string;
  frames: BoneFrame[];
};

type Timeline = {
  duration: number;
  bones: Record<string, BoneTimeline>;
};

const AVATAR_URL = 'https://threejs.org/examples/models/gltf/Soldier.glb';

type RiggedAvatarProps = {
  timeline: Timeline | null;
  isPlaying: boolean;
  playbackSpeed: number;
  seekTime: number | null;
  onSeekConsumed: () => void;
  onFrameReport: (time: number) => void;
};

function RiggedAvatar({
  timeline,
  isPlaying,
  playbackSpeed,
  seekTime,
  onSeekConsumed,
  onFrameReport,
}: RiggedAvatarProps) {
  const gltf = useGLTF(AVATAR_URL) as unknown as GLTF;
  const clonedScene = useMemo<Group>(() => SkeletonUtils.clone(gltf.scene) as Group, [gltf.scene]);
  const groupRef = useRef<Group>(null);
  const boneMap = useMemo(() => {
    const map = new Map<string, Object3D>();
    clonedScene.traverse((child) => {
      if (child.type === 'Bone') {
        map.set(child.name.toLowerCase(), child);
      }
    });
    return map;
  }, [clonedScene]);

  const tmpVec = useMemo(() => new Vector3(), []);
  const tmpQuat = useMemo(() => new Quaternion(), []);
  const nextQuat = useMemo(() => new Quaternion(), []);
  const prevQuat = useMemo(() => new Quaternion(), []);
  const playheadRef = useRef(0);
  const seekRef = useRef<number | null>(null);
  const reportAccumulator = useRef(0);

  useEffect(() => {
    seekRef.current = seekTime;
    if (seekTime !== null) {
      onSeekConsumed();
    }
  }, [seekTime, onSeekConsumed]);

  useFrame((_, delta) => {
    if (!timeline || boneMap.size === 0) return;
    const duration = timeline.duration || 1;
    if (seekRef.current !== null) {
      playheadRef.current = Math.max(0, Math.min(seekRef.current, duration));
      seekRef.current = null;
    } else if (isPlaying) {
      playheadRef.current = (playheadRef.current + delta * playbackSpeed + duration) % duration;
    }
    const localTime = playheadRef.current;

    Object.entries(timeline.bones).forEach(([boneName, boneTimeline]) => {
      const bone = boneMap.get(boneName);
      if (!bone || boneTimeline.frames.length === 0) return;
      const frames = boneTimeline.frames;
      const nextIndex = frames.findIndex((frame) => frame.time > localTime);
      const targetIndex = nextIndex === -1 ? frames.length - 1 : Math.max(0, nextIndex - 1);
      const nextFrame = nextIndex === -1 ? frames[frames.length - 1] : frames[nextIndex];
      const prevFrame = frames[targetIndex];
      const span = Math.max(nextFrame.time - prevFrame.time, 0.0001);
      const progress = Math.min(Math.max((localTime - prevFrame.time) / span, 0), 1);

      if (prevFrame.position && nextFrame.position) {
        for (let i = 0; i < 3; i += 1) {
          tmpVec.setComponent(
            i,
            prevFrame.position[i] + (nextFrame.position[i] - prevFrame.position[i]) * progress,
          );
        }
        bone.position.copy(tmpVec);
      }

      if (prevFrame.rotation && nextFrame.rotation) {
        prevQuat.set(...prevFrame.rotation);
        nextQuat.set(...nextFrame.rotation);
        tmpQuat.copy(prevQuat).slerp(nextQuat, progress);
        bone.quaternion.copy(tmpQuat);
      }

      if (prevFrame.scale && nextFrame.scale) {
        for (let i = 0; i < 3; i += 1) {
          tmpVec.setComponent(
            i,
            prevFrame.scale[i] + (nextFrame.scale[i] - prevFrame.scale[i]) * progress,
          );
        }
        bone.scale.copy(tmpVec);
      }
    });

    reportAccumulator.current += delta;
    if (reportAccumulator.current >= 0.15) {
      reportAccumulator.current = 0;
      onFrameReport(localTime);
    }
  });

  return <primitive ref={groupRef} object={clonedScene} position={[0, -1.25, 0]} scale={1.2} />;
}

function buildTimeline(animation?: AnimationData | null): Timeline | null {
  if (!animation?.keyframes?.length) return null;
  const bones: Record<string, BoneTimeline> = {};

  animation.keyframes.forEach((keyframe: Keyframe) => {
    keyframe.bones?.forEach((boneFrame) => {
      const key = boneFrame.name.toLowerCase();
      if (!bones[key]) {
        bones[key] = { bone: key, frames: [] };
      }
      bones[key].frames.push({
        name: boneFrame.name,
        position: boneFrame.position,
        rotation: boneFrame.rotation,
        scale: boneFrame.scale,
        time: keyframe.time,
      });
    });
  });

  Object.values(bones).forEach((timeline) => {
    timeline.frames.sort((a, b) => a.time - b.time);
  });

  const duration = animation.duration || Math.max(...animation.keyframes.map((kf) => kf.time));
  return { duration: Math.max(duration, 0.1), bones };
}

export function AvatarViewer({ animation }: AvatarViewerProps) {
  const timeline = useMemo(() => buildTimeline(animation), [animation]);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [playhead, setPlayhead] = useState(0);
  const [pendingSeek, setPendingSeek] = useState<number | null>(null);

  useEffect(() => {
    setPlayhead(0);
    setPendingSeek(0);
  }, [timeline]);

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-dark-primary/40 p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="font-semibold text-gray-900 dark:text-white">Avatar preview</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying((prev) => !prev)}
            disabled={!timeline}
            className="rounded-full border border-gray-300 dark:border-gray-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-white disabled:opacity-40"
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <label className="flex items-center gap-1 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Speed
            <select
              className="rounded-full border border-gray-200 dark:border-gray-600 bg-transparent px-2 py-1 text-xs"
              value={playbackSpeed}
              disabled={!timeline}
              onChange={(event) => setPlaybackSpeed(Number(event.target.value))}
            >
              {[0.5, 1, 1.5, 2].map((value) => (
                <option key={value} value={value}>
                  {value.toFixed(1)}x
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="h-80 w-full overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-black/60">
        <Canvas>
          <color attach="background" args={[0.02, 0.02, 0.04]} />
          <PerspectiveCamera makeDefault position={[2, 2, 4]} />
          <ambientLight intensity={0.8} />
          <directionalLight position={[3, 5, 2]} intensity={1} />
          <Suspense fallback={<Html center>Loading viewer…</Html>}>
            {timeline ? (
              <RiggedAvatar
                timeline={timeline}
                isPlaying={isPlaying}
                playbackSpeed={playbackSpeed}
                seekTime={pendingSeek}
                onSeekConsumed={() => setPendingSeek(null)}
                onFrameReport={setPlayhead}
              />
            ) : (
              <Html center>Feed me animation data</Html>
            )}
          </Suspense>
          <OrbitControls enablePan={false} />
        </Canvas>
      </div>

      <div className="space-y-2">
        <input
          type="range"
          min={0}
          max={timeline?.duration ?? 1}
          step={0.01}
          value={playhead}
          disabled={!timeline}
          onChange={(event) => {
            const value = Number(event.target.value);
            setPendingSeek(value);
            setPlayhead(value);
          }}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{playhead.toFixed(2)}s</span>
          <span>{timeline ? `${timeline.duration.toFixed(2)}s total` : 'Awaiting animation'}</span>
        </div>
      </div>
    </div>
  );
}

useGLTF.preload(AVATAR_URL);

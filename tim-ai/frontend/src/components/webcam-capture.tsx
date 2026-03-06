'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type WebcamCaptureProps = {
  onCaptureComplete: (frames: string[]) => Promise<void> | void;
  intervalMs?: number;
  maxFrames?: number;
  disabled?: boolean;
  className?: string;
  onError?: (message: string | null) => void;
  onRecordingChange?: (isRecording: boolean) => void;
};

const DEFAULT_INTERVAL = 250;
const DEFAULT_MAX_FRAMES = 48;

export function WebcamCapture({
  onCaptureComplete,
  intervalMs = DEFAULT_INTERVAL,
  maxFrames = DEFAULT_MAX_FRAMES,
  disabled = false,
  className,
  onError,
  onRecordingChange,
}: WebcamCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const captureIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const framesRef = useRef<string[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const [frameCount, setFrameCount] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    async function initCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        setStreamError(null);
        onError?.(null);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('[WebcamCapture] getUserMedia failed', error);
        const message = 'Camera permission denied. Please enable camera access.';
        setStreamError(message);
        onError?.(message);
      } finally {
        setIsInitializing(false);
      }
    }

    initCamera();

    return () => {
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
      }
      framesRef.current = [];
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canRecord = useMemo(() => !disabled && !streamError && !isInitializing, [disabled, streamError, isInitializing]);


  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;

    framesRef.current = [...framesRef.current.slice(-(maxFrames - 1)), base64];
    setFrameCount(framesRef.current.length);
  };

  const startRecording = () => {
    if (!canRecord || isRecording) return;
    framesRef.current = [];
    setFrameCount(0);
    setStreamError(null);
    onError?.(null);
    setIsRecording(true);
    onRecordingChange?.(true);
    captureIntervalRef.current = setInterval(captureFrame, intervalMs);
  };

  const stopRecording = async () => {
    if (!isRecording) return;
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
    setIsRecording(false);
    onRecordingChange?.(false);

    if (framesRef.current.length === 0) {
      const message = 'No frames captured. Please try again.';
      setStreamError(message);
      onError?.(message);
      return;
    }

    const frames = [...framesRef.current];
    framesRef.current = [];
    setFrameCount(0);
    onError?.(null);
    await onCaptureComplete(frames);
  };

  return (
    <div
      className={cn(
        'space-y-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-black/80 p-4',
        className,
      )}
    >
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
        {streamError ? (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-red-400">
            {streamError}
          </div>
        ) : (
          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-400">
        <div>
          {isInitializing && 'Initializing camera…'}
          {!isInitializing && streamError && 'Camera unavailable.'}
          {!isInitializing && !streamError && `Frames buffered: ${frameCount}`}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={startRecording}
            disabled={!canRecord || isRecording}
            className="rounded-full bg-primary-500 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white disabled:opacity-50"
          >
            {isRecording ? 'Recording…' : 'Start Recording'}
          </button>
          <button
            type="button"
            onClick={stopRecording}
            disabled={!isRecording || disabled}
            className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white disabled:opacity-50"
          >
            Stop & Send
          </button>
        </div>
      </div>
    </div>
  );
}

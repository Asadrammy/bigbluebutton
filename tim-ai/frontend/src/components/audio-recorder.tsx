'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type AudioRecorderProps = {
  onAudioReady: (base64Audio: string) => Promise<void> | void;
  disabled?: boolean;
  className?: string;
  onError?: (message: string | null) => void;
  onRecordingChange?: (isRecording: boolean) => void;
};

export function AudioRecorder({ onAudioReady, disabled = false, className, onError, onRecordingChange }: AudioRecorderProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [streamError, setStreamError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      const message = 'This browser does not support audio recording. Please use the latest Chromium-based browser.';
      setStreamError(message);
      onError?.(message);
      setIsInitializing(false);
      return;
    }

    setIsInitializing(false);

    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      onRecordingChange?.(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canRecord = useMemo(() => !disabled && !streamError && !isInitializing, [disabled, streamError, isInitializing]);

  const handleRecorderStop = () => {
    const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      onError?.(null);
      await onAudioReady(base64);
    };
    reader.readAsDataURL(blob);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    onRecordingChange?.(false);
  };

  const startRecording = async () => {
    if (!canRecord || isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = handleRecorderStop;

      recorder.start();
      setIsRecording(true);
      setStreamError(null);
      onError?.(null);
      onRecordingChange?.(true);
    } catch (error) {
      console.error('[AudioRecorder] getUserMedia failed', error);
      const message = 'Microphone permission denied. Please enable access and try again.';
      setStreamError(message);
      onError?.(message);
    }
  };

  const stopRecording = () => {
    if (!isRecording || !mediaRecorderRef.current) return;
    setIsRecording(false);
    mediaRecorderRef.current.stop();
    onRecordingChange?.(false);
  };

  return (
    <div className={cn('rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-white/70 dark:bg-dark-primary/50 p-6', className)}>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recorder</h2>
      <p className="text-xs uppercase tracking-wide text-gray-400">
        {isInitializing
          ? 'Initializing microphone…'
          : streamError
          ? streamError
          : isRecording
          ? 'Recording in progress'
          : 'Ready to capture audio'}
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={startRecording}
          disabled={!canRecord || isRecording}
          className="px-4 py-2 rounded-full bg-primary-500 text-white text-sm font-medium disabled:opacity-60"
        >
          {isRecording ? 'Recording…' : 'Start Recording'}
        </button>
        <button
          type="button"
          onClick={stopRecording}
          disabled={!isRecording}
          className="px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 text-sm font-medium disabled:opacity-60"
        >
          Stop & Send
        </button>
      </div>
    </div>
  );
}

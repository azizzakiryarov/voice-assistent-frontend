import React, { useState, useRef } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';

interface VoiceRecorderProps {
  onRecordingComplete: (audioUrl: string) => void;
}

export function VoiceRecorder({ onRecordingComplete }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      chunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        chunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = () => {
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(blob);
        onRecordingComplete(audioUrl);
      };

      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  return (
    <button
      onClick={isRecording ? stopRecording : startRecording}
      className={`p-3 rounded-full transition-colors ${
        isRecording
          ? 'bg-red-500 hover:bg-red-600'
          : 'bg-blue-500 hover:bg-blue-600'
      }`}
    >
      {isRecording ? (
        <Square className="w-6 h-6 text-white" />
      ) : (
        <Mic className="w-6 h-6 text-white" />
      )}
    </button>
  );
}
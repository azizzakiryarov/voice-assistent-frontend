import React, { useState, useRef } from 'react';
import { Mic, Square } from 'lucide-react';
import { uploadVoiceRecording } from '../api.js';

export function VoiceRecorder({ onRecordingComplete, onTranscriptionReceived, onEmailDetected }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorder = useRef(null);
  const chunks = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      chunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        chunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = async () => {
        setIsProcessing(true);
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(blob);

        try {
          // Skicka filen för transkribering och email-extrahering
          const response = await uploadVoiceRecording(blob);
          
          // Hantera den utökade responsen
          if (response.transcription) {
            onTranscriptionReceived(response.transcription);
          }
          
          if (response.extractedEmail) {
            onEmailDetected(response.extractedEmail);
          }
          
          // För kompatibilitet med befintlig kod
          onRecordingComplete(audioUrl);
        } catch (uploadError) {
          console.error('Error uploading recording:', uploadError);
        } finally {
          setIsProcessing(false);
        }
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
      disabled={isProcessing}
      className={`p-3 rounded-full transition-colors ${
        isProcessing ? 'bg-gray-400 cursor-not-allowed' :
        isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
      }`}
    >
      {isProcessing ? (
        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      ) : isRecording ? (
        <Square className="w-6 h-6 text-white" />
      ) : (
        <Mic className="w-6 h-6 text-white" />
      )}
    </button>
  );
}
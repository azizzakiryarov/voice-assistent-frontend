import { useEffect, useState, useRef } from 'react';
import { Mic, Square, AlertCircle } from 'lucide-react';
import { uploadVoiceRecording } from '../api.js';

export function VoiceRecorder({ onRecordingComplete, onTranscriptionReceived, onEmailDetected }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(true);
  const mediaRecorder = useRef(null);
  const mediaStream = useRef(null);
  const chunks = useRef([]);

  // Kontrollera support vid första renderingen
  useEffect(() => {
    const checkSupport = () => {
      if (typeof window === 'undefined' || !navigator.mediaDevices) {
        setError('MediaDevices API inte tillgängligt');
        setIsSupported(false);
        return false;
      }
      
      if (!navigator.mediaDevices.getUserMedia) {
        setError('getUserMedia inte tillgängligt');
        setIsSupported(false);
        return false;
      }
      
      if (typeof MediaRecorder === 'undefined') {
        setError('MediaRecorder inte tillgängligt i denna webbläsare');
        setIsSupported(false);
        return false;
      }
      
      // Kontrollera om vi kör i en säker kontext
      const isSecure = window.isSecureContext ||
        location.hostname === 'localhost' ||
        location.hostname === '127.0.0.1' ||
        location.hostname === '::1';
      
      if (!isSecure) {
        setError('Mikrofon kräver HTTPS eller localhost');
        setIsSupported(false);
        return false;
      }
      
      return true;
    };

    checkSupport();
  }, []);

  useEffect(() => {
    return () => {
      if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
        mediaRecorder.current.stop();
      }

      if (mediaStream.current) {
        mediaStream.current.getTracks().forEach(track => track.stop());
        mediaStream.current = null;
      }
    };
  }, []);

  const startRecording = async () => {
    if (!isSupported) {
      return;
    }

    setError(null);
    
    try {
      console.log('Försöker få tillgång till mikrofon...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      mediaStream.current = stream;
      
      console.log('Mikrofon tillgång beviljad');
      
      const preferredMimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';

      if (!preferredMimeType) {
        throw new Error('Ingen stödd ljudcodec hittades');
      }

      mediaRecorder.current = new MediaRecorder(stream, {
        mimeType: preferredMimeType
      });
      
      chunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.current.push(e.data);
        }
      };

      mediaRecorder.current.onstop = async () => {
        console.log('Inspelning stoppad, processerar...');
        setIsProcessing(true);

        const mimeType = mediaRecorder.current?.mimeType || chunks.current[0]?.type || 'audio/webm';
        const blob = new Blob(chunks.current, { type: mimeType });
        const audioUrl = URL.createObjectURL(blob);

        console.log('Blob skapad:', blob.size, 'bytes');

        try {
          // Skicka filen för transkribering och email-extrahering
          const response = await uploadVoiceRecording(blob);
          
          console.log('Upload response:', response);
          
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
          setError(uploadError.response?.data?.message || 'Kunde inte ladda upp inspelning');
        } finally {
          setIsProcessing(false);
        }
      };

      mediaRecorder.current.onerror = (e) => {
        console.error('MediaRecorder error:', e);
        setError('Inspelningsfel');
        setIsRecording(false);
      };

      mediaRecorder.current.start(1000); // Samla data varje sekund
      setIsRecording(true);
      console.log('Inspelning startad');
      
    } catch (err) {
      console.error('Error accessing microphone:', err);
      
      let errorMessage = 'Kunde inte få tillgång till mikrofon';
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Mikrofon nekad. Tillåt i webbläsaren och försök igen.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'Ingen mikrofon hittades';
      } else if (err.name === 'NotSupportedError') {
        errorMessage = 'Mikrofon stödjs inte';
      } else if (err.name === 'SecurityError') {
        errorMessage = 'Säkerhetsfel - använd HTTPS eller localhost';
      }
      
      setError(errorMessage);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      console.log('Stoppar inspelning...');
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="flex flex-col items-center gap-2">
        <button
          disabled
          className="p-3 rounded-full bg-gray-400 cursor-not-allowed"
        >
          <AlertCircle className="w-6 h-6 text-white" />
        </button>
        <p className="text-sm text-red-500 text-center max-w-xs">
          {error}
        </p>
        <p className="text-xs text-gray-500 text-center max-w-xs">
          Nuvarande URL: {location.protocol}//{location.host}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
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
      
      {error && (
        <p className="text-sm text-red-500 text-center max-w-xs">
          {error}
        </p>
      )}
      
      {isRecording && (
        <p className="text-sm text-green-600 text-center">
          🔴 Spelar in...
        </p>
      )}
    </div>
  );
}

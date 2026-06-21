import { useEffect, useState, useRef } from 'react';
import { Mic, Square, AlertCircle, Timer } from 'lucide-react';
import { uploadVoiceRecording, VOICE_RECORDING_TIMEOUT_MS } from '../api.js';

const VOICE_LANGUAGE_OPTIONS = [
  { value: 'sv', label: 'SV', title: 'Svenska' },
  { value: 'ru', label: 'RU', title: 'Ryska' },
  { value: 'en', label: 'EN', title: 'Engelska' },
  { value: 'auto', label: 'Auto', title: 'Automatisk' },
];

const normalizeVoiceLanguage = (value) => (
  VOICE_LANGUAGE_OPTIONS.some(option => option.value === value) ? value : 'sv'
);

const formatDuration = (milliseconds) => {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
};

export function VoiceRecorder({ onRecordingComplete, onPreviewReceived }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStartedAt, setProcessingStartedAt] = useState(null);
  const [processingRemainingMs, setProcessingRemainingMs] = useState(VOICE_RECORDING_TIMEOUT_MS);
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(true);
  const [voiceLanguage, setVoiceLanguage] = useState(() => {
    try {
      return normalizeVoiceLanguage(window.localStorage?.getItem('voice-assistant-language'));
    } catch {
      return 'sv';
    }
  });
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
    if (!isProcessing || !processingStartedAt) {
      return undefined;
    }

    const updateRemainingTime = () => {
      setProcessingRemainingMs(Math.max(0, VOICE_RECORDING_TIMEOUT_MS - (Date.now() - processingStartedAt)));
    };

    updateRemainingTime();
    const intervalId = window.setInterval(updateRemainingTime, 1000);
    return () => window.clearInterval(intervalId);
  }, [isProcessing, processingStartedAt]);

  const updateVoiceLanguage = (language) => {
    const normalizedLanguage = normalizeVoiceLanguage(language);
    setVoiceLanguage(normalizedLanguage);
    try {
      window.localStorage?.setItem('voice-assistant-language', normalizedLanguage);
    } catch {
      // localStorage can be unavailable in private contexts.
    }
  };

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
        const processingStart = Date.now();
        setProcessingStartedAt(processingStart);
        setProcessingRemainingMs(VOICE_RECORDING_TIMEOUT_MS);
        setIsProcessing(true);

        const mimeType = mediaRecorder.current?.mimeType || chunks.current[0]?.type || 'audio/webm';
        const blob = new Blob(chunks.current, { type: mimeType });
        const audioUrl = URL.createObjectURL(blob);

        console.log('Blob skapad:', blob.size, 'bytes');

        try {
          // Skicka filen för transkribering och email-extrahering
          const response = await uploadVoiceRecording(blob, voiceLanguage);
          
          console.log('Upload response:', response);
          
          onPreviewReceived(response);
          
          // För kompatibilitet med befintlig kod
          onRecordingComplete(audioUrl);
        } catch (uploadError) {
          console.error('Error uploading recording:', uploadError);
          const isTimeout = uploadError.code === 'ECONNABORTED';
          setError(
            uploadError.response?.data?.message ||
            (isTimeout ? 'Röstanalysen tog för lång tid. Försök med en kortare inspelning.' : 'Kunde inte analysera inspelningen')
          );
        } finally {
          setIsProcessing(false);
          setProcessingStartedAt(null);
          setProcessingRemainingMs(VOICE_RECORDING_TIMEOUT_MS);
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

  const processingProgressPercent = Math.max(
    0,
    Math.min(100, (processingRemainingMs / VOICE_RECORDING_TIMEOUT_MS) * 100)
  );

  if (!isSupported) {
    return (
      <div className="flex flex-col items-center gap-2">
        <button
          disabled
          className="flex h-11 w-11 items-center justify-center rounded-lg bg-zinc-300 cursor-not-allowed"
        >
          <AlertCircle className="w-6 h-6 text-white" />
        </button>
        <p className="text-sm text-rose-600 text-center max-w-xs">
          {error}
        </p>
        <p className="text-xs text-zinc-500 text-center max-w-xs">
          Nuvarande URL: {location.protocol}//{location.host}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        <div className="flex h-11 items-center rounded-lg border border-zinc-200 bg-white p-1 shadow-sm">
          {VOICE_LANGUAGE_OPTIONS.map(option => (
            <button
              key={option.value}
              type="button"
              title={option.title}
              aria-pressed={voiceLanguage === option.value}
              onClick={() => updateVoiceLanguage(option.value)}
              disabled={isRecording || isProcessing}
              className={`h-8 min-w-9 rounded-md px-2 text-xs font-medium transition-colors ${
                voiceLanguage === option.value
                  ? 'bg-zinc-950 text-white'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950'
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          className={`flex h-11 w-11 items-center justify-center rounded-lg shadow-sm transition-colors ${
            isProcessing ? 'bg-zinc-300 cursor-not-allowed' :
            isRecording ? 'bg-rose-600 hover:bg-rose-700' : 'bg-teal-600 hover:bg-teal-700'
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
      </div>
      
      {error && (
        <p className="text-sm text-rose-600 text-center max-w-xs">
          {error}
        </p>
      )}

      {isProcessing && (
        <div className="w-full max-w-xs rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-700 shadow-sm" aria-live="polite">
          <div className="flex items-center justify-center gap-2 text-sm">
            <Timer className="h-4 w-4 text-teal-700" />
            <span>
              Väntar på svar:{' '}
              <span className="font-medium tabular-nums">{formatDuration(processingRemainingMs)}</span> kvar
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
            <div
              className="h-full rounded-full bg-teal-600 transition-[width] duration-500"
              style={{ width: `${processingProgressPercent}%` }}
            />
          </div>
        </div>
      )}
      
      {isRecording && (
        <p className="text-sm text-teal-700 text-center">
          🔴 Spelar in...
        </p>
      )}
    </div>
  );
}

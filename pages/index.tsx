import React, { useState, useRef, useEffect } from 'react';
import Image from "next/image";
import { Geist, Geist_Mono } from "next/font/google";
import { FaMicrophone } from 'react-icons/fa'; // Import microphone icon
import { AiOutlineLoading3Quarters } from 'react-icons/ai'; // Import loading icon

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null); // New state for audio URL
  const [meetingMinutes, setMeetingMinutes] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for file input

  // Effect to create and revoke object URL for audio playback
  useEffect(() => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setAudioUrl(null);
    }
  }, [audioBlob]);

  const startRecording = async () => {
    try {
      setAudioBlob(null); // Clear any previously uploaded/recorded audio
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        setIsRecording(false);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setError(null);
      setMeetingMinutes('');
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Could not start recording. Please check microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const uploadedFile = event.target.files[0];
      setAudioBlob(uploadedFile); // Set the uploaded file as the audioBlob
      setError(null);
      setMeetingMinutes(''); // Clear previous minutes
      setIsRecording(false); // Ensure recording state is off
    }
  };

  const sendAudioForMinutes = async () => {
    if (!audioBlob) {
      setError('No audio recorded or uploaded to send.');
      return;
    }

    setIsLoading(true);
    setError(null);

    // Forzar render antes de operaciones pesadas
    await new Promise(r => setTimeout(r, 0));

    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;

        const response = await fetch('/api/generate-minutes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ audioData: base64Audio }),
        });

        if (!response.ok) {
          const contentType = response.headers.get('Content-Type');
          let errorMessage = 'Failed to generate minutes';

          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } else {
            errorMessage = await response.text();
          }
          setIsLoading(false);
          throw new Error(errorMessage);
        }

        const data = await response.json();
        setMeetingMinutes(data.minutes);
        setIsLoading(false);
      };
    } catch (err: any) {
      setError(err.message || 'An error occurred while generating minutes.');
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`${geistSans.className} ${geistMono.className} grid grid-rows-[auto_1fr_auto] items-center justify-items-center min-h-screen p-8 pb-20 gap-8 sm:p-20 font-[family-name:var(--font-geist-sans)]`}
    >
      {/* Overlay de carga profesional */}
      {isLoading && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm"
          style={{ pointerEvents: 'auto' }}
        >
          <AiOutlineLoading3Quarters className="animate-spin text-5xl text-white mb-6" />
          <span className="text-white text-xl font-semibold text-center drop-shadow-lg">
            Generando el acta, esto puede tardar unos minutos...
          </span>
        </div>
      )}
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start w-full max-w-2xl">
        <h1 className="text-4xl font-bold text-center sm:text-left">Meeting Minutes Generator</h1>

        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center items-center">
          <button
            onClick={startRecording}
            disabled={isRecording || isLoading}
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto"
          >
            {isRecording ? (
              <>
                <FaMicrophone className="text-red-500 animate-flash" /> Recording...
              </>
            ) : (
              'Start Recording'
            )}
          </button>
          <button
            onClick={stopRecording}
            disabled={!isRecording || isLoading}
            className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto"
          >
            Stop Recording
          </button>

          <input
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            ref={fileInputRef}
            className="hidden" // Hide the default file input
          />
          <button
            onClick={() => fileInputRef.current?.click()} // Trigger click on hidden input
            disabled={isRecording || isLoading}
            className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto"
          >
            Upload Audio
          </button>

          <button
            onClick={sendAudioForMinutes}
            disabled={!audioBlob || isRecording || isLoading}
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-blue-600 text-white gap-2 hover:bg-blue-700 font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto"
          >
            {isLoading ? (
              <>
                <AiOutlineLoading3Quarters className="animate-spin mr-2" /> Generating Minutes...
              </>
            ) : (
              'Generate Minutes'
            )}
          </button>
        </div>

        {audioBlob && !isRecording && (
          <div className="mt-4 w-full flex flex-col items-center">
            <p className="text-sm text-gray-500 mb-2">
              Selected audio: { (audioBlob instanceof File ? audioBlob.name : 'Recorded Audio') } ({(audioBlob.size / 1024 / 1024).toFixed(2)} MB)
            </p>
            {audioUrl && (
              <audio controls src={audioUrl} className="w-full max-w-md"></audio>
            )}
          </div>
        )}

        {error && <p className="text-red-500 text-center sm:text-left">Error: {error}</p>}

        {meetingMinutes && (
          <div className="w-full p-4 border border-solid border-gray-300 dark:border-gray-700 rounded-lg shadow-md mt-8">
            <h2 className="text-2xl font-semibold mb-4">Meeting Minutes</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{meetingMinutes}</p>
          </div>
        )}

      </main>

      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center pt-8">
        {/* Buttons removed as per user request */}
      </footer>
    </div>
  );
}

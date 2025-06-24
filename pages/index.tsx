import React, { useState, useRef } from 'react';
import Image from "next/image";
import { Geist, Geist_Mono } from "next/font/google";

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
  const [meetingMinutes, setMeetingMinutes] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
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
        // Optional: Revoke the stream to stop microphone access immediately after stopping recording
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setError(null);
      setMeetingMinutes(''); // Clear previous minutes on new recording
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

  const sendAudioForMinutes = async () => {
    if (!audioBlob) {
      setError('No audio recorded to send.');
      return;
    }

    setIsLoading(true);
    setError(null);

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
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to generate minutes');
        }

        const data = await response.json();
        setMeetingMinutes(data.minutes);
      };
    } catch (err: any) {
      console.error('Error sending audio:', err);
      setError(err.message || 'An error occurred while generating minutes.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`${geistSans.className} ${geistMono.className} grid grid-rows-[auto_1fr_auto] items-center justify-items-center min-h-screen p-8 pb-20 gap-8 sm:p-20 font-[family-name:var(--font-geist-sans)]`}
    >
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start w-full max-w-2xl">
        <h1 className="text-4xl font-bold text-center sm:text-left">Meeting Minutes Generator</h1>

        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <button
            onClick={startRecording}
            disabled={isRecording || isLoading}
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto"
          >
            {isRecording ? 'Recording...' : 'Start Recording'}
          </button>
          <button
            onClick={stopRecording}
            disabled={!isRecording || isLoading}
            className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto"
          >
            Stop Recording
          </button>
          <button
            onClick={sendAudioForMinutes}
            disabled={!audioBlob || isRecording || isLoading}
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-blue-600 text-white gap-2 hover:bg-blue-700 font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto"
          >
            {isLoading ? 'Generating Minutes...' : 'Generate Minutes'}
          </button>
        </div>

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

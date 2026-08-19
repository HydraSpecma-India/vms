'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Upload, X, Loader2, AlertCircle } from 'lucide-react';

interface WebcamCaptureProps {
  onCapture: (base64Photo: string | null) => void;
  capturedPhoto: string | null;
}

export default function WebcamCapture({ onCapture, capturedPhoto }: WebcamCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isCameraLoading, setIsCameraLoading] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const startCamera = async () => {
    setCameraError(null);
    setIsCameraLoading(true);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
          },
          audio: false,
        });

        setStream(mediaStream);
        setIsCameraActive(true);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.onloadedmetadata = () => {
            if (videoRef.current) {
              videoRef.current.play().catch((e) => console.error('Video play error:', e));
              setIsCameraLoading(false);
            }
          };
        } else {
          setIsCameraLoading(false);
        }
      } else {
        throw new Error('Webcam API is not supported in this browser.');
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setIsCameraLoading(false);
      setIsCameraActive(false);
      setCameraError('Unable to access webcam. Please check browser permissions or upload a photo.');
    }
  };

  // Re-bind srcObject if video element renders after state update
  useEffect(() => {
    if (isCameraActive && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((e) => console.error('Error playing stream:', e));
    }
  }, [isCameraActive, stream]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
    setIsCameraLoading(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Un-flip image if mirrored
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, width, height);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      onCapture(dataUrl);
      stopCamera();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      onCapture(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const clearPhoto = () => {
    onCapture(null);
    stopCamera();
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-slate-800/80 rounded-xl border border-slate-700 w-full">
      {capturedPhoto ? (
        <div className="relative flex flex-col items-center">
          <img
            src={capturedPhoto}
            alt="Visitor Snapshot"
            className="w-48 h-48 object-cover rounded-xl border-2 border-brand-gold shadow-lg"
          />
          <button
            type="button"
            onClick={clearPhoto}
            className="mt-3 inline-flex items-center px-3 py-1.5 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retake Photo
          </button>
        </div>
      ) : isCameraActive ? (
        <div className="flex flex-col items-center w-full">
          <div className="relative w-full max-w-xs h-56 bg-black rounded-xl overflow-hidden border-2 border-brand-gold shadow-inner flex items-center justify-center">
            {isCameraLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-brand-gold text-xs z-10">
                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                Initializing Camera...
              </div>
            )}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onCanPlay={() => setIsCameraLoading(false)}
              className="w-full h-full object-cover transform -scale-x-100"
            />
          </div>
          <div className="flex space-x-2 mt-3">
            <button
              type="button"
              onClick={capturePhoto}
              disabled={isCameraLoading}
              className="inline-flex items-center px-4 py-2 bg-brand-gold text-slate-900 font-bold text-xs rounded-lg hover:bg-amber-400 transition shadow disabled:opacity-50"
            >
              <Camera className="w-4 h-4 mr-1.5" /> Take Snapshot
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="inline-flex items-center px-3 py-2 bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg hover:bg-slate-600 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center text-center w-full">
          <div className="w-28 h-28 bg-slate-900 rounded-full flex items-center justify-center text-brand-gold mb-3 border-2 border-slate-700 shadow-inner">
            <Camera className="w-10 h-10" />
          </div>
          {cameraError && (
            <p className="text-xs text-rose-400 mb-3 flex items-center bg-rose-950/40 p-2 rounded border border-rose-800">
              <AlertCircle className="w-4 h-4 mr-1 shrink-0" /> {cameraError}
            </p>
          )}
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={startCamera}
              className="inline-flex items-center px-4 py-2 bg-brand-gold text-slate-900 font-bold text-xs rounded-lg hover:bg-amber-400 transition shadow"
            >
              <Camera className="w-4 h-4 mr-1.5" /> Open Camera
            </button>
            <label className="inline-flex items-center px-4 py-2 bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg hover:bg-slate-600 cursor-pointer transition">
              <Upload className="w-4 h-4 mr-1.5 text-brand-light" /> Upload Photo
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

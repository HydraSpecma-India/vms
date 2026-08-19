'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Upload, X } from 'lucide-react';

interface WebcamCaptureProps {
  onCapture: (base64Photo: string | null) => void;
  capturedPhoto: string | null;
}

export default function WebcamCapture({ onCapture, capturedPhoto }: WebcamCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.error('Camera error:', err);
      setCameraError('Unable to access webcam. Please enable camera permissions or upload a photo.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
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
    <div className="flex flex-col items-center justify-center p-4 bg-slate-100 rounded-xl border border-slate-200">
      {capturedPhoto ? (
        <div className="relative flex flex-col items-center">
          <img
            src={capturedPhoto}
            alt="Visitor Snapshot"
            className="w-48 h-48 object-cover rounded-lg border-2 border-blue-500 shadow"
          />
          <button
            type="button"
            onClick={clearPhoto}
            className="mt-3 inline-flex items-center px-3 py-1.5 bg-rose-600 text-white text-xs font-semibold rounded-md hover:bg-rose-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retake Photo
          </button>
        </div>
      ) : isCameraActive ? (
        <div className="flex flex-col items-center">
          <div className="relative w-64 h-48 bg-black rounded-lg overflow-hidden border-2 border-blue-500 shadow">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover transform -scale-x-100"
            />
          </div>
          <div className="flex space-x-2 mt-3">
            <button
              type="button"
              onClick={capturePhoto}
              className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700 transition"
            >
              <Camera className="w-4 h-4 mr-2" /> Take Snapshot
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="inline-flex items-center px-3 py-2 bg-slate-600 text-white text-sm font-medium rounded-md hover:bg-slate-700 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center text-center">
          <div className="w-32 h-32 bg-slate-200 rounded-full flex items-center justify-center text-slate-400 mb-3 border border-slate-300">
            <Camera className="w-12 h-12" />
          </div>
          {cameraError && <p className="text-xs text-rose-600 mb-2">{cameraError}</p>}
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={startCamera}
              className="inline-flex items-center px-3.5 py-2 bg-blue-600 text-white text-xs font-semibold rounded-md hover:bg-blue-700 transition"
            >
              <Camera className="w-4 h-4 mr-1.5" /> Open Webcam
            </button>
            <label className="inline-flex items-center px-3.5 py-2 bg-white text-slate-700 border border-slate-300 text-xs font-semibold rounded-md hover:bg-slate-50 cursor-pointer transition">
              <Upload className="w-4 h-4 mr-1.5 text-slate-500" /> Upload Image
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

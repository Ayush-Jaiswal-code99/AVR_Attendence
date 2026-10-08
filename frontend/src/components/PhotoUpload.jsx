import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, RefreshCw, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

export function PhotoUpload({ onPhotoSelected, initialPreview = null, label = "Profile Photograph for Face AI" }) {
  const [preview, setPreview] = useState(initialPreview);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);

    // Validate size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image size exceeds 5MB limit. Please upload a smaller photo.');
      return;
    }

    // Validate type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMsg('Invalid format. Only JPG, JPEG, and PNG images are supported.');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    onPhotoSelected(file);
  };

  const startCamera = async () => {
    setErrorMsg(null);
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      });
      streamRef.current = stream;
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setCameraError('Unable to access webcam. Please check browser permissions or upload from disk.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreview(url);
      onPhotoSelected(file);
      stopCamera();
    }, 'image/jpeg', 0.92);
  };

  const clearPhoto = () => {
    setPreview(null);
    setSelectedFile(null);
    setErrorMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onPhotoSelected(null);
    stopCamera();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          {label} <span className="text-rose-400">*</span>
        </label>
        {preview && (
          <span className="text-xs text-emerald-400 flex items-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Ready for Face Enrollment</span>
          </span>
        )}
      </div>

      {/* Main Container */}
      <div className="p-4 rounded-2xl glass-card border border-slate-700/80">
        {/* Live Camera View */}
        {isCameraActive ? (
          <div className="relative rounded-xl overflow-hidden bg-slate-900 aspect-video flex flex-col items-center justify-center border border-cyan-500/40">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror"
              onLoadedMetadata={() => videoRef.current?.play()}
            />
            <div className="absolute inset-0 border-2 border-dashed border-cyan-400/50 pointer-events-none rounded-xl m-6 flex items-center justify-center">
              <span className="text-xs font-medium text-cyan-200 bg-slate-950/70 px-3 py-1 rounded-full backdrop-blur-md">
                Align face inside frame
              </span>
            </div>
            <div className="absolute bottom-3 flex items-center space-x-3">
              <button
                type="button"
                onClick={capturePhoto}
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg flex items-center space-x-1.5 transition-all"
              >
                <Camera className="w-4 h-4" />
                <span>Snap Photo</span>
              </button>
              <button
                type="button"
                onClick={stopCamera}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : preview ? (
          /* Preview Mode */
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-5">
            <div className="relative w-32 h-32 rounded-2xl overflow-hidden border-2 border-cyan-500/40 shadow-xl bg-slate-900 shrink-0">
              <img src={preview} alt="Enrolled Face" className="w-full h-full object-cover" />
              <div className="absolute top-1 right-1 bg-emerald-500 text-white p-1 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="flex-1 space-y-2 text-center sm:text-left">
              <h4 className="text-sm font-semibold text-white">Photograph Selected</h4>
              <p className="text-xs text-slate-400">
                This image will generate your 128-d AI facial recognition biometric vector during enrollment.
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center space-x-1 transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Choose Another</span>
                </button>
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-3 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/50 text-cyan-300 text-xs font-medium flex items-center space-x-1 transition-all"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Use Webcam</span>
                </button>
                <button
                  type="button"
                  onClick={clearPhoto}
                  className="px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 text-xs font-medium flex items-center space-x-1 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Empty / Upload State */
          <div className="border-2 border-dashed border-slate-700/80 hover:border-cyan-500/50 rounded-xl p-6 text-center transition-all bg-slate-900/30">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-200 mb-1">
              Upload Front-Facing Face Photograph
            </p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
              Supported formats: JPG, PNG, WEBP (Max 5MB). Please ensure clear lighting and centered facial features.
            </p>
            <div className="flex items-center justify-center space-x-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md flex items-center space-x-1.5 transition-all"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Browse File</span>
              </button>
              <button
                type="button"
                onClick={startCamera}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 flex items-center space-x-1.5 transition-all"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Take via Webcam</span>
              </button>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Error Notices */}
      {errorMsg && (
        <div className="flex items-center space-x-2 text-xs text-rose-400 bg-rose-950/40 border border-rose-800/40 p-2.5 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {cameraError && (
        <div className="flex items-center space-x-2 text-xs text-amber-400 bg-amber-950/40 border border-amber-800/40 p-2.5 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{cameraError}</span>
        </div>
      )}
    </div>
  );
}

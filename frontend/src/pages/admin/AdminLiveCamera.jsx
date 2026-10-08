import React, { useState, useRef, useEffect } from 'react';
import { aiApi } from '../../api/ai';
import { attendanceApi } from '../../api/attendance';
import {
  Camera,
  Play,
  Square,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Clock,
  Upload,
  UserCheck,
  RefreshCw,
  Cpu,
} from 'lucide-react';

export function AdminLiveCamera() {
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [inferenceStats, setInferenceStats] = useState(null);
  const [detectedFaces, setDetectedFaces] = useState([]);
  const [recentPunches, setRecentPunches] = useState([]);
  const [statusMessage, setStatusMessage] = useState('Camera idle. Select a session and start streaming or test with sample photo.');
  const [aiStatus, setAiStatus] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    loadSessions();
    loadAiStatus();
    setupSseListener();
    return () => {
      stopStream();
    };
  }, []);

  const loadSessions = async () => {
    try {
      const data = await attendanceApi.getSessions({ status_filter: 'ACTIVE' });
      setSessions(data);
      if (data.length > 0) {
        setSelectedSessionId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadAiStatus = async () => {
    try {
      const st = await aiApi.getStatus();
      setAiStatus(st);
    } catch (err) {
      console.error(err);
    }
  };

  const setupSseListener = () => {
    try {
      const evtSource = new EventSource('/api/attendance/stream');
      evtSource.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.type === 'ATTENDANCE_MARKED' || payload.type === 'OUT_TIME_RECORDED') {
            setRecentPunches((prev) => [payload, ...prev.slice(0, 9)]);
          }
        } catch {
          // ignore keep-alive
        }
      };
      return () => evtSource.close();
    } catch (err) {
      console.error('SSE connection error:', err);
    }
  };

  const startStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsStreaming(true);
      setStatusMessage('Live camera streaming. Scanning for student faces...');

      // Loop frame capture every 2 seconds to avoid overloading GPU/CPU
      intervalRef.current = setInterval(() => {
        captureAndAnalyzeFrame();
      }, 2000);
    } catch (err) {
      alert(`Could not start webcam: ${err.message}. You can still use the sample photo tester below.`);
    }
  };

  const stopStream = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
    setStatusMessage('Live stream stopped.');
  };

  const captureAndAnalyzeFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], 'stream_frame.jpg', { type: 'image/jpeg' });
      try {
        const res = await aiApi.recognizeAndPunch(file, selectedSessionId, 'LIVE_CAM_MAIN');
        setInferenceStats(res);
        setDetectedFaces(res.recognized_faces);
        if (res.recognized_faces.length > 0) {
          const match = res.recognized_faces.find((f) => f.student_id);
          if (match) {
            setStatusMessage(`Identified ${match.student_name} (${match.roll_no}) with ${Math.round(match.confidence * 100)}% match!`);
          }
        }
      } catch (err) {
        console.error('Frame inference error:', err);
      }
    }, 'image/jpeg', 0.85);
  };

  const handleTestImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatusMessage(`Analyzing uploaded image '${file.name}' with AI model...`);
    try {
      const res = await aiApi.recognizeAndPunch(file, selectedSessionId, 'IMAGE_TEST_CONSOLE');
      setInferenceStats(res);
      setDetectedFaces(res.recognized_faces);
      if (res.recognized_faces.length > 0) {
        const match = res.recognized_faces[0];
        setStatusMessage(
          match.student_id
            ? `Matched: ${match.student_name} [${match.attendance_message}] (${res.inference_ms}ms)`
            : `Detected face but no enrolled student matched with confidence (Distance: ${match.distance})`
        );
      } else {
        setStatusMessage('No face detected in test photo.');
      }
    } catch (err) {
      setStatusMessage(`Inference failed: ${err.message}`);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl font-black text-white">Live AI Facial Recognition Camera</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
              <Sparkles className="w-3 h-3 mr-1" /> Real-Time
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Automated facial recognition punching pipeline directly integrated with attendance database
          </p>
        </div>

        {/* Target Session Selector */}
        <div className="flex items-center space-x-2 bg-slate-900/80 p-2 rounded-2xl border border-slate-800">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold text-slate-300">Active Session:</span>
          <select
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            className="glass-input text-xs py-1 px-2.5"
          >
            {sessions.map((sess) => (
              <option key={sess.id} value={sess.id} className="bg-slate-900">
                {sess.subject_code} - {sess.subject_name} ({sess.start_time}-{sess.end_time}, Sec {sess.section})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Dual Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Camera Viewport (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative rounded-3xl overflow-hidden glass-card border border-slate-700/80 aspect-video flex flex-col items-center justify-center bg-slate-950">
            {isStreaming ? (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {/* HUD Scanner Overlay */}
                <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className="bg-slate-950/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-emerald-500/40 text-emerald-300 text-[11px] font-mono flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      <span>SCANNING FEED (CAM_LIVE)</span>
                    </div>
                    {inferenceStats && (
                      <div className="bg-slate-950/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-cyan-500/40 text-cyan-300 text-[11px] font-mono">
                        Latency: {inferenceStats.inference_ms}ms
                      </div>
                    )}
                  </div>

                  {/* Recognition HUD Overlay Box */}
                  {detectedFaces.length > 0 && (
                    <div className="bg-slate-950/85 backdrop-blur-md p-3.5 rounded-2xl border border-cyan-500/50 max-w-sm mx-auto shadow-2xl animate-bounce-short">
                      {detectedFaces.map((f, i) => (
                        <div key={i} className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-cyan-600/30 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-bold overflow-hidden">
                            {f.photo_url ? (
                              <img src={f.photo_url} alt="Face" className="w-full h-full object-cover" />
                            ) : (
                              f.student_name.charAt(0)
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold text-white block truncate">{f.student_name}</span>
                            <span className="text-[10px] text-cyan-300 font-mono block">
                              Roll: {f.roll_no || 'N/A'} • {Math.round(f.confidence * 100)}% match
                            </span>
                            <span className="text-[10px] text-emerald-400 font-semibold block">
                              {f.attendance_message}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="text-center">
                    <span className="text-[10px] text-slate-400 bg-slate-950/70 px-3 py-1 rounded-full border border-slate-800 backdrop-blur-md">
                      Anti-duplicate cooldown active (60s) • Dual-punch supported
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto shadow-xl">
                  <Camera className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Camera Feed Inactive</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                    Click "Start Live Feed" below to begin live biometric facial recognition through your webcam, or test with a photograph.
                  </p>
                </div>
              </div>
            )}

            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Controls Bar */}
          <div className="p-4 rounded-2xl glass-card border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              {isStreaming ? (
                <button
                  onClick={stopStream}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-500/20 flex items-center space-x-1.5 transition-all"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Stop Live Stream</span>
                </button>
              ) : (
                <button
                  onClick={startStream}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center space-x-1.5 transition-all"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Start Live Feed</span>
                </button>
              )}

              {/* Upload image tester */}
              <label className="cursor-pointer px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition-all">
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                <span>Test Image File</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleTestImageUpload}
                />
              </label>
            </div>

            <span className="text-xs text-slate-400 font-mono truncate max-w-xs">{statusMessage}</span>
          </div>
        </div>

        {/* Real-time Recognition & SSE Punch Feed (1 Col) */}
        <div className="space-y-4">
          {/* AI Model Health Card */}
          <div className="p-5 rounded-3xl glass-card border border-slate-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">AI Model Status</h3>
              </div>
              <button
                onClick={loadAiStatus}
                className="text-slate-400 hover:text-cyan-400 p-1"
                title="Reload Model Info"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Inference Engine:</span>
                <span className="text-white font-bold">dlib face_recognition</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Enrolled Face Vectors:</span>
                <span className="text-cyan-400 font-bold font-mono">
                  {aiStatus?.enrolled_faces_in_memory || 0} Faces in Memory
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Match Tolerance:</span>
                <span className="text-slate-200 font-mono">&le; {aiStatus?.tolerance || 0.55}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Punch Cooldown:</span>
                <span className="text-slate-200 font-mono">{aiStatus?.cooldown_seconds || 60} seconds</span>
              </div>
            </div>
          </div>

          {/* Real-Time Live Punch Stream Card */}
          <div className="p-5 rounded-3xl glass-card border border-slate-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Live Punch Stream (SSE)</h3>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Real-time push</span>
            </div>

            {recentPunches.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Waiting for incoming face punches...
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {recentPunches.map((punch, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-slate-900/80 border border-emerald-500/30 flex items-center space-x-3 text-xs animate-bounce-short"
                  >
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-white font-bold block truncate">{punch.student_name}</span>
                      <span className="text-slate-400 text-[10px] block truncate">
                        {punch.subject} • {punch.roll_no}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-emerald-400 font-mono font-bold block">
                        {punch.in_time || punch.out_time}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {punch.type === 'OUT_TIME_RECORDED' ? 'Out-Punch' : 'Present'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

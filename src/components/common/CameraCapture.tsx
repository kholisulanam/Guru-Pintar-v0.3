import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Upload, CheckCircle2, Image as ImageIcon } from 'lucide-react';

interface CameraCaptureProps {
  onPhotoCaptured: (base64Image: string) => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onPhotoCaptured }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [streamActive, setStreamActive] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStreamActive(true);
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError('Kamera tidak terdeteksi atau izin ditolak. Anda dapat mengunggah foto selfie presensi.');
      setStreamActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setStreamActive(false);
    }
  };

  const captureSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setPhoto(dataUrl);
      onPhotoCaptured(dataUrl);
      stopCamera();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check if file seems like an old gallery photo or force camera capture check
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPhoto(base64);
        onPhotoCaptured(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-slate-100 shadow-md">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-teal-950 border border-teal-800 text-teal-400">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Kamera Verifikasi Wajah Presensi
            </h4>
            <p className="text-xs text-slate-300">
              {photo ? 'Foto presensi berhasil diambil' : 'Posisikan wajah Anda pada kamera'}
            </p>
          </div>
        </div>

        {photo ? (
          <button
            onClick={() => {
              setPhoto(null);
              startCamera();
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Ambil Ulang
          </button>
        ) : null}
      </div>

      <div className="relative w-full aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
        {photo ? (
          <div className="relative w-full h-full">
            <img src={photo} alt="Foto Presensi" className="w-full h-full object-cover" />
            <div className="absolute top-3 right-3 bg-emerald-600/90 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 backdrop-blur shadow">
              <CheckCircle2 className="w-4 h-4" /> Foto Kamera Terverifikasi
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              className={`w-full h-full object-cover ${streamActive ? 'block' : 'hidden'}`}
            />

            {!streamActive && (
              <div className="p-6 text-center max-w-sm">
                <ImageIcon className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-rose-400 font-bold mb-1">📷 Upload Galeri Diblokir</p>
                <p className="text-[11px] text-slate-400 mb-3">{cameraError || 'Wajib mengambil foto langsung dari kamera gadget.'}</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 mx-auto"
                >
                  <Camera className="w-4 h-4" /> Buka Kamera Gadget Langsung
                </button>
              </div>
            )}
          </>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFileUpload}
        className="hidden"
      />

      {streamActive && !photo && (
        <div className="mt-3 flex justify-center">
          <button
            onClick={captureSnapshot}
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950/50 flex items-center gap-2 transition transform active:scale-95"
          >
            <Camera className="w-4 h-4" /> Ambil Foto Sekarang
          </button>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { User, SchoolSettings, TeacherAttendance } from '../../types';
import { storageService, getTodayString } from '../../lib/storage';
import { GeoLocationBadge } from '../common/GeoLocationBadge';
import { CameraCapture } from '../common/CameraCapture';
import { UserCheck, CheckCircle2, Clock, LogOut, AlertCircle } from 'lucide-react';
import { isTeacherMatch } from '../../lib/matchUtils';
import { useToast } from '../../context/ToastContext';
import { formatLongDate } from '../../lib/dateUtils';

interface GuruPresensiProps {
  currentUser: User;
  settings: SchoolSettings;
  teacherAttendances: TeacherAttendance[];
  setTeacherAttendances: React.Dispatch<React.SetStateAction<TeacherAttendance[]>>;
}

export const GuruPresensi: React.FC<GuruPresensiProps> = ({
  currentUser,
  settings,
  teacherAttendances,
  setTeacherAttendances,
}) => {
  const toast = useToast();
  const todayStr = getTodayString();

  const [currentLat, setCurrentLat] = useState<number>(settings.latitude);
  const [currentLng, setCurrentLng] = useState<number>(settings.longitude);
  const [isWithinRadius, setIsWithinRadius] = useState<boolean>(true);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [catatan, setCatatan] = useState('');

  const myTodayAttendance = teacherAttendances.find(
    (ta) => isTeacherMatch(ta.guruId, currentUser) && ta.tanggal === todayStr
  );

  const handleLocationUpdate = (lat: number, lng: number, within: boolean) => {
    setCurrentLat(lat);
    setCurrentLng(lng);
    setIsWithinRadius(within);
  };

  const handlePresensiMasuk = () => {
    if (!capturedPhoto) {
      toast.warning('Mohon ambil foto selfie verifikasi presensi terlebih dahulu.', 'Foto Diperlukan');
      return;
    }

    try {
      const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

      const newAttendance: TeacherAttendance = {
        id: `ta-${Date.now()}`,
        guruId: currentUser.id,
        guruNama: currentUser.name,
        tanggal: todayStr,
        jamMasuk: timeStr,
        status: 'Hadir',
        lat: currentLat,
        lng: currentLng,
        dalamRadius: isWithinRadius,
        fotoBase64: capturedPhoto,
        catatan: catatan || (isWithinRadius ? 'Presensi Masuk Berhasil' : 'Presensi Luar Radius (Peringatan GPS)'),
      };

      const updatedList = [newAttendance, ...teacherAttendances];
      setTeacherAttendances(updatedList);
      storageService.saveTeacherAttendances(updatedList, true);

      if (isWithinRadius) {
        toast.success(
          `Presensi Masuk (${timeStr}) berhasil dicatat & disinkronkan ke Cloud Firebase!`,
          'Presensi Masuk Berhasil'
        );
      } else {
        toast.warning(
          `Presensi Masuk (${timeStr}) tersimpan dengan catatan di luar radius madrasah.`,
          'Tersimpan (Luar Radius)'
        );
      }
    } catch (err) {
      toast.error('Gagal mencatat presensi guru. Silakan coba beberapa saat lagi.');
    }
  };

  const handlePresensiPulang = () => {
    if (!myTodayAttendance) return;
    try {
      const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

      const updatedList = teacherAttendances.map((ta) =>
        ta.id === myTodayAttendance.id ? { ...ta, jamPulang: timeStr } : ta
      );
      setTeacherAttendances(updatedList);
      storageService.saveTeacherAttendances(updatedList, true);
      toast.success(
        `Presensi Pulang (${timeStr}) berhasil disimpan ke sistem & Cloud Firebase!`,
        'Presensi Pulang Berhasil'
      );
    } catch (err) {
      toast.error('Gagal mencatat presensi pulang.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-400" /> Presensi Guru GPS & Kamera Live
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Presensi terverifikasi dengan lokasi GPS dan jepretan kamera wajah langsung.
          </p>
        </div>
      </div>

      {/* Geolocation Component */}
      <GeoLocationBadge settings={settings} onLocationUpdate={handleLocationUpdate} />

      {/* Camera Component & Action Form */}
      {!myTodayAttendance ? (
        <div className="space-y-4">
          <CameraCapture onPhotoCaptured={(photo) => setCapturedPhoto(photo)} />

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Catatan Presensi (Opsional)</label>
              <input
                type="text"
                placeholder="Contoh: Piket Harian / Mengajar Kelas XII IPA 1"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100"
              />
            </div>

            <button
              onClick={handlePresensiMasuk}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 font-bold text-white rounded-xl text-xs shadow-lg shadow-emerald-950 transition flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" /> Simpan Presensi Masuk Sekarang
            </button>
          </div>
        </div>
      ) : (
        /* Already present today status */
        <div className="bg-emerald-950/60 border border-emerald-800 rounded-2xl p-6 text-slate-100 shadow-lg text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
          <div>
            <h3 className="text-lg font-bold text-white">Anda Sudah Melakukan Presensi Hari Ini</h3>
            <p className="text-xs text-slate-300 mt-1">
              Tanggal: {formatLongDate(myTodayAttendance.tanggal)} | Jam Masuk: <span className="font-bold text-emerald-400">{myTodayAttendance.jamMasuk}</span>
            </p>
            {myTodayAttendance.jamPulang && (
              <p className="text-xs text-slate-300 mt-0.5">
                Jam Pulang: <span className="font-bold text-teal-300">{myTodayAttendance.jamPulang}</span>
              </p>
            )}
          </div>

          {!myTodayAttendance.jamPulang && (
            <button
              onClick={handlePresensiPulang}
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs shadow transition flex items-center gap-2 mx-auto"
            >
              <LogOut className="w-4 h-4" /> Presensi Pulang Sekarang
            </button>
          )}
        </div>
      )}
    </div>
  );
};

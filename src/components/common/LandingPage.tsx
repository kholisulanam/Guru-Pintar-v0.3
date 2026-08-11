import React, { useState, useEffect } from 'react';
import { User, Role, SchoolSettings } from '../../types';
import { defaultUsers } from '../../lib/initialData';
import { onFirebaseConnectionChange } from '../../lib/firebase';
import {
  ShieldAlert,
  UserCheck,
  GraduationCap,
  Sparkles,
  Lock,
  User as UserIcon,
  LogIn,
  Info,
  X,
  ChevronRight,
  Database,
  Eye,
  EyeOff
} from 'lucide-react';

interface LandingPageProps {
  users: User[];
  onSelectUserAndLogin: (user: User) => void;
  settings: SchoolSettings;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  users,
  onSelectUserAndLogin,
  settings,
}) => {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [usernameInput, setUsernameInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isFirebaseLive, setIsFirebaseLive] = useState<boolean>(true);

  useEffect(() => {
    const unsub = onFirebaseConnectionChange((status) => {
      setIsFirebaseLive(status);
    });
    return () => unsub();
  }, []);

  // Open login dialog for selected role
  const handleOpenLoginModal = (role: Role) => {
    setSelectedRole(role);
    setErrorMessage('');
    setUsernameInput('');
    setPasswordInput('');
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedRole) return;

    const rawInput = usernameInput.trim().toLowerCase();
    const cleanInput = rawInput.replace(/\s+/g, '');
    const cleanPassword = passwordInput.trim();

    if (!rawInput) {
      setErrorMessage('Silakan masukkan Username / NUPTK / NISN.');
      return;
    }

    const userPool = users;

    // 1. Primary search matching selectedRole and username / NUPTK / NISN / Name
    let targetUser = userPool.find(
      (u) =>
        u.role === selectedRole &&
        (u.username.toLowerCase() === rawInput ||
          u.username.toLowerCase() === cleanInput ||
          (u.nuptkOrNisn && u.nuptkOrNisn.toString().toLowerCase().trim() === rawInput) ||
          (u.nuptkOrNisn && u.nuptkOrNisn.toString().toLowerCase().trim() === cleanInput) ||
          (u.name && u.name.toLowerCase() === rawInput) ||
          (u.name && u.name.toLowerCase().includes(rawInput)))
    );

    // 2. Secondary fallback matching role if exact username match
    if (!targetUser) {
      targetUser = userPool.find((u) => u.role === selectedRole && u.username.toLowerCase() === rawInput);
    }

    if (!targetUser) {
      setErrorMessage('Pengguna tidak ditemukan untuk peran ini.');
      return;
    }

    // Verify Password strictly against user's set password
    if (cleanPassword !== targetUser.password) {
      setErrorMessage('Kata sandi yang Anda masukkan tidak sesuai.');
      return;
    }

    onSelectUserAndLogin(targetUser);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-purple-500/20 blur-[140px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-500/15 blur-[120px] rounded-full pointer-events-none"></div>

      {/* Main Content Area */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 flex-1 flex flex-col items-center justify-center space-y-10">
        
        {/* Top Centered Graduation Logo Badge */}
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-3xl shadow-2xl shadow-purple-950/50 flex items-center justify-center border border-white/20 p-2 transform hover:scale-105 transition duration-300">
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt="Logo"
                className="w-full h-full object-cover rounded-2xl"
                referrerPolicy="no-referrer"
              />
            ) : (
              <GraduationCap className="w-10 h-10 sm:w-12 sm:h-12 text-indigo-600" />
            )}
          </div>

          {/* Welcoming Heading strictly formatted as requested */}
          <div className="text-center max-w-4xl space-y-1">
            <p className="text-base sm:text-xl font-bold text-purple-200 tracking-wide uppercase">
              Selamat Datang di
            </p>
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-white tracking-tight leading-none drop-shadow-2xl my-2">
              Guru Pintar
            </h1>
            <p className="text-lg sm:text-2xl font-bold text-purple-100 tracking-wide">
              Portal e-Madrasah Terpadu
            </p>
            <p className="text-xl sm:text-3xl font-extrabold bg-gradient-to-r from-purple-200 via-white to-indigo-200 bg-clip-text text-transparent tracking-tight mt-1">
              MAS AL-AMIEN I PRAGAAN
            </p>
            <p className="text-xs sm:text-sm font-bold text-amber-300 tracking-wider uppercase mt-1">
              Semester {settings.semester} — Tahun Akademik {settings.tahunAkademik}
            </p>
            <p className="text-xs sm:text-sm font-medium text-purple-200/80 max-w-xl mx-auto pt-2">
              Sistem Informasi Akademik, Presensi GPS, CBT Exam, & Perpustakaan Digital
            </p>
          </div>
        </div>

        {/* 3 Portal Role Cards Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 w-full max-w-5xl">
          
          {/* Card 1: Murid */}
          <div className="bg-white rounded-3xl p-7 shadow-2xl flex flex-col justify-between space-y-6 text-slate-800 border border-white/30 transform hover:-translate-y-1 transition duration-300">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner">
                <GraduationCap className="w-9 h-9" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Murid</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed font-medium">
                  Akses ujian CBT, lihat nilai rapot, jadwal pelajaran & catat presensi harian
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleOpenLoginModal('siswa')}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs sm:text-sm tracking-wide shadow-lg shadow-emerald-500/30 transition flex items-center justify-center gap-2 group"
            >
              <span>Login</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </button>
          </div>

          {/* Card 2: Guru */}
          <div className="bg-white rounded-3xl p-7 shadow-2xl flex flex-col justify-between space-y-6 text-slate-800 border border-white/30 transform hover:-translate-y-1 transition duration-300">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 shadow-inner">
                <UserCheck className="w-9 h-9" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Guru</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed font-medium">
                  Kelola jadwal mengajar, presensi GPS, jurnal harian KBM, & pembuat soal CBT
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleOpenLoginModal('guru')}
              className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm tracking-wide shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 group"
            >
              <span>Login</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </button>
          </div>

          {/* Card 3: Administrator */}
          <div className="bg-white rounded-3xl p-7 shadow-2xl flex flex-col justify-between space-y-6 text-slate-800 border border-white/30 transform hover:-translate-y-1 transition duration-300">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600 shadow-inner">
                <ShieldAlert className="w-9 h-9" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Administrator</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed font-medium">
                  Kontrol penuh sistem madrasah, manajemen akun pengguna & analitik terpadu
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleOpenLoginModal('admin')}
              className="w-full py-3.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs sm:text-sm tracking-wide shadow-lg shadow-purple-600/30 transition flex items-center justify-center gap-2 group"
            >
              <span>Login</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </button>
          </div>

        </div>

        {/* System Active Badge */}
        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-1.5 rounded-full text-xs font-semibold text-purple-200 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>Sistem Aktif 2026 — MAS AL-AMIEN I PRAGAAN</span>
        </div>
      </main>

      {/* LOGIN MODAL OVERLAY */}
      {selectedRole && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 text-slate-100 relative">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                {selectedRole === 'admin' && (
                  <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                )}
                {selectedRole === 'guru' && (
                  <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    <UserCheck className="w-5 h-5" />
                  </div>
                )}
                {selectedRole === 'siswa' && (
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">
                    Login {selectedRole === 'admin' ? 'Administrator' : selectedRole === 'guru' ? 'Guru' : 'Murid'}
                  </h3>
                  <p className="text-[11px] text-slate-400">Silakan masukkan username & kata sandi</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRole(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    {selectedRole === 'admin'
                      ? 'Username Admin'
                      : selectedRole === 'guru'
                      ? 'Username / NUPTK Guru'
                      : 'Username / NISN Murid'}
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder="Masukkan Username atau ID"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Kata Sandi
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder="Masukkan Kata Sandi"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 focus:outline-none p-0.5 rounded transition"
                      title={showPassword ? 'Sembunyikan Kata Sandi' : 'Tampilkan Kata Sandi'}
                      aria-label={showPassword ? 'Sembunyikan Kata Sandi' : 'Tampilkan Kata Sandi'}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 text-slate-400 hover:text-indigo-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-slate-400 hover:text-indigo-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {errorMessage && (
                <p className="text-xs text-rose-400 bg-rose-950/50 border border-rose-800/50 p-2.5 rounded-xl font-medium">
                  {errorMessage}
                </p>
              )}

              <button
                type="submit"
                className={`w-full py-3 rounded-xl text-xs font-black shadow-lg flex items-center justify-center gap-2 transition text-white ${
                  selectedRole === 'admin'
                    ? 'bg-purple-600 hover:bg-purple-500'
                    : selectedRole === 'guru'
                    ? 'bg-blue-600 hover:bg-blue-500'
                    : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                <LogIn className="w-4 h-4" /> Masuk ke Dashboard
              </button>
            </form>

            {/* Inspirational Greeting */}
            <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-300 flex items-center justify-center gap-1.5 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/50 text-center font-medium italic">
              <p className="text-emerald-300/90 font-semibold">
                "Semoga Allah Selalu Membimbing dan Memudahkan Langkah Kita"
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer as requested */}
      <footer className="relative z-10 border-t border-white/10 bg-slate-950/80 backdrop-blur-md py-6 text-center text-xs text-slate-300 font-medium space-y-1.5">
        <p className="font-bold text-white tracking-wide flex items-center justify-center gap-1.5 flex-wrap">
          <span>GURU PINTAR</span>
          <span className="text-slate-600">|</span>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] transition-all duration-300 ${
              isFirebaseLive
                ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-400/80 shadow-[0_0_12px_rgba(52,211,153,0.5)] animate-pulse font-bold'
                : 'bg-amber-950/90 text-amber-400 border border-amber-500/60 font-semibold shadow-sm shadow-amber-950'
            }`}
            title={isFirebaseLive ? 'Firebase Tersambung secara Realtime' : 'Firebase Tidak Tersambung (Mode Lokal)'}
          >
            <span className="relative flex h-2 w-2">
              {isFirebaseLive && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isFirebaseLive ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-amber-500'}`}></span>
            </span>
            <span>E-Madrasah Terpadu</span>
          </span>
        </p>
        <p className="text-slate-400">© 2026 MAS AL-AMIEN I PRAGAAN | Powered by A6</p>
      </footer>
    </div>
  );
};




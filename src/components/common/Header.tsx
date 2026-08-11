import React, { useState, useEffect } from 'react';
import { User, Role, SchoolSettings } from '../../types';
import { onFirebaseConnectionChange } from '../../lib/firebase';
import {
  GraduationCap,
  ShieldAlert,
  UserCheck,
  LogOut,
  ChevronDown,
  Sparkles,
  School,
  Menu as MenuIcon,
  Database
} from 'lucide-react';

interface HeaderProps {
  currentUser: User;
  allUsers: User[];
  onSwitchUser: (user: User) => void;
  onLogout?: () => void;
  settings: SchoolSettings;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  roleTabs: { id: string; label: string; icon: React.ReactNode }[];
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  allUsers,
  onSwitchUser,
  onLogout,
  settings,
  activeTab,
  setActiveTab,
  roleTabs,
  onToggleSidebar,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [isFirebaseLive, setIsFirebaseLive] = useState(true);
  const [firebaseStatusText, setFirebaseStatusText] = useState('Firebase Live On');

  useEffect(() => {
    const unsub = onFirebaseConnectionChange((status, text) => {
      setIsFirebaseLive(status);
      if (text) setFirebaseStatusText(text);
    });
    return () => {
      unsub();
    };
  }, []);

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            <ShieldAlert className="w-3 h-3 mr-1 text-amber-600" /> Admin
          </span>
        );
      case 'guru':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <UserCheck className="w-3 h-3 mr-1 text-emerald-600" /> Guru
          </span>
        );
      case 'siswa':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
            <GraduationCap className="w-3 h-3 mr-1 text-blue-600" /> Murid
          </span>
        );
    }
  };

  return (
    <header className="bg-white/10 backdrop-blur-xl border-b border-white/10 text-white sticky top-0 z-40 shadow-lg shadow-indigo-950/30">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left Controls: Sidebar Toggle Button & School Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleSidebar}
              className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition flex items-center justify-center shadow-md"
              title="Buka / Tutup Sidebar"
            >
              <MenuIcon className="w-5 h-5 text-amber-300" />
            </button>

            <a
              href="https://www.maalamien1pragaan.sch.id/"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 transition hover:opacity-95"
              title="Kunjungi Website Resmi MA Al-Amien I Pragaan"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-indigo-500/30 border border-white/20 p-0.5 shadow-lg shadow-indigo-500/20 backdrop-blur-md flex items-center justify-center flex-shrink-0 group-hover:scale-105 group-hover:border-amber-300/60 transition-all duration-300">
                <div className="w-full h-full bg-indigo-950/80 rounded-xl flex items-center justify-center overflow-hidden">
                  {settings.logoUrl ? (
                    <img
                      src={settings.logoUrl}
                      alt="Logo MA Al-Amien I Pragaan"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <School className="w-6 h-6 text-indigo-300" />
                  )}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold tracking-widest text-indigo-300 uppercase flex items-center gap-1 group-hover:text-amber-300 transition">
                    <Sparkles className="w-3 h-3 text-amber-300" /> GURU PINTAR
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 text-[10px] backdrop-blur-md border px-2.5 py-0.5 rounded-full transition-all duration-300 ${
                      isFirebaseLive
                        ? 'bg-emerald-950/90 text-emerald-300 border-emerald-400/80 shadow-[0_0_12px_rgba(52,211,153,0.5)] animate-pulse font-bold'
                        : 'bg-amber-950/90 text-amber-400 border-amber-500/60 font-semibold shadow-sm shadow-amber-950'
                    }`}
                    title={isFirebaseLive ? 'Firebase Tersambung secara Realtime' : 'Firebase Tidak Tersambung (Mode Lokal / Offline)'}
                  >
                    <span className="relative flex h-2 w-2">
                      {isFirebaseLive && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      )}
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${isFirebaseLive ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-amber-500'}`}></span>
                    </span>
                    <span>E-Madrasah Terpadu</span>
                  </span>
                </div>
                <h1 className="text-sm sm:text-lg font-bold text-white tracking-tight leading-tight drop-shadow-sm group-hover:text-amber-200 transition">
                  {settings.namaSekolah}
                </h1>
                <p className="text-[11px] sm:text-xs font-semibold text-amber-300 tracking-wide mt-0.5">
                  Semester {settings.semester} — TA {settings.tahunAkademik}
                </p>
              </div>
            </a>
          </div>

          {/* User Profile & Account Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-3 bg-white/10 hover:bg-white/15 border border-white/20 rounded-2xl p-1.5 sm:px-3 sm:py-2 transition shadow-lg backdrop-blur-md text-left"
            >
              <img
                src={currentUser.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"}
                alt={currentUser.name}
                className="w-8 h-8 rounded-xl object-cover ring-2 ring-indigo-400/50 shadow-md"
              />
              <div className="hidden md:block">
                <p className="text-xs font-semibold text-white leading-tight">
                  {currentUser.name}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  {getRoleBadge(currentUser.role)}
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-white/70" />
            </button>

            {/* Dropdown Menu */}
            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-72 bg-[#1e1b4b]/95 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl p-4 z-50 text-white divide-y divide-white/10">
                <div className="pb-3 px-1">
                  <p className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider mb-1">
                    Akun Aktif saat ini:
                  </p>
                  <p className="text-sm font-bold text-white">{currentUser.name}</p>
                  <p className="text-xs text-indigo-200/80 mt-0.5">
                    Role: <span className="capitalize font-semibold text-indigo-300">{currentUser.role}</span>
                    {currentUser.nuptkOrNisn && ` | ID: ${currentUser.nuptkOrNisn}`}
                  </p>
                </div>

                <div className="pt-3">
                  <button
                    onClick={() => {
                      if (onLogout) {
                        onLogout();
                      }
                      setShowUserDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-2 text-xs text-rose-300 hover:bg-rose-500/20 transition font-semibold"
                  >
                    <LogOut className="w-4 h-4" /> Keluar Akun
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

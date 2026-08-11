import React, { useState } from 'react';
import { User, Role, SchoolSettings } from '../../types';
import {
  UserCheck,
  ChevronDown,
  LogOut,
  ShieldAlert,
  GraduationCap,
  School,
  Sparkles,
  X,
  PanelLeftClose
} from 'lucide-react';

export interface TabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  currentUser: User;
  allUsers: User[];
  onSwitchUser: (user: User) => void;
  onLogout?: () => void;
  settings: SchoolSettings;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  roleTabs: TabItem[];
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  allUsers,
  onSwitchUser,
  onLogout,
  settings,
  activeTab,
  setActiveTab,
  roleTabs,
  isOpen,
  onClose,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
            <ShieldAlert className="w-3 h-3 mr-1 text-amber-300" /> Admin
          </span>
        );
      case 'guru':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
            <UserCheck className="w-3 h-3 mr-1 text-emerald-300" /> Guru
          </span>
        );
      case 'siswa':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
            <GraduationCap className="w-3 h-3 mr-1 text-indigo-300" /> Murid
          </span>
        );
    }
  };

  return (
    <>
      {/* Backdrop overlay when sidebar is open */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Collapsible Sidebar Drawer */}
      <aside
        className={`fixed left-0 top-0 bottom-0 z-50 flex flex-col w-72 bg-[#1e1b4b]/98 backdrop-blur-2xl border-r border-white/20 shadow-2xl transition-transform duration-300 ease-in-out text-white justify-between overflow-y-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Top Branding & Close Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <a
              href="https://www.maalamien1pragaan.sch.id/"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 transition hover:opacity-95 overflow-hidden"
              title="Kunjungi Website Resmi MA Al-Amien I Pragaan"
            >
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/30 border border-white/20 p-0.5 shadow-lg shadow-indigo-500/20 backdrop-blur-md flex items-center justify-center flex-shrink-0 group-hover:scale-105 group-hover:border-amber-300/60 transition-all duration-300">
                <div className="w-full h-full bg-indigo-950/90 rounded-xl flex items-center justify-center overflow-hidden">
                  {settings.logoUrl ? (
                    <img
                      src={settings.logoUrl}
                      alt="Logo"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <School className="w-5 h-5 text-indigo-300" />
                  )}
                </div>
              </div>
              <div className="overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold tracking-widest text-indigo-300 uppercase flex items-center gap-1 group-hover:text-amber-300 transition">
                    <Sparkles className="w-3 h-3 text-amber-300" /> GURU PINTAR
                  </span>
                </div>
                <h1 className="text-xs font-black text-white truncate leading-tight mt-0.5 group-hover:text-amber-200 transition">
                  {settings.namaSekolah}
                </h1>
                <p className="text-[10px] font-semibold text-amber-300 tracking-wide">
                  Semester {settings.semester} — TA {settings.tahunAkademik}
                </p>
              </div>
            </a>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition"
              title="Sembunyikan Sidebar"
            >
              <PanelLeftClose className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Menu */}
          <div className="p-3 space-y-1">
            <p className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-indigo-200/60">
              Menu Utama ({currentUser.role})
            </p>
            <nav className="space-y-1">
              {roleTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      onClose();
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white border border-indigo-400/50 shadow-lg shadow-indigo-600/30 font-bold scale-[1.01]'
                        : 'text-indigo-200/80 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className={`p-1.5 rounded-xl ${isActive ? 'bg-white/20 text-white' : 'text-indigo-300 bg-white/5'}`}>
                      {tab.icon}
                    </span>
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Profile Section & Logout at Sidebar Bottom */}
        <div className="p-3 border-t border-white/10 relative space-y-2.5">
          {/* User Profile Card */}
          <div className="w-full flex items-center justify-between p-2.5 bg-white/5 border border-white/15 rounded-2xl backdrop-blur-md">
            <div className="flex items-center gap-2.5 overflow-hidden text-left">
              <img
                src={currentUser.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"}
                alt={currentUser.name}
                className="w-9 h-9 rounded-xl object-cover ring-2 ring-indigo-400/50 flex-shrink-0"
              />
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-white truncate">
                  {currentUser.name}
                </p>
                <div className="mt-0.5">
                  {getRoleBadge(currentUser.role)}
                </div>
              </div>
            </div>
          </div>

          {/* Full-width Keluar Akun Menu Button */}
          {onLogout && (
            <button
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-rose-500/20 hover:bg-rose-600/30 text-rose-200 hover:text-rose-100 border border-rose-500/30 transition-all duration-200 active:scale-[0.98] shadow-sm group"
            >
              <LogOut className="w-4 h-4 text-rose-300 group-hover:scale-110 transition-transform" />
              <span>Keluar Akun</span>
            </button>
          )}

          {/* Baris / Pemisah di bawah Akun Aktif */}
          <div className="pt-2 border-t border-white/20 flex items-center justify-between text-[11px] font-semibold text-indigo-100">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Akun Aktif
            </span>
            <span className="text-emerald-300 font-mono text-[10px] bg-slate-900/60 px-2 py-0.5 rounded border border-white/10">
              T.A. {settings?.tahunAkademik || '2025/2026'} ({settings?.semester || 'Ganjil'})
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};


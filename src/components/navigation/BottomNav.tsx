import React from 'react';
import { TabItem } from './Sidebar';
import { User, Role } from '../../types';
import {
  LayoutDashboard,
  Clock,
  CalendarCheck,
  FileCheck,
  Bell,
  Menu as MenuIcon
} from 'lucide-react';

interface BottomNavProps {
  currentUser: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  roleTabs: TabItem[];
  onToggleSidebar: () => void;
  isSidebarOpen?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  roleTabs,
  onToggleSidebar,
  isSidebarOpen,
}) => {
  // Map role to standard presensi tab
  const getPresensiTab = (role: Role) => {
    if (role === 'admin') return 'laporan';
    if (role === 'guru') return 'presensi_siswa';
    return 'presensi';
  };

  const presensiTabId = getPresensiTab(currentUser.role);
  const isPresensiActive =
    activeTab === 'presensi' ||
    activeTab === 'presensi_siswa' ||
    activeTab === 'presensi_guru';

  const navItems = [
    {
      id: 'beranda',
      label: 'Beranda',
      icon: <LayoutDashboard className="w-5 h-5" />,
      action: () => {
        setActiveTab('beranda');
      },
      isActive: activeTab === 'beranda',
    },
    {
      id: 'jadwal',
      label: 'Jadwal',
      icon: <Clock className="w-5 h-5" />,
      action: () => {
        setActiveTab('jadwal');
      },
      isActive: activeTab === 'jadwal',
    },
    {
      id: 'presensi',
      label: 'Presensi',
      icon: <CalendarCheck className="w-5 h-5" />,
      action: () => {
        setActiveTab(presensiTabId);
      },
      isActive: isPresensiActive,
    },
    {
      id: 'asesmen',
      label: 'Asesmen',
      icon: <FileCheck className="w-5 h-5" />,
      action: () => {
        setActiveTab('asesmen');
      },
      isActive: activeTab === 'asesmen',
    },
    {
      id: 'pengumuman',
      label: 'Pengumuman',
      icon: <Bell className="w-5 h-5" />,
      action: () => {
        setActiveTab('pengumuman');
      },
      isActive: activeTab === 'pengumuman',
    },
    {
      id: 'menu',
      label: 'Menu',
      icon: <MenuIcon className="w-5 h-5" />,
      action: () => {
        onToggleSidebar();
      },
      isActive: !!isSidebarOpen,
    },
  ];

  return (
    <>
      {/* SLIM FIXED BOTTOM NAVIGATION BAR */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-[#1e1b4b]/95 backdrop-blur-xl border-t border-white/15 px-2 py-1 shadow-2xl flex items-center justify-around"
        aria-label="Fixed Bottom Navigation"
      >
        <div className="max-w-4xl mx-auto w-full flex items-center justify-between sm:justify-around gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={item.action}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-150 min-w-[50px] sm:min-w-[68px] ${
                item.isActive
                  ? 'text-white font-bold bg-white/10 border border-white/20 shadow-sm scale-102'
                  : 'text-indigo-200/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className={`p-0.5 rounded-lg ${item.isActive ? 'text-amber-300' : 'text-indigo-300'}`}>
                {item.icon}
              </div>
              <span className="text-[10px] font-semibold tracking-tight truncate max-w-[62px] leading-tight mt-0.5">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
};


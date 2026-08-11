import React, { useState, useEffect } from 'react';
import { SchoolSettings, User, Role, ClassItem } from '../../types';
import { storageService } from '../../lib/storage';
import { exportToExcel } from '../../lib/exportUtils';
import {
  Settings,
  Save,
  Upload,
  MapPin,
  Building2,
  CheckCircle2,
  UserCheck,
  KeyRound,
  Search,
  Plus,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  RotateCcw,
  Shield,
  GraduationCap,
  Sparkles,
  Lock,
  X,
  Copy,
  Check,
  Download
} from 'lucide-react';

interface AdminPengaturanProps {
  settings: SchoolSettings;
  setSettings: React.Dispatch<React.SetStateAction<SchoolSettings>>;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  classes?: ClassItem[];
}

export const AdminPengaturan: React.FC<AdminPengaturanProps> = ({
  settings,
  setSettings,
  users,
  setUsers,
  classes = [],
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'identitas' | 'users'>('users');

  // School Settings State
  const [formData, setFormData] = useState<SchoolSettings>({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  // Delete All & Reset Modals State
  const [deleteModalRole, setDeleteModalRole] = useState<'semua' | 'guru' | 'siswa' | null>(null);
  const [showResetIdentitasModal, setShowResetIdentitasModal] = useState(false);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleDownloadUsersAndPassword = () => {
    if (filteredUsers.length === 0) {
      triggerToast('Tidak ada data user untuk diunduh.');
      return;
    }
    const dataToExport = filteredUsers.map((u, idx) => ({
      No: idx + 1,
      NamaLengkap: u.name,
      Username: u.username,
      Password: u.password || (u.role === 'admin' ? 'admin#123' : u.username),
      Role: u.role === 'guru' ? 'Guru' : u.role === 'siswa' ? 'Murid' : 'Admin',
      NUPTK_NISN: u.nuptkOrNisn || '-',
      Status: u.status || 'Aktif',
    }));
    exportToExcel(
      dataToExport,
      `Data_User_Password_${settings.namaSekolah ? settings.namaSekolah.replace(/\s+/g, '_') : 'Madrasah'}`,
      'User & Password'
    );
    triggerToast('Berhasil mengunduh data User & Password (Excel)!');
  };

  const handleConfirmDeleteUsers = () => {
    if (deleteModalRole === 'semua') {
      setUsers([]);
      storageService.saveUsers([]);
      triggerToast('Semua data pengguna berhasil dihapus.');
    } else if (deleteModalRole === 'guru') {
      setUsers((prev) => prev.filter((u) => u.role !== 'guru'));
      triggerToast('Semua data user Guru berhasil dihapus.');
    } else if (deleteModalRole === 'siswa') {
      setUsers((prev) => prev.filter((u) => u.role !== 'siswa'));
      triggerToast('Semua data user Murid berhasil dihapus.');
    }
    setDeleteModalRole(null);
  };

  const handleConfirmResetIdentitas = () => {
    const emptySettings: SchoolSettings = {
      namaSekolah: '',
      alamat: '',
      kodePos: '',
      kepalaSekolah: '',
      tahunAkademik: '2025/2026',
      semester: 'Ganjil',
      logoUrl: '',
      latitude: 0,
      longitude: 0,
      radiusMeters: 100,
    };
    setFormData(emptySettings);
    setSettings(emptySettings);
    storageService.saveSettings(emptySettings);
    setShowResetIdentitasModal(false);
    triggerToast('Identitas Madrasah berhasil dikosongkan/direset.');
  };

  // User Management State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'semua' | Role>('semua');
  const [visiblePasswords, setVisiblePasswords] = useState<{ [userId: string]: boolean }>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // User Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState<{
    id: string;
    name: string;
    username: string;
    password: string;
    role: Role;
    nuptkOrNisn: string;
    kelasId: string;
    status: 'Aktif' | 'Non-Aktif';
  }>({
    id: '',
    name: '',
    username: '',
    password: '',
    role: 'guru',
    nuptkOrNisn: '',
    kelasId: '',
    status: 'Aktif',
  });

  const handleSchoolSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSettings(formData);
    storageService.saveSettings(formData, true);
    setSavedSuccess(true);
    triggerToast('✓ Perubahan Identitas Madrasah berhasil tersimpan di database Firebase!');
    setTimeout(() => setSavedSuccess(false), 5000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, logoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // User Password Visibility Toggle
  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  // Copy Password or Username
  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Open Create Modal
  const handleOpenAddUser = () => {
    setEditingUser(null);
    setUserFormData({
      id: `usr-${Date.now()}`,
      name: '',
      username: '',
      password: '',
      role: 'guru',
      nuptkOrNisn: '',
      kelasId: classes[0]?.id || '',
      status: 'Aktif',
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditUser = (user: User) => {
    setEditingUser(user);
    setUserFormData({
      id: user.id,
      name: user.name,
      username: user.username,
      password: user.password || '',
      role: user.role,
      nuptkOrNisn: user.nuptkOrNisn || '',
      kelasId: user.kelasId || '',
      status: user.status || 'Aktif',
    });
    setIsModalOpen(true);
  };

  // Helper to generate a clean random password
  const generateRandomPass = (length = 8) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Generate Random Password for modal form
  const handleGeneratePassword = () => {
    setUserFormData((prev) => ({ ...prev, password: generateRandomPass(8) }));
  };

  // Save User (Create or Update)
  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFormData.name || !userFormData.username) {
      alert('Nama dan Username wajib diisi!');
      return;
    }

    if (editingUser) {
      // Update existing
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? {
                ...u,
                name: userFormData.name,
                username: userFormData.username,
                password: userFormData.password,
                role: userFormData.role,
                nuptkOrNisn: userFormData.nuptkOrNisn,
                kelasId: userFormData.kelasId,
                status: userFormData.status,
              }
            : u
        )
      );
    } else {
      // Add new
      const newUser: User = {
        id: userFormData.id,
        name: userFormData.name,
        username: userFormData.username,
        password: userFormData.password,
        role: userFormData.role,
        nuptkOrNisn: userFormData.nuptkOrNisn,
        kelasId: userFormData.kelasId,
        status: userFormData.status,
        avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80`,
      };
      setUsers((prev) => [...prev, newUser]);
    }

    setIsModalOpen(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Quick Reset Password
  const handleResetPassword = (user: User) => {
    const generated = user.role === 'siswa' ? generateRandomPass(8) : user.role === 'admin' ? 'admin#123' : generateRandomPass(8);
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, password: generated } : u))
    );
    triggerToast(`Password ${user.name} berhasil di-reset menjadi '${generated}'`);
  };

  // Delete User
  const handleDeleteUser = (userId: string, name: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  // Filter Users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.nuptkOrNisn && u.nuptkOrNisn.includes(searchQuery));

    const matchesRole =
      selectedRoleFilter === 'semua' || u.role === selectedRoleFilter;

    return matchesSearch && matchesRole;
  });

  const countGuru = users.filter((u) => u.role === 'guru').length;
  const countSiswa = users.filter((u) => u.role === 'siswa').length;
  const countAdmin = users.filter((u) => u.role === 'admin').length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header & Sub-Tab Switcher */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 text-slate-100 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-950 border border-indigo-800 rounded-2xl text-indigo-400">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Pengaturan Madrasah & User
            </h2>
            <p className="text-xs text-slate-400">
              Kelola Identitas Kop Sekolah, Geolocation, serta Akun User Guru & Murid
            </p>
          </div>
        </div>

        {/* Sub Navigation Tabs */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 w-full sm:w-auto">
          <button
            onClick={() => setActiveSubTab('users')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeSubTab === 'users'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-4 h-4 text-amber-300" /> User & Password
          </button>
          <button
            onClick={() => setActiveSubTab('identitas')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeSubTab === 'identitas'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4 text-emerald-300" /> Identitas Madrasah
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="px-4 py-3 bg-emerald-950/90 text-emerald-300 border border-emerald-700 rounded-2xl text-xs font-bold flex items-center justify-between gap-2 shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span>Perubahan Identitas Madrasah & Geolocation berhasil tersimpan ke Database Firebase!</span>
          </div>
          <span className="text-[10px] bg-emerald-900 text-emerald-200 px-2.5 py-1 rounded-lg font-mono border border-emerald-700">
            Realtime Firebase Sync
          </span>
        </div>
      )}

      {/* SUB TAB 1: USER & PASSWORD MANAGEMENT */}
      {activeSubTab === 'users' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center justify-between text-white shadow-lg">
              <div>
                <p className="text-xs text-slate-400 font-medium">Akun Guru</p>
                <h3 className="text-2xl font-black text-emerald-400 mt-1">{countGuru}</h3>
              </div>
              <div className="p-3 bg-emerald-950/80 border border-emerald-800/50 rounded-xl text-emerald-400">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center justify-between text-white shadow-lg">
              <div>
                <p className="text-xs text-slate-400 font-medium">Akun Murid</p>
                <h3 className="text-2xl font-black text-indigo-400 mt-1">{countSiswa}</h3>
              </div>
              <div className="p-3 bg-indigo-950/80 border border-indigo-800/50 rounded-xl text-indigo-400">
                <GraduationCap className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center justify-between text-white shadow-lg">
              <div>
                <p className="text-xs text-slate-400 font-medium">Akun Administrator</p>
                <h3 className="text-2xl font-black text-amber-400 mt-1">{countAdmin}</h3>
              </div>
              <div className="p-3 bg-amber-950/80 border border-amber-800/50 rounded-xl text-amber-400">
                <Shield className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* User Controls: Search & Role Filters & Add Button */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 text-white shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari Nama, Username, atau NUPTK/NISN..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleDownloadUsersAndPassword}
                  className="px-3.5 py-2.5 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white border border-indigo-500/40 text-xs font-bold rounded-2xl shadow-lg shadow-indigo-950/30 transition flex items-center justify-center gap-1.5 whitespace-nowrap"
                  title="Unduh seluruh daftar user & password ke format Excel"
                >
                  <Download className="w-4 h-4 text-indigo-300" /> Download User & Password
                </button>
                <button
                  onClick={handleOpenAddUser}
                  className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-2xl shadow-lg shadow-emerald-900/30 transition flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" /> Tambah User Baru
                </button>
              </div>
            </div>

            {/* Role Filter Buttons */}
            <div className="flex items-center gap-2 border-t border-slate-800 pt-3 overflow-x-auto scrollbar-none">
              <span className="text-xs text-slate-400 font-semibold mr-1">Filter Role:</span>
              {[
                { id: 'semua', label: 'Semua User' },
                { id: 'guru', label: 'Guru' },
                { id: 'siswa', label: 'Murid' },
                { id: 'admin', label: 'Admin' },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setSelectedRoleFilter(filter.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    selectedRoleFilter === filter.id
                      ? 'bg-indigo-600 text-white border border-indigo-400/50 shadow-md'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* User List Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden text-white shadow-xl">
            <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-indigo-400" /> Daftar Pengguna & Kredensial Login ({filteredUsers.length})
                </h3>
                <p className="text-[11px] text-slate-400">
                  Klik ikon mata untuk melihat password atau tombol edit untuk memperbarui data login.
                </p>
              </div>

              {/* Delete buttons corresponding to active tab */}
              {selectedRoleFilter === 'semua' && (
                <button
                  type="button"
                  onClick={() => setDeleteModalRole('semua')}
                  className="px-3.5 py-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
                  title="Hapus semua user"
                >
                  <Trash2 className="w-4 h-4" />
                  Hapus Semua User
                </button>
              )}
              {selectedRoleFilter === 'guru' && (
                <button
                  type="button"
                  onClick={() => setDeleteModalRole('guru')}
                  className="px-3.5 py-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
                  title="Hapus seluruh user guru"
                >
                  <Trash2 className="w-4 h-4" />
                  Hapus User Guru
                </button>
              )}
              {selectedRoleFilter === 'siswa' && (
                <button
                  type="button"
                  onClick={() => setDeleteModalRole('siswa')}
                  className="px-3.5 py-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
                  title="Hapus seluruh user murid"
                >
                  <Trash2 className="w-4 h-4" />
                  Hapus User Murid
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Pengguna</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">NUPTK / NISN</th>
                    <th className="px-4 py-3">Username</th>
                    <th className="px-4 py-3">Password</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        Tidak ada user yang sesuai dengan pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((usr) => {
                      const isPasswordVisible = !!visiblePasswords[usr.id];
                      const userPass = usr.password || '******';

                      return (
                        <tr key={usr.id} className="hover:bg-slate-800/50 transition">
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <img
                                src={usr.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"}
                                alt={usr.name}
                                className="w-9 h-9 rounded-xl object-cover ring-1 ring-white/10 flex-shrink-0"
                              />
                              <div>
                                <p className="font-bold text-white text-xs">{usr.name}</p>
                                <p className="text-[10px] text-slate-400">ID: {usr.id}</p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            {usr.role === 'admin' && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                Admin
                              </span>
                            )}
                            {usr.role === 'guru' && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                Guru
                              </span>
                            )}
                            {usr.role === 'siswa' && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                Murid
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 font-mono text-slate-300">
                            {usr.nuptkOrNisn || '-'}
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5 font-mono font-bold text-indigo-300">
                              <span>{usr.username}</span>
                              <button
                                onClick={() => handleCopyText(usr.username, `user-${usr.id}`)}
                                title="Salin Username"
                                className="text-slate-500 hover:text-white p-0.5 rounded"
                              >
                                {copiedId === `user-${usr.id}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 w-fit">
                              <span className="font-mono text-xs font-semibold text-amber-300">
                                {isPasswordVisible ? userPass : '••••••••'}
                              </span>
                              <button
                                onClick={() => togglePasswordVisibility(usr.id)}
                                title={isPasswordVisible ? 'Sembunyikan' : 'Tampilkan Password'}
                                className="text-slate-400 hover:text-white transition"
                              >
                                {isPasswordVisible ? (
                                  <EyeOff className="w-3.5 h-3.5" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>

                          <td className="px-4 py-3.5 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                (usr.status || 'Aktif') === 'Aktif'
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                  : 'bg-rose-950 text-rose-400 border border-rose-800'
                              }`}
                            >
                              {usr.status || 'Aktif'}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditUser(usr)}
                                title="Edit User & Password"
                                className="p-1.5 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white border border-indigo-500/30 rounded-xl transition"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleResetPassword(usr)}
                                title="Reset Password ke Default"
                                className="p-1.5 bg-amber-600/30 hover:bg-amber-600 text-amber-200 hover:text-white border border-amber-500/30 rounded-xl transition"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDeleteUser(usr.id, usr.name)}
                                title="Hapus User"
                                className="p-1.5 bg-rose-600/30 hover:bg-rose-600 text-rose-200 hover:text-white border border-rose-500/30 rounded-xl transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB TAB 2: IDENTITAS & GEOLOCATION MADRASAH */}
      {activeSubTab === 'identitas' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-slate-100 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-950 border border-emerald-800 rounded-2xl text-emerald-400">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Identitas Kop & Geolocation Madrasah</h2>
                <p className="text-xs text-slate-400">
                  Kelola Kop Sekolah, Nama Kepala Madrasah, serta radius GPS presensi guru.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSchoolSubmit} className="space-y-6 text-xs">
            {/* Logo & Kop Preview */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center gap-6">
              <div className="w-20 h-20 bg-slate-900 border-2 border-emerald-500 rounded-2xl p-1 flex items-center justify-center overflow-hidden flex-shrink-0">
                <img
                  src={formData.logoUrl || "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=150&auto=format&fit=crop&q=80"}
                  alt="Logo Sekolah"
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Upload Logo Kop Sekolah</h4>
                <p className="text-[11px] text-slate-400 my-1">
                  Gunakan gambar rasio 1:1 format PNG atau JPG untuk kop resmi surat/laporan.
                </p>
                <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-xl font-bold cursor-pointer transition">
                  <Upload className="w-3.5 h-3.5" /> Pilih File Logo
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
              </div>
            </div>

            {/* School Identity */}
            <div className="space-y-4">
              <h3 className="font-bold text-emerald-400 text-sm uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Identitas Madrasah Official
              </h3>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Nama Sekolah / Madrasah</label>
                <input
                  type="text"
                  required
                  value={formData.namaSekolah}
                  onChange={(e) => setFormData({ ...formData, namaSekolah: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Alamat Lengkap</label>
                <input
                  type="text"
                  required
                  value={formData.alamat}
                  onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Kode Pos</label>
                  <input
                    type="text"
                    required
                    value={formData.kodePos}
                    onChange={(e) => setFormData({ ...formData, kodePos: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Input Nama Kepala Sekolah / Madrasah</label>
                  <input
                    type="text"
                    required
                    value={formData.kepalaSekolah}
                    onChange={(e) => setFormData({ ...formData, kepalaSekolah: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 font-bold text-emerald-300"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Tahun Akademik Aktif</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 2025/2026"
                      value={formData.tahunAkademik || '2025/2026'}
                      onChange={(e) => setFormData({ ...formData, tahunAkademik: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 font-mono font-bold text-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Semester Aktif</label>
                    <select
                      value={formData.semester || 'Ganjil'}
                      onChange={(e) => setFormData({ ...formData, semester: e.target.value as 'Ganjil' | 'Genap' })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 font-bold"
                    >
                      <option value="Ganjil">Semester Ganjil</option>
                      <option value="Genap">Semester Genap</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Geolocation Radius */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <h3 className="font-bold text-teal-400 text-sm uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Koordinat Geolocation Madrasah & Radius Presensi
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Latitude Madrasah</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Longitude Madrasah</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Radius Toleransi Presensi (Meter)</label>
                  <input
                    type="number"
                    required
                    value={formData.radiusMeters}
                    onChange={(e) => setFormData({ ...formData, radiusMeters: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 font-mono font-bold text-teal-400"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="submit"
                className="w-full sm:flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-500 font-bold text-white rounded-2xl shadow-xl shadow-emerald-950 transition flex items-center justify-center gap-2 text-sm"
              >
                <Save className="w-4 h-4" /> Simpan Perubahan Identitas Madrasah
              </button>
              <button
                type="button"
                onClick={() => setShowResetIdentitasModal(true)}
                className="w-full sm:w-auto px-5 py-3.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 font-bold rounded-2xl shadow-xl transition flex items-center justify-center gap-2 text-xs whitespace-nowrap"
              >
                <Trash2 className="w-4 h-4" /> Kosongkan / Reset Identitas
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL ADD / EDIT USER */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#1e1b4b] border border-white/20 rounded-2xl p-4 sm:p-5 w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-3 flex-shrink-0">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-300" />
                <h3 className="text-sm font-bold text-white">
                  {editingUser ? 'Edit User & Password' : 'Tambah User Akun Baru'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full bg-white/10 text-white/70 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="flex-1 overflow-y-auto space-y-3 text-xs pr-1">
              <div>
                <label className="block font-bold text-slate-200 mb-1">Role Akun</label>
                <select
                  value={userFormData.role}
                  onChange={(e) =>
                    setUserFormData({ ...userFormData, role: e.target.value as Role })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold"
                >
                  <option value="guru">Guru / Tenaga Pendidik</option>
                  <option value="siswa">Murid</option>
                  <option value="admin">Administrator Madrasah</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-200 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Drs. H. Ahmad Dahlan, M.Pd"
                  value={userFormData.name}
                  onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-200 mb-1">
                    {userFormData.role === 'guru' ? 'NUPTK' : userFormData.role === 'siswa' ? 'NISN' : 'NIP/NUPTK'}
                  </label>
                  <input
                    type="text"
                    placeholder="Nomor Induk / NUPTK"
                    value={userFormData.nuptkOrNisn}
                    onChange={(e) =>
                      setUserFormData({ ...userFormData, nuptkOrNisn: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-200 mb-1">Status Akun</label>
                  <select
                    value={userFormData.status}
                    onChange={(e) =>
                      setUserFormData({ ...userFormData, status: e.target.value as any })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Non-Aktif">Non-Aktif</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-white/10">
                <div>
                  <label className="block font-bold text-slate-200 mb-1">Username Login</label>
                  <input
                    type="text"
                    required
                    placeholder="Username unik"
                    value={userFormData.username}
                    onChange={(e) =>
                      setUserFormData({ ...userFormData, username: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-indigo-300 font-mono font-bold"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-200">Password Login</label>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="text-[11px] text-amber-300 hover:underline flex items-center gap-1 font-bold"
                    >
                      <Sparkles className="w-3 h-3" /> Acak Password
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Minimal 6 karakter"
                    value={userFormData.password}
                    onChange={(e) =>
                      setUserFormData({ ...userFormData, password: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-amber-300 font-mono font-bold tracking-wider"
                  />
                </div>
              </div>

              <div className="sticky bottom-0 bg-[#1e1b4b] pt-3 pb-1 border-t border-white/10 flex items-center justify-end gap-2 mt-2 z-10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-600/30 transition flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" /> Simpan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL CONFIRMATION DELETE USERS (ALL / GURU / SISWA) --- */}
      {deleteModalRole && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-3 bg-rose-950/80 rounded-xl border border-rose-800/50">
                <Trash2 className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">
                  {deleteModalRole === 'semua'
                    ? 'Hapus Semua User'
                    : deleteModalRole === 'guru'
                    ? 'Hapus User Guru'
                    : 'Hapus User Murid'}
                </h3>
                <p className="text-xs text-rose-300 font-semibold">
                  {deleteModalRole === 'semua'
                    ? 'Seluruh data akun pengguna akan terhapus!'
                    : deleteModalRole === 'guru'
                    ? 'Seluruh akun user guru akan terhapus!'
                    : 'Seluruh akun user murid akan terhapus!'}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed bg-rose-950/30 p-3 rounded-xl border border-rose-900/50">
              {deleteModalRole === 'semua' && (
                <>
                  Apakah Anda yakin ingin menghapus <span className="font-bold text-white">SEMUA AKUN PENGGUNA</span> (Guru, Murid, Admin)? Seluruh akun login tidak akan bisa diakses kembali hingga dibuat ulang.
                </>
              )}
              {deleteModalRole === 'guru' && (
                <>
                  Apakah Anda yakin ingin menghapus <span className="font-bold text-white">SELURUH AKUN USER GURU</span>? Seluruh akun guru tidak akan bisa diakses kembali hingga dibuat ulang.
                </>
              )}
              {deleteModalRole === 'siswa' && (
                <>
                  Apakah Anda yakin ingin menghapus <span className="font-bold text-white">SELURUH AKUN USER MURID</span>? Seluruh akun murid tidak akan bisa diakses kembali hingga dibuat ulang.
                </>
              )}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalRole(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold text-xs transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUsers}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-rose-950"
              >
                <Trash2 className="w-4 h-4" /> Ya, Hapus Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL CONFIRMATION RESET IDENTITAS --- */}
      {showResetIdentitasModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="p-3 bg-amber-950/80 rounded-xl border border-amber-800/50">
                <RotateCcw className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">Kosongkan / Reset Identitas</h3>
                <p className="text-xs text-amber-300 font-semibold">Reset seluruh informasi identitas kop madrasah</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed bg-amber-950/30 p-3 rounded-xl border border-amber-900/50">
              Apakah Anda yakin ingin <span className="font-bold text-white">MENGOSONGKAN SELURUH DATA IDENTITAS</span> sekolah/madrasah?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetIdentitasModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold text-xs transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmResetIdentitas}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-rose-950"
              >
                <Trash2 className="w-4 h-4" /> Ya, Kosongkan Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[100] bg-emerald-600 text-white px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-400 text-sm font-semibold animate-bounce max-w-md text-center">
          <CheckCircle2 className="w-5 h-5 text-emerald-200 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};


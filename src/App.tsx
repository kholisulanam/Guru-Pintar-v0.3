import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  SchoolSettings,
  TeacherItem,
  StudentItem,
  ClassItem,
  SubjectItem,
  ScheduleItem,
  Announcement,
  Assessment,
  AssessmentSubmission,
  StudentAttendance,
  TeacherAttendance,
  TeachingJournal,
  GradeRecord,
  LibraryBook,
  CalendarEvent
} from './types';

import {
  defaultSettings,
  defaultUsers,
  defaultAnnouncements,
  defaultStudentAttendances,
  defaultTeacherAttendances,
  defaultGradeRecords,
  defaultLibraryBooks,
  defaultCalendarEvents
} from './lib/initialData';

import { storageService, getTodayString } from './lib/storage';
import { onFirebaseConnectionChange } from './lib/firebase';
import {
  sanitizeAndDeduplicateTeachers,
  sanitizeAndDeduplicateClasses,
  sanitizeAndDeduplicateStudents,
  sanitizeAndDeduplicateSubjects,
  sanitizeAndDeduplicateSchedules
} from './lib/matchUtils';

import { Header } from './components/common/Header';
import { Sidebar, TabItem } from './components/navigation/Sidebar';
import { BottomNav } from './components/navigation/BottomNav';
import { LandingPage } from './components/common/LandingPage';
import { TeacherReminderListener } from './components/common/TeacherReminderListener';

import {
  LayoutDashboard,
  Users,
  Clock,
  FileCheck,
  BarChart3,
  Bell,
  Settings,
  UserCheck,
  CalendarCheck,
  BookOpen,
  Award,
  CheckCircle2,
  Calendar
} from 'lucide-react';

// Admin Components
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminPengelolaan } from './components/admin/AdminPengelolaan';
import { AdminJadwal } from './components/admin/AdminJadwal';
import { AdminAsesmen } from './components/admin/AdminAsesmen';
import { AdminLaporan } from './components/admin/AdminLaporan';
import { AdminPengumuman } from './components/admin/AdminPengumuman';
import { AdminPengaturan } from './components/admin/AdminPengaturan';
import { AdminKalender } from './components/admin/AdminKalender';

// Guru Components
import { GuruDashboard } from './components/guru/GuruDashboard';
import { GuruJadwal } from './components/guru/GuruJadwal';
import { GuruPresensi } from './components/guru/GuruPresensi';
import { GuruPresensiSiswa } from './components/guru/GuruPresensiSiswa';
import { GuruJurnal } from './components/guru/GuruJurnal';
import { GuruAsesmen } from './components/guru/GuruAsesmen';
import { GuruPenilaian } from './components/guru/GuruPenilaian';
import { GuruPengumuman } from './components/guru/GuruPengumuman';

// Siswa Components
import { SiswaDashboard } from './components/siswa/SiswaDashboard';
import { SiswaJadwal } from './components/siswa/SiswaJadwal';
import { SiswaPresensi } from './components/siswa/SiswaPresensi';
import { SiswaAsesmen } from './components/siswa/SiswaAsesmen';
import { SiswaPerpustakaan } from './components/siswa/SiswaPerpustakaan';
import { SiswaPengumuman } from './components/siswa/SiswaPengumuman';

// CBT Exam Modal
import { CbtExamModal } from './components/cbt/CbtExamModal';

const LEGACY_CLASS_IDS = new Set(['cls-10ipa1', 'cls-11ipa1', 'cls-12ipa1', 'cls-12ips1']);
const LEGACY_CLASS_NAMES = new Set([
  'x ipa 1', 'xi ipa 1', 'xii ipa 1', 'xii ips 1', 'x ips 1',
  'kelas x ipa 1', 'kelas xi ipa 1', 'kelas xii ipa 1', 'kelas xii ips 1', 'kelas x ips 1'
]);

function remapLegacyClassId(id: string | undefined): string {
  if (!id) return 'cls-10a';
  const clean = id.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (id === 'cls-10ipa1' || clean === '10ipa1' || clean === 'xipa1' || clean === 'xips1') return 'cls-10a';
  if (id === 'cls-11ipa1' || clean === '11ipa1' || clean === 'xiipa1') return 'cls-11a';
  if (id === 'cls-12ipa1' || clean === '12ipa1' || clean === 'xiiipa1') return 'cls-12a';
  if (id === 'cls-12ips1' || clean === '12ips1' || clean === 'xiiips1') return 'cls-12c';
  return id;
}

export default function App() {
  // Global State initialized with local storage fallback
  const [users, setUsers] = useState<User[]>(() => {
    const loaded = storageService.get<User[]>('users', defaultUsers);
    const baseList = Array.isArray(loaded) ? loaded : defaultUsers;
    return baseList.map((u) => {
      let updated = u;
      if (u.kelasId) {
        updated = { ...updated, kelasId: remapLegacyClassId(u.kelasId) };
      }
      if (u.role === 'siswa' && !updated.password) updated = { ...updated, password: updated.username || '12345678' };
      if (u.role === 'admin' && (updated.password === 'admin123' || updated.password === 'admin2026' || !updated.password)) {
        updated = { ...updated, password: 'admin#123' };
      }
      return updated;
    });
  });

  const [currentUser, setCurrentUser] = useState<User>(() => {
    const stored = storageService.get<User>('currentUser', users[0] || defaultUsers[0]);
    if (stored && stored.kelasId) {
      return { ...stored, kelasId: remapLegacyClassId(stored.kelasId) };
    }
    return stored || defaultUsers[0];
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() =>
    storageService.get('isLoggedIn', false)
  );

  const [activeTab, setActiveTab] = useState<string>('beranda');

  const [settings, setSettings] = useState<SchoolSettings>(() =>
    storageService.get('settings', defaultSettings)
  );

  const [teachers, setTeachers] = useState<TeacherItem[]>(() => {
    const stored = storageService.get<TeacherItem[]>('teachers', []);
    return sanitizeAndDeduplicateTeachers(stored || []);
  });

  const [classes, setClasses] = useState<ClassItem[]>(() => {
    const stored = storageService.get<ClassItem[]>('classes', []);
    const initTeachers = sanitizeAndDeduplicateTeachers(storageService.get<TeacherItem[]>('teachers', []));
    const cleaned = sanitizeAndDeduplicateClasses(stored || [], initTeachers);
    return cleaned;
  });

  const [students, setStudents] = useState<StudentItem[]>(() => {
    const stored = storageService.get<StudentItem[]>('students', []);
    const cleaned = sanitizeAndDeduplicateStudents(stored || []);
    const remapped = cleaned.map((s) => ({
      ...s,
      kelasId: remapLegacyClassId(s.kelasId),
    }));
    return remapped;
  });

  const [subjects, setSubjects] = useState<SubjectItem[]>(() => {
    const stored = storageService.get<SubjectItem[]>('subjects', []);
    return sanitizeAndDeduplicateSubjects(stored || []);
  });

  const [schedules, setSchedules] = useState<ScheduleItem[]>(() => {
    const stored = storageService.get<ScheduleItem[]>('schedules', []);
    const cleaned = sanitizeAndDeduplicateSchedules(stored || []);
    return cleaned.map((sch) => ({
      ...sch,
      kelasId: remapLegacyClassId(sch.kelasId),
    }));
  });

  const [announcements, setAnnouncements] = useState<Announcement[]>(() =>
    storageService.get('announcements', defaultAnnouncements)
  );

  const [assessments, setAssessments] = useState<Assessment[]>(() => {
    const stored = storageService.get<Assessment[]>('assessments', []);
    return (stored || [])
      .filter((a) => a && a.id !== 'asm-1' && a.id !== 'asm-2')
      .map((a) => ({
        ...a,
        kelasId: remapLegacyClassId(a.kelasId),
      }));
  });

  const [submissions, setSubmissions] = useState<AssessmentSubmission[]>(() =>
    storageService.get('submissions', [])
  );

  const [studentAttendances, setStudentAttendances] = useState<StudentAttendance[]>(() =>
    storageService.get<StudentAttendance[]>('studentAttendances', defaultStudentAttendances)
  );

  const [teacherAttendances, setTeacherAttendances] = useState<TeacherAttendance[]>(() =>
    storageService.get<TeacherAttendance[]>('teacherAttendances', defaultTeacherAttendances)
  );

  const [teachingJournals, setTeachingJournals] = useState<TeachingJournal[]>(() => {
    const stored = storageService.get<TeachingJournal[]>('teachingJournals', []);
    return (stored || [])
      .filter((tj) => tj && tj.id !== 'tj-1' && tj.id !== 'tj-2')
      .map((tj) => ({
        ...tj,
        kelasId: remapLegacyClassId(tj.kelasId),
      }));
  });

  const [gradeRecords, setGradeRecords] = useState<GradeRecord[]>(() => {
    const stored = storageService.get<GradeRecord[]>('gradeRecords', defaultGradeRecords);
    return stored.map((gr) => ({
      ...gr,
      kelasId: remapLegacyClassId(gr.kelasId),
    }));
  });

  const [libraryBooks, setLibraryBooks] = useState<LibraryBook[]>(() =>
    storageService.get('libraryBooks', defaultLibraryBooks)
  );

  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(() =>
    storageService.get('calendarEvents', defaultCalendarEvents)
  );

  // CBT Exam Modal State
  const [activeExam, setActiveExam] = useState<Assessment | null>(null);

  // Sidebar Drawer Open State
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [isFirebaseLive, setIsFirebaseLive] = useState<boolean>(true);

  useEffect(() => {
    const unsubConnection = onFirebaseConnectionChange((status) => {
      setIsFirebaseLive(status);
    });
    return () => unsubConnection();
  }, []);

  const teachersRef = useRef(teachers);
  useEffect(() => {
    teachersRef.current = teachers;
  }, [teachers]);

  // Real-time Cloud Firestore Subscriptions
  useEffect(() => {
    const unsubs = [
      storageService.subscribeRealtime<SchoolSettings>('settings', (d) => d && setSettings(d)),
      storageService.subscribeRealtime<TeacherItem[]>('teachers', (d) => {
        if (d && Array.isArray(d)) {
          const cleaned = sanitizeAndDeduplicateTeachers(d);
          setTeachers(cleaned);
        }
      }),
      storageService.subscribeRealtime<StudentItem[]>('students', (d) => {
        if (d && Array.isArray(d)) {
          const cleaned = sanitizeAndDeduplicateStudents(d);
          setStudents(cleaned);
        }
      }),
      storageService.subscribeRealtime<ClassItem[]>('classes', (d) => {
        if (d && Array.isArray(d)) {
          const availTeachers = teachersRef.current;
          const cleaned = sanitizeAndDeduplicateClasses(d, availTeachers);
          setClasses(cleaned);
        }
      }),
      storageService.subscribeRealtime<SubjectItem[]>('subjects', (d) => {
        if (d && Array.isArray(d)) {
          const cleaned = sanitizeAndDeduplicateSubjects(d);
          setSubjects(cleaned);
        }
      }),
      storageService.subscribeRealtime<ScheduleItem[]>('schedules', (d) => {
        if (d && Array.isArray(d)) {
          const cleaned = sanitizeAndDeduplicateSchedules(d);
          setSchedules(cleaned);
        }
      }),
      storageService.subscribeRealtime<Announcement[]>('announcements', (d) => d && setAnnouncements(d)),
      storageService.subscribeRealtime<Assessment[]>('assessments', (d) => {
        if (d && Array.isArray(d)) {
          setAssessments(d.filter((a) => a && a.id !== 'asm-1' && a.id !== 'asm-2'));
        }
      }),
      storageService.subscribeRealtime<AssessmentSubmission[]>('submissions', (d) => d && setSubmissions(d)),
      storageService.subscribeRealtime<StudentAttendance[]>('studentAttendances', (d) => d && setStudentAttendances(d)),
      storageService.subscribeRealtime<TeacherAttendance[]>('teacherAttendances', (d) => d && setTeacherAttendances(d)),
      storageService.subscribeRealtime<TeachingJournal[]>('teachingJournals', (d) => {
        if (d && Array.isArray(d)) {
          setTeachingJournals(d.filter((tj) => tj && tj.id !== 'tj-1' && tj.id !== 'tj-2'));
        }
      }),
      storageService.subscribeRealtime<GradeRecord[]>('gradeRecords', (d) => d && setGradeRecords(d)),
      storageService.subscribeRealtime<LibraryBook[]>('libraryBooks', (d) => d && setLibraryBooks(d)),
      storageService.subscribeRealtime<User[]>('users', (d) => d && setUsers(d)),
      storageService.subscribeRealtime<CalendarEvent[]>('calendarEvents', (d) => d && setCalendarEvents(d)),
    ];
    return () => unsubs.forEach((unsub) => unsub && unsub());
  }, []);

  useEffect(() => {
    storageService.saveCalendarEvents(calendarEvents);
  }, [calendarEvents]);

  // Sync to Storage on changes
  useEffect(() => {
    storageService.set('users', users);
  }, [users]);

  useEffect(() => {
    storageService.set('currentUser', currentUser);
  }, [currentUser]);

  useEffect(() => {
    storageService.set('isLoggedIn', isLoggedIn);
  }, [isLoggedIn]);

  useEffect(() => {
    storageService.set('settings', settings);
  }, [settings]);

  useEffect(() => {
    storageService.set('teachers', teachers);
  }, [teachers]);

  useEffect(() => {
    storageService.set('students', students);
  }, [students]);

  useEffect(() => {
    storageService.set('classes', classes);
  }, [classes]);

  useEffect(() => {
    storageService.set('subjects', subjects);
  }, [subjects]);

  useEffect(() => {
    storageService.set('schedules', schedules);
  }, [schedules]);

  useEffect(() => {
    storageService.set('announcements', announcements);
  }, [announcements]);

  useEffect(() => {
    storageService.set('assessments', assessments);
  }, [assessments]);

  useEffect(() => {
    storageService.set('submissions', submissions);
  }, [submissions]);

  useEffect(() => {
    storageService.set('studentAttendances', studentAttendances);
  }, [studentAttendances]);

  useEffect(() => {
    storageService.set('teacherAttendances', teacherAttendances);
  }, [teacherAttendances]);

  useEffect(() => {
    storageService.set('teachingJournals', teachingJournals);
  }, [teachingJournals]);

  useEffect(() => {
    storageService.set('gradeRecords', gradeRecords);
  }, [gradeRecords]);

  useEffect(() => {
    storageService.set('libraryBooks', libraryBooks);
  }, [libraryBooks]);

  // Login & Logout Handlers
  const handleSelectUserAndLogin = (user: User) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    setActiveTab('beranda');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  // Define Navigation Tabs based on Role
  const getRoleTabs = (): TabItem[] => {
    switch (currentUser.role) {
      case 'admin':
        return [
          { id: 'beranda', label: 'Beranda Admin', icon: <LayoutDashboard className="w-5 h-5" /> },
          { id: 'pengelolaan', label: 'Pengelolaan', icon: <Users className="w-5 h-5" /> },
          { id: 'jadwal', label: 'Jadwal Mengajar', icon: <Clock className="w-5 h-5" /> },
          { id: 'kalender', label: 'Kalender Kegiatan', icon: <Calendar className="w-5 h-5 text-indigo-400" /> },
          { id: 'asesmen', label: 'Pusat Asesmen', icon: <FileCheck className="w-5 h-5" /> },
          { id: 'laporan', label: 'Cetak Laporan', icon: <BarChart3 className="w-5 h-5" /> },
          { id: 'pengumuman', label: 'Pengumuman', icon: <Bell className="w-5 h-5" /> },
          { id: 'pengaturan', label: 'Pengaturan Sekolah', icon: <Settings className="w-5 h-5" /> },
        ];
      case 'guru':
        return [
          { id: 'beranda', label: 'Beranda Guru', icon: <LayoutDashboard className="w-5 h-5" /> },
          { id: 'jadwal', label: 'Jadwal Mengajar', icon: <Clock className="w-5 h-5" /> },
          { id: 'presensi_guru', label: 'Presensi Guru', icon: <UserCheck className="w-5 h-5" /> },
          { id: 'presensi_siswa', label: 'Presensi Murid', icon: <CalendarCheck className="w-5 h-5" /> },
          { id: 'jurnal', label: 'Jurnal Mengajar', icon: <BookOpen className="w-5 h-5" /> },
          { id: 'asesmen', label: 'Kelola Asesmen', icon: <FileCheck className="w-5 h-5" /> },
          { id: 'penilaian', label: 'Penilaian', icon: <Award className="w-5 h-5" /> },
          { id: 'pengumuman', label: 'Pengumuman', icon: <Bell className="w-5 h-5" /> },
        ];
      case 'siswa':
        return [
          { id: 'beranda', label: 'Beranda Murid', icon: <LayoutDashboard className="w-5 h-5" /> },
          { id: 'jadwal', label: 'Jadwal Pelajaran', icon: <Clock className="w-5 h-5" /> },
          { id: 'presensi', label: 'Presensi Kehadiran', icon: <CheckCircle2 className="w-5 h-5" /> },
          { id: 'asesmen', label: 'Ujian CBT & Tugas', icon: <FileCheck className="w-5 h-5" /> },
          { id: 'perpustakaan', label: 'Perpustakaan Digital', icon: <BookOpen className="w-5 h-5" /> },
          { id: 'pengumuman', label: 'Pengumuman', icon: <Bell className="w-5 h-5" /> },
        ];
    }
  };

  const roleTabs = getRoleTabs();

  // Finish CBT Exam Submission
  const handleFinishExam = (submission: AssessmentSubmission) => {
    setSubmissions((prev) => [...prev, submission]);
    setActiveExam(null);
    alert(`Ujian berhasil dikirim! Nilai Anda: ${submission.nilai.toFixed(1)}`);
  };

  // If NOT logged in, show the Landing Page with role options
  if (!isLoggedIn) {
    return (
      <LandingPage
        users={users}
        onSelectUserAndLogin={handleSelectUserAndLogin}
        settings={settings}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0d1a] text-slate-100 font-sans relative overflow-x-hidden">
      {/* Background Glow Orbs */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full filter blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full filter blur-[120px] pointer-events-none" />

      {/* Auto-Hidden Drawer Sidebar */}
      <Sidebar
        currentUser={currentUser}
        allUsers={users}
        onSwitchUser={(user) => setCurrentUser(user)}
        onLogout={handleLogout}
        settings={settings}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        roleTabs={roleTabs}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Layout */}
      <div className="relative z-10 flex flex-col min-h-screen justify-between transition-all duration-300">
        <div>
          {/* Header Bar */}
          <Header
            currentUser={currentUser}
            allUsers={users}
            onSwitchUser={(user) => setCurrentUser(user)}
            onLogout={handleLogout}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            settings={settings}
            roleTabs={roleTabs}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          />

          {/* Main Content View Container */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 md:pb-12">
            {/* ================= ADMIN ROLE VIEWS ================= */}
            {currentUser.role === 'admin' && (
              <>
                {activeTab === 'beranda' && (
                  <AdminDashboard
                    teachers={teachers}
                    students={students}
                    classes={classes}
                    subjects={subjects}
                    assessments={assessments}
                    teacherAttendances={teacherAttendances}
                    studentAttendances={studentAttendances}
                    gradeRecords={gradeRecords}
                    submissions={submissions}
                    calendarEvents={calendarEvents}
                    onNavigateTab={(tab) => setActiveTab(tab)}
                  />
                )}

                {activeTab === 'pengelolaan' && (
                  <AdminPengelolaan
                    teachers={teachers}
                    setTeachers={setTeachers}
                    students={students}
                    setStudents={setStudents}
                    classes={classes}
                    setClasses={setClasses}
                    subjects={subjects}
                    setSubjects={setSubjects}
                    libraryBooks={libraryBooks}
                    setLibraryBooks={setLibraryBooks}
                    users={users}
                    setUsers={setUsers}
                    settings={settings}
                    setSettings={setSettings}
                    schedules={schedules}
                    setSchedules={setSchedules}
                    calendarEvents={calendarEvents}
                    setCalendarEvents={setCalendarEvents}
                  />
                )}

                {activeTab === 'jadwal' && (
                  <AdminJadwal
                    schedules={schedules}
                    setSchedules={setSchedules}
                    teachers={teachers}
                    setTeachers={setTeachers}
                    subjects={subjects}
                    setSubjects={setSubjects}
                    classes={classes}
                    setClasses={setClasses}
                  />
                )}

                {activeTab === 'kalender' && (
                  <AdminKalender
                    events={calendarEvents}
                    setEvents={setCalendarEvents}
                    schedules={schedules}
                    teachers={teachers}
                    classes={classes}
                    subjects={subjects}
                  />
                )}

                {activeTab === 'asesmen' && (
                  <AdminAsesmen
                    currentUser={currentUser}
                    assessments={assessments}
                    setAssessments={setAssessments}
                    classes={classes}
                    subjects={subjects}
                    teachers={teachers}
                    students={students}
                    schedules={schedules}
                  />
                )}

                {activeTab === 'laporan' && (
                  <AdminLaporan
                    settings={settings}
                    studentAttendances={studentAttendances}
                    teacherAttendances={teacherAttendances}
                    teachingJournals={teachingJournals}
                    gradeRecords={gradeRecords}
                    classes={classes}
                    subjects={subjects}
                    teachers={teachers}
                    students={students}
                  />
                )}

                {activeTab === 'pengumuman' && (
                  <AdminPengumuman
                    announcements={announcements}
                    setAnnouncements={setAnnouncements}
                  />
                )}

                {activeTab === 'pengaturan' && (
                  <AdminPengaturan
                    settings={settings}
                    setSettings={setSettings}
                    users={users}
                    setUsers={setUsers}
                    classes={classes}
                  />
                )}
              </>
            )}

            {/* ================= GURU ROLE VIEWS ================= */}
            {currentUser.role === 'guru' && (
              <>
                {activeTab === 'beranda' && (
                  <GuruDashboard
                    currentUser={currentUser}
                    schedules={schedules}
                    teacherAttendances={teacherAttendances}
                    teachingJournals={teachingJournals}
                    assessments={assessments}
                    submissions={submissions}
                    students={students}
                    subjects={subjects}
                    classes={classes}
                    onNavigateTab={(tab) => setActiveTab(tab)}
                  />
                )}

                {activeTab === 'jadwal' && (
                  <GuruJadwal
                    currentUser={currentUser}
                    schedules={schedules}
                    subjects={subjects}
                    classes={classes}
                    teachers={teachers}
                  />
                )}

                {activeTab === 'presensi_guru' && (
                  <GuruPresensi
                    currentUser={currentUser}
                    settings={settings}
                    teacherAttendances={teacherAttendances}
                    setTeacherAttendances={setTeacherAttendances}
                  />
                )}

                {activeTab === 'presensi_siswa' && (
                  <GuruPresensiSiswa
                    currentUser={currentUser}
                    settings={settings}
                    students={students}
                    classes={classes}
                    studentAttendances={studentAttendances}
                    setStudentAttendances={setStudentAttendances}
                  />
                )}

                {activeTab === 'jurnal' && (
                  <GuruJurnal
                    currentUser={currentUser}
                    settings={settings}
                    classes={classes}
                    subjects={subjects}
                    teachers={teachers}
                    schedules={schedules}
                    teachingJournals={teachingJournals}
                    setTeachingJournals={setTeachingJournals}
                  />
                )}

                {activeTab === 'asesmen' && (
                  <GuruAsesmen
                    currentUser={currentUser}
                    assessments={assessments}
                    setAssessments={setAssessments}
                    classes={classes}
                    subjects={subjects}
                    teachers={teachers}
                    students={students}
                    schedules={schedules}
                  />
                )}

                {activeTab === 'penilaian' && (
                  <GuruPenilaian
                    currentUser={currentUser}
                    settings={settings}
                    students={students}
                    classes={classes}
                    subjects={subjects}
                    teachers={teachers}
                    schedules={schedules}
                    gradeRecords={gradeRecords}
                    setGradeRecords={setGradeRecords}
                  />
                )}

                {activeTab === 'pengumuman' && (
                  <GuruPengumuman
                    announcements={announcements}
                    setAnnouncements={setAnnouncements}
                  />
                )}
              </>
            )}

            {/* ================= SISWA ROLE VIEWS ================= */}
            {currentUser.role === 'siswa' && (
              <>
                {activeTab === 'beranda' && (
                  <SiswaDashboard
                    currentUser={currentUser}
                    schedules={schedules}
                    studentAttendances={studentAttendances}
                    announcements={announcements}
                    assessments={assessments}
                    submissions={submissions}
                    subjects={subjects}
                    classes={classes}
                    onStartExam={(asm) => setActiveExam(asm)}
                    onNavigateTab={(tab) => setActiveTab(tab)}
                  />
                )}

                {activeTab === 'jadwal' && (
                  <SiswaJadwal
                    currentUser={currentUser}
                    schedules={schedules}
                    subjects={subjects}
                    classes={classes}
                    teachers={teachers}
                  />
                )}

                {activeTab === 'presensi' && (
                  <SiswaPresensi
                    currentUser={currentUser}
                    studentAttendances={studentAttendances}
                  />
                )}

                {activeTab === 'asesmen' && (
                  <SiswaAsesmen
                    currentUser={currentUser}
                    assessments={assessments}
                    submissions={submissions}
                    subjects={subjects}
                    classes={classes}
                    schedules={schedules}
                    onStartExam={(asm) => setActiveExam(asm)}
                  />
                )}

                {activeTab === 'perpustakaan' && (
                  <SiswaPerpustakaan libraryBooks={libraryBooks} />
                )}

                {activeTab === 'pengumuman' && (
                  <SiswaPengumuman announcements={announcements} />
                )}
              </>
            )}
          </main>
        </div>

        {/* CBT Exam Modal Overlay */}
        {activeExam && (
          <CbtExamModal
            assessment={activeExam}
            currentUser={currentUser}
            onClose={() => setActiveExam(null)}
            onFinishExam={handleFinishExam}
          />
        )}

        {/* Modern Frosted Footer */}
        <footer className="border-t border-white/10 bg-white/5 backdrop-blur-md py-6 pb-24 mt-12 text-center text-xs text-indigo-200/90 font-medium space-y-1.5">
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

      {/* Teacher Auto-Reminder Listener (10-min pre-alert & real-time broadcast) */}
      <TeacherReminderListener
        calendarEvents={calendarEvents}
        schedules={schedules}
        teachers={teachers}
        classes={classes}
        subjects={subjects}
        currentUserName={currentUser?.name}
      />

      {/* Fixed Bottom Navigation Bar */}
      <BottomNav
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        roleTabs={roleTabs}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        isSidebarOpen={sidebarOpen}
      />
    </div>
  );
}

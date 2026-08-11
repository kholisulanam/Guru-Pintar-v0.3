import {
  SchoolSettings,
  TeacherItem,
  StudentItem,
  ClassItem,
  SubjectItem,
  ScheduleItem,
  Announcement,
  Assessment,
  TeacherAttendance,
  StudentAttendance,
  TeachingJournal,
  GradeRecord,
  LibraryBook,
  User,
  AssessmentSubmission,
  CalendarEvent
} from '../types';

import {
  defaultSettings,
  defaultUsers,
  defaultTeachers,
  defaultClasses,
  defaultStudents,
  defaultSubjects,
  defaultSchedules,
  defaultAnnouncements,
  defaultAssessments,
  defaultTeacherAttendances,
  defaultStudentAttendances,
  defaultTeachingJournals,
  defaultGradeRecords,
  defaultLibraryBooks,
  defaultCalendarEvents
} from './initialData';

import { syncToFirebase, subscribeToFirebaseKey, markInitialPayload, deduplicateItems } from './firebase';

const STORAGE_KEYS: Record<string, string> = {
  settings: 'guru_pintar_settings',
  currentUser: 'guru_pintar_current_user',
  users: 'guru_pintar_users',
  teachers: 'guru_pintar_teachers',
  classes: 'guru_pintar_classes',
  students: 'guru_pintar_students',
  subjects: 'guru_pintar_subjects',
  schedules: 'guru_pintar_schedules',
  announcements: 'guru_pintar_announcements',
  assessments: 'guru_pintar_assessments',
  teacherAttendances: 'guru_pintar_teacher_attendance',
  studentAttendances: 'guru_pintar_student_attendance',
  teachingJournals: 'guru_pintar_teaching_journal',
  gradeRecords: 'guru_pintar_grades',
  submissions: 'guru_pintar_submissions',
  libraryBooks: 'guru_pintar_library_books',
  calendarEvents: 'guru_pintar_calendar_events',
};

function getItem<T>(key: string, fallback: T): T {
  try {
    const rawKey = STORAGE_KEYS[key] || key;
    const raw = localStorage.getItem(rawKey);
    if (!raw) {
      const cleanFallback = Array.isArray(fallback) ? deduplicateItems(key, fallback) : fallback;
      markInitialPayload(key, cleanFallback);
      return cleanFallback as T;
    }
    const parsed = JSON.parse(raw);
    const cleanParsed = Array.isArray(parsed) ? deduplicateItems(key, parsed) : parsed;
    markInitialPayload(key, cleanParsed);
    return cleanParsed as T;
  } catch (e) {
    console.error(`Error loading key ${key} from localStorage`, e);
    const cleanFallback = Array.isArray(fallback) ? deduplicateItems(key, fallback) : fallback;
    markInitialPayload(key, cleanFallback);
    return cleanFallback as T;
  }
}

export const getTodayString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function setItem<T>(key: string, value: T, immediate = true): void {
  try {
    const rawKey = STORAGE_KEYS[key] || key;
    localStorage.setItem(rawKey, JSON.stringify(value));
    syncToFirebase(key, value, immediate);
  } catch (e) {
    console.error(`Error saving key ${key} to localStorage`, e);
  }
}

export const storageService = {
  get: getItem,
  set: setItem,

  subscribeRealtime: <T>(key: string, callback: (data: T) => void) => {
    return subscribeToFirebaseKey<T>(key, (data) => {
      if (data !== undefined && data !== null) {
        try {
          const rawKey = STORAGE_KEYS[key] || key;
          localStorage.setItem(rawKey, JSON.stringify(data));
        } catch (e) {}
        callback(data);
      }
    });
  },

  getSettings: (): SchoolSettings => {
    const data = getItem('settings', defaultSettings);
    if (data.latitude === -7.0863 || !data.latitude) {
      data.latitude = -7.108657;
      data.longitude = 113.669191;
      setItem('settings', data, true);
    }
    return data;
  },
  saveSettings: (data: SchoolSettings, immediate = true) => setItem('settings', data, immediate),

  getUsers: (): User[] => getItem('users', defaultUsers),
  saveUsers: (data: User[], immediate = true) => setItem('users', data, immediate),

  getTeachers: (): TeacherItem[] => getItem('teachers', defaultTeachers),
  saveTeachers: (data: TeacherItem[], immediate = true) => setItem('teachers', data, immediate),

  getClasses: (): ClassItem[] => getItem('classes', defaultClasses),
  saveClasses: (data: ClassItem[], immediate = true) => setItem('classes', data, immediate),

  getStudents: (): StudentItem[] => getItem('students', defaultStudents),
  saveStudents: (data: StudentItem[], immediate = true) => setItem('students', data, immediate),

  getSubjects: (): SubjectItem[] => getItem('subjects', defaultSubjects),
  saveSubjects: (data: SubjectItem[], immediate = true) => setItem('subjects', data, immediate),

  getSchedules: (): ScheduleItem[] => getItem('schedules', defaultSchedules),
  saveSchedules: (data: ScheduleItem[], immediate = true) => setItem('schedules', data, immediate),

  getAnnouncements: (): Announcement[] => getItem('announcements', defaultAnnouncements),
  saveAnnouncements: (data: Announcement[], immediate = true) => setItem('announcements', data, immediate),

  getAssessments: (): Assessment[] => getItem('assessments', defaultAssessments),
  saveAssessments: (data: Assessment[], immediate = true) => setItem('assessments', data, immediate),

  getTeacherAttendances: (): TeacherAttendance[] => getItem('teacherAttendances', defaultTeacherAttendances),
  saveTeacherAttendances: (data: TeacherAttendance[], immediate = true) => setItem('teacherAttendances', data, immediate),

  getStudentAttendances: (): StudentAttendance[] => getItem('studentAttendances', defaultStudentAttendances),
  saveStudentAttendances: (data: StudentAttendance[], immediate = true) => setItem('studentAttendances', data, immediate),

  getTeachingJournals: (): TeachingJournal[] => getItem('teachingJournals', defaultTeachingJournals),
  saveTeachingJournals: (data: TeachingJournal[], immediate = true) => setItem('teachingJournals', data, immediate),

  getGradeRecords: (): GradeRecord[] => getItem('gradeRecords', defaultGradeRecords),
  saveGradeRecords: (data: GradeRecord[], immediate = true) => setItem('gradeRecords', data, immediate),

  getLibraryBooks: (): LibraryBook[] => getItem('libraryBooks', defaultLibraryBooks),
  saveLibraryBooks: (data: LibraryBook[], immediate = true) => setItem('libraryBooks', data, immediate),

  getSubmissions: (): AssessmentSubmission[] => getItem('submissions', []),
  saveSubmissions: (data: AssessmentSubmission[], immediate = true) => setItem('submissions', data, immediate),

  getCalendarEvents: (): CalendarEvent[] => getItem('calendarEvents', defaultCalendarEvents),
  saveCalendarEvents: (data: CalendarEvent[], immediate = true) => setItem('calendarEvents', data, immediate),

  resetToDefault: () => {
    localStorage.clear();
  }
};

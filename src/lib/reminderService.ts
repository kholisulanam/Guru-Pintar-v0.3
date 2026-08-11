import { CalendarEvent, ScheduleItem, TeacherItem, ClassItem, SubjectItem } from '../types';
import { storageService, getTodayString } from './storage';

export interface ReminderBroadcastPayload {
  id: string;
  judul: string;
  deskripsi?: string;
  tanggal: string;
  jamMulai?: string;
  lokasi?: string;
  penanggungJawab?: string;
  senderName?: string;
  timestamp: number;
  type: 'automatic_10min' | 'manual_broadcast';
  snoozedUntil?: number;
}

// Audio Chime Generator using Web Audio API
export const playReminderChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // Tone 1: E5 (659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.35, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.4);

    // Tone 2: A5 (880.00 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.2);
    gain2.gain.setValueAtTime(0.4, now + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.2);
    osc2.stop(now + 0.7);

    // Tone 3: C6 (1046.50 Hz) - High accent
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(1046.50, now + 0.45);
    gain3.gain.setValueAtTime(0.45, now + 0.45);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.45);
    osc3.stop(now + 1.1);
  } catch (e) {
    console.warn('Web Audio Chime error:', e);
  }
};

// Browser Notification Handler
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
};

export const sendBrowserNotification = (title: string, body: string) => {
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'guru-reminder-' + Date.now(),
      });
    } catch (e) {
      console.warn('Browser Notification Error:', e);
    }
  }
};

// Realtime Broadcast Function to all devices
export const broadcastReminderToAll = (payload: ReminderBroadcastPayload) => {
  storageService.set('broadcast_reminder', payload, true);
};

// Convert "HH:mm" or "HH.mm" to minutes from midnight
export const parseTimeToMinutes = (timeStr?: string): number | null => {
  if (!timeStr) return null;
  const cleanStr = timeStr.trim().replace('.', ':');
  const match = cleanStr.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  return hours * 60 + minutes;
};

// Helper to check day of week name in Indonesian
export const getIndonesianDayName = (date: Date): string => {
  const dayIndex = date.getDay(); // 0 = Sunday
  const days = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return days[dayIndex] || 'Ahad';
};

// Set of already notified event IDs in this browser session to avoid repeating every 10s
const notifiedEventsThisSession = new Set<string>();

export const check10MinUpcomingEvents = (
  _calendarEvents: CalendarEvent[],
  _schedules: ScheduleItem[],
  _teachers: TeacherItem[],
  _classes: ClassItem[],
  _subjects: SubjectItem[],
  _senderName = 'Sistem Auto-Reminder'
): ReminderBroadcastPayload | null => {
  // Automatic 10-minute reminders have been disabled per user request
  return null;
};

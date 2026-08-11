import React, { useEffect, useState, useRef } from 'react';
import {
  BellRing,
  Volume2,
  Clock,
  MapPin,
  UserCheck,
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  ReminderBroadcastPayload,
  playReminderChime,
  requestNotificationPermission,
  sendBrowserNotification,
  check10MinUpcomingEvents
} from '../../lib/reminderService';
import { storageService } from '../../lib/storage';
import {
  CalendarEvent,
  ScheduleItem,
  TeacherItem,
  ClassItem,
  SubjectItem
} from '../../types';

interface TeacherReminderListenerProps {
  calendarEvents: CalendarEvent[];
  schedules: ScheduleItem[];
  teachers: TeacherItem[];
  classes: ClassItem[];
  subjects: SubjectItem[];
  currentUserName?: string;
}

export const TeacherReminderListener: React.FC<TeacherReminderListenerProps> = ({
  calendarEvents,
  schedules,
  teachers,
  classes,
  subjects,
  currentUserName = 'Guru / Staf'
}) => {
  const [activeReminder, setActiveReminder] = useState<ReminderBroadcastPayload | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'default'
  );
  const [autoReminderEnabled, setAutoReminderEnabled] = useState<boolean>(false);
  const lastProcessedTimestampRef = useRef<number>(0);

  // 1. Subscribe to Real-time Broadcast Reminders
  useEffect(() => {
    const unsub = storageService.subscribeRealtime<ReminderBroadcastPayload>('broadcast_reminder', (payload) => {
      if (payload && payload.timestamp && payload.timestamp > lastProcessedTimestampRef.current) {
        lastProcessedTimestampRef.current = payload.timestamp;
        setActiveReminder(payload);

        // Play audio chime chime & browser notification
        playReminderChime();
        const notificationText = `${payload.judul} - ${payload.jamMulai || ''} (${payload.lokasi || 'Ruang KBM'})`;
        sendBrowserNotification('⏰ REMINDER GURU MAS AL-AMIEN', notificationText);
      }
    });

    return () => {
      if (unsub) unsub();
    };
  }, []);

  // 2. Periodic background 15-second timer for 10-minute pre-alerts
  useEffect(() => {
    if (!autoReminderEnabled) return;

    const interval = setInterval(() => {
      const triggered = check10MinUpcomingEvents(
        calendarEvents,
        schedules,
        teachers,
        classes,
        subjects,
        currentUserName
      );

      if (triggered) {
        // Triggered auto reminder handled inside check10MinUpcomingEvents via broadcastToAll
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [calendarEvents, schedules, teachers, classes, subjects, autoReminderEnabled, currentUserName]);

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
    if (granted) {
      sendBrowserNotification('✅ Notifikasi Aktif', 'Notifikasi reminder 10 menit kegiatan guru telah berhasil diaktifkan!');
      playReminderChime();
    }
  };

  const handleTestSound = () => {
    playReminderChime();
  };

  const handleDismiss = () => {
    setActiveReminder(null);
  };

  const handleSnooze = () => {
    if (activeReminder) {
      setActiveReminder(null);
      // Re-trigger in 5 minutes
      setTimeout(() => {
        playReminderChime();
        setActiveReminder({
          ...activeReminder,
          judul: `[TUNDA] ${activeReminder.judul}`,
          timestamp: Date.now()
        });
      }, 5 * 60 * 1000);
    }
  };

  return (
    <>
      {/* Floating Active Reminder Banner / Modal */}
      {activeReminder && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md w-[calc(100vw-2.5rem)] animate-bounce-short">
          <div className="bg-slate-900 border-2 border-amber-500/80 rounded-3xl p-5 shadow-2xl shadow-amber-950/60 text-slate-100 relative overflow-hidden backdrop-blur-lg">
            {/* Ambient Background Glow */}
            <div className="absolute -right-12 -top-12 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -left-12 -bottom-12 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-start justify-between gap-3 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/40 animate-pulse">
                  <BellRing className="w-6 h-6 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-400 tracking-wider uppercase">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Reminder 10 Menit Kegiatan</span>
                  </div>
                  <h4 className="font-extrabold text-base text-white leading-tight mt-0.5">
                    {activeReminder.judul}
                  </h4>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDismiss}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Details Card */}
            <div className="mt-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 space-y-2 relative z-10 text-xs">
              {activeReminder.jamMulai && (
                <div className="flex items-center gap-2 text-indigo-300 font-semibold">
                  <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Waktu / Jam Mulai: <strong className="text-white font-mono text-sm">{activeReminder.jamMulai} WIB</strong></span>
                </div>
              )}

              {activeReminder.lokasi && (
                <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                  <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Lokasi: <strong className="text-white">{activeReminder.lokasi}</strong></span>
                </div>
              )}

              {activeReminder.penanggungJawab && (
                <div className="flex items-center gap-2 text-amber-300 font-semibold">
                  <UserCheck className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Penanggung Jawab / Guru: <strong className="text-white">{activeReminder.penanggungJawab}</strong></span>
                </div>
              )}

              {activeReminder.deskripsi && (
                <p className="text-slate-300 pt-1 border-t border-slate-800/80 italic leading-relaxed">
                  "{activeReminder.deskripsi}"
                </p>
              )}
            </div>

            {/* Permission Prompt if needed */}
            {permissionStatus !== 'granted' && (
              <div className="mt-3 bg-indigo-950/60 border border-indigo-800/60 rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs">
                <span className="text-indigo-200">Aktifkan notifikasi browser perangkat Anda?</span>
                <button
                  type="button"
                  onClick={handleRequestPermission}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition shrink-0"
                >
                  Izinkan Notifikasi
                </button>
              </div>
            )}

            {/* Actions */}
            <div className="mt-4 flex items-center justify-between gap-2 relative z-10">
              <button
                type="button"
                onClick={handleTestSound}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition border border-slate-700"
                title="Tes nada bel reminder"
              >
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Tes Suara</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSnooze}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold rounded-xl text-xs transition border border-amber-500/30"
                >
                  Tunda 5 Min
                </button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-xs shadow-md transition"
                >
                  Mengerti
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

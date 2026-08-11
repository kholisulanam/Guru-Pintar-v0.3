import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

let connectionStatusListeners: ((isConnected: boolean, statusText?: string) => void)[] = [];
let isConnected = true;
let isQuotaExceeded = false;
let currentStatusText = 'Firebase Live On';

// Cache for last synced JSON strings to prevent redundant writes and infinite echo loops
const lastSyncedPayloadMap = new Map<string, string>();
const debounceTimersMap = new Map<string, any>();
const activeListenersMap = new Map<string, Unsubscribe>();

export function markInitialPayload(key: string, data: any) {
  try {
    if (!lastSyncedPayloadMap.has(key)) {
      lastSyncedPayloadMap.set(key, JSON.stringify(data));
    }
  } catch (e) {}
}

export function onFirebaseConnectionChange(callback: (status: boolean, text?: string) => void) {
  connectionStatusListeners.push(callback);
  callback(isConnected, currentStatusText);
  return () => {
    connectionStatusListeners = connectionStatusListeners.filter((l) => l !== callback);
  };
}

function notifyConnectionStatus(status: boolean, text?: string) {
  isConnected = status;
  if (text) currentStatusText = text;
  connectionStatusListeners.forEach((listener) => listener(status, currentStatusText));
}

function triggerQuotaExceededFallback() {
  if (isQuotaExceeded) return;
  isQuotaExceeded = true;
  notifyConnectionStatus(false, 'Local Storage Mode');

  // Cancel all pending write debounce timers
  debounceTimersMap.forEach((timer) => clearTimeout(timer));
  debounceTimersMap.clear();

  // Unsubscribe all active realtime snapshot listeners to halt backend retries
  activeListenersMap.forEach((unsub) => {
    try {
      unsub();
    } catch (e) {}
  });
  activeListenersMap.clear();

  console.warn('[Firestore] Project quota limit reached. Switched seamlessly to Local Storage mode.');
}

// Global window error listener for unhandled Firestore promise rejections
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = String(event.reason?.message || event.reason || '').toLowerCase();
    if (reason.includes('quota') || reason.includes('resource-exhausted')) {
      triggerQuotaExceededFallback();
      event.preventDefault(); // Suppress unhandled rejection errors in console
    }
  });
}

// Helper to deduplicate array items strictly by item.id
export function deduplicateItems<T>(key: string, items: T[]): T[] {
  if (!Array.isArray(items)) return items;
  const seen = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    if (!item || typeof item !== 'object') {
      result.push(item);
      continue;
    }
    const obj = item as any;
    if (!obj.id) {
      result.push(item);
      continue;
    }
    const idStr = String(obj.id).trim();
    if (seen.has(idStr)) {
      continue; // Skip duplicate record with identical ID
    }
    seen.add(idStr);
    result.push(item);
  }
  return result;
}

export function syncToFirebase(key: string, data: any, immediate = true) {
  if (isQuotaExceeded) return; // Seamless fallback to Local Storage mode if Firestore quota is exceeded

  try {
    let cleanData = data;
    if (Array.isArray(data)) {
      cleanData = deduplicateItems(key, data);
    }
    const serialized = JSON.stringify(cleanData);

    // Skip if unchanged
    if (lastSyncedPayloadMap.get(key) === serialized) {
      return;
    }

    // Cancel existing pending debounce timer if any
    if (debounceTimersMap.has(key)) {
      clearTimeout(debounceTimersMap.get(key));
      debounceTimersMap.delete(key);
    }

    const performSync = async () => {
      if (isQuotaExceeded) return;

      try {
        const docRef = doc(db, 'app_data', key);
        lastSyncedPayloadMap.set(key, serialized);
        await setDoc(docRef, { payload: cleanData, updatedAt: new Date().toISOString() });
        notifyConnectionStatus(true, 'Firebase Live On');
      } catch (err: any) {
        const errMsg = String(err?.message || err || '').toLowerCase();
        const errCode = String(err?.code || '').toLowerCase();

        if (
          errMsg.includes('quota') ||
          errMsg.includes('resource-exhausted') ||
          errCode.includes('resource-exhausted') ||
          errMsg.includes('permission') ||
          errCode.includes('permission-denied')
        ) {
          triggerQuotaExceededFallback();
        } else {
          console.error(`Firebase sync error for ${key}:`, err);
        }
      }
    };

    if (immediate) {
      performSync();
    } else {
      const timer = setTimeout(performSync, 500);
      debounceTimersMap.set(key, timer);
    }
  } catch (err) {
    console.error(`Firebase serialization error for ${key}:`, err);
  }
}

export async function loadFromFirebase<T>(key: string): Promise<T | null> {
  if (isQuotaExceeded) return null;

  try {
    const docRef = doc(db, 'app_data', key);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      notifyConnectionStatus(true, 'Firebase Live On');
      const val = snap.data().payload;
      if (val !== undefined) {
        lastSyncedPayloadMap.set(key, JSON.stringify(val));
        return val as T;
      }
    }
  } catch (err: any) {
    const errMsg = String(err?.message || err || '').toLowerCase();
    const errCode = String(err?.code || '').toLowerCase();

    if (
      errMsg.includes('quota') ||
      errMsg.includes('resource-exhausted') ||
      errCode.includes('resource-exhausted') ||
      errMsg.includes('permission') ||
      errCode.includes('permission-denied')
    ) {
      triggerQuotaExceededFallback();
    } else {
      console.warn(`Firebase load warning for ${key}:`, err);
    }
  }
  return null;
}

const STORAGE_KEYS_MAP: Record<string, string> = {
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
};

export function subscribeToFirebaseKey<T>(key: string, onData: (data: T) => void) {
  if (isQuotaExceeded) return () => {};

  try {
    const docRef = doc(db, 'app_data', key);
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        notifyConnectionStatus(true, 'Firebase Live On');

        const rawKey = STORAGE_KEYS_MAP[key] || key;
        const localRaw = typeof window !== 'undefined' ? localStorage.getItem(rawKey) : null;
        let localVal: any = null;
        if (localRaw) {
          try {
            localVal = JSON.parse(localRaw);
          } catch (e) {}
        }

        if (snapshot.exists()) {
          let cloudVal = snapshot.data()?.payload;
          if (cloudVal !== undefined) {
            if (Array.isArray(cloudVal)) {
              cloudVal = deduplicateItems(key, cloudVal);
            }

            const cloudSerialized = JSON.stringify(cloudVal);
            if (lastSyncedPayloadMap.get(key) !== cloudSerialized) {
              lastSyncedPayloadMap.set(key, cloudSerialized);
              try {
                localStorage.setItem(rawKey, cloudSerialized);
              } catch (e) {}
              onData(cloudVal as T);
            }
          }
        } else {
          // Document missing in cloud: seed to Firestore from local storage or initial value
          if (localVal !== null && localVal !== undefined) {
            let cleanLocal = localVal;
            if (Array.isArray(cleanLocal)) {
              cleanLocal = deduplicateItems(key, cleanLocal);
            }
            if (Array.isArray(cleanLocal) ? cleanLocal.length > 0 : true) {
              const localSerialized = JSON.stringify(cleanLocal);
              lastSyncedPayloadMap.set(key, localSerialized);
              onData(cleanLocal as T);

              // Seed document in Firestore so it persists globally
              if (!isQuotaExceeded) {
                setDoc(docRef, { payload: cleanLocal, updatedAt: new Date().toISOString() }).catch((err) => {
                  console.warn(`Initial seed error for ${key}:`, err);
                });
              }
            }
          }
        }
      },
      (error: any) => {
        const errMsg = String(error?.message || error || '').toLowerCase();
        const errCode = String(error?.code || '').toLowerCase();

        if (
          errMsg.includes('quota') ||
          errMsg.includes('resource-exhausted') ||
          errCode.includes('resource-exhausted') ||
          errMsg.includes('permission') ||
          errCode.includes('permission-denied')
        ) {
          triggerQuotaExceededFallback();
        } else {
          console.warn(`Firebase listener error for ${key}:`, error);
        }
      }
    );

    activeListenersMap.set(key, unsubscribe);
    return () => {
      activeListenersMap.delete(key);
      try {
        unsubscribe();
      } catch (e) {}
    };
  } catch (err: any) {
    const errMsg = String(err?.message || err || '').toLowerCase();
    if (errMsg.includes('quota') || errMsg.includes('resource-exhausted')) {
      triggerQuotaExceededFallback();
    }
    return () => {};
  }
}

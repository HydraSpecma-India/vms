import { supabase } from './supabase';

export interface PendingVisitor {
  id: string; // unique local ID
  pass_id: string;
  full_name: string;
  mobile: string;
  email?: string;
  company?: string;
  purpose?: string;
  who_to_meet?: string;
  host_department?: string;
  host_title?: string;
  number_of_visitors: number;
  check_in_time: string;
  status: string;
  photo_url?: string;
  hostEmail?: string;
  createdAt: number;
}

const DB_NAME = 'VMS_Offline_DB';
const STORE_NAME = 'pending_visitors';

// Initialize IndexedDB for offline queue
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = (event: any) => resolve(event.target.result);
    request.onerror = (event: any) => reject(event.target.error);
  });
}

// Add visitor to offline queue
export async function saveVisitorOffline(visitorData: Omit<PendingVisitor, 'id' | 'createdAt'>): Promise<PendingVisitor> {
  const db = await openDB();
  const pendingItem: PendingVisitor = {
    ...visitorData,
    id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    createdAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.add(pendingItem);
    req.onsuccess = () => resolve(pendingItem);
    req.onerror = (e: any) => reject(e.target.error);
  });
}

// Get all pending offline visitors
export async function getPendingOfflineVisitors(): Promise<PendingVisitor[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (e: any) => reject(e.target.error);
    });
  } catch (err) {
    console.error('Failed to get offline visitors:', err);
    return [];
  }
}

// Remove visitor from offline queue after successful sync
export async function removePendingVisitor(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = (e: any) => reject(e.target.error);
  });
}

// Sync all pending offline records to Supabase when online
export async function syncOfflineQueue(
  onProgress?: (syncedCount: number, totalCount: number) => void
): Promise<{ success: boolean; syncedCount: number; errors: any[] }> {
  if (typeof window === 'undefined' || !navigator.onLine) {
    return { success: false, syncedCount: 0, errors: ['Device is offline'] };
  }

  const pendingList = await getPendingOfflineVisitors();
  if (pendingList.length === 0) {
    return { success: true, syncedCount: 0, errors: [] };
  }

  console.log(`🌐 Online connection detected! Auto-syncing ${pendingList.length} offline visitor(s)...`);

  let syncedCount = 0;
  const errors: any[] = [];

  for (const item of pendingList) {
    try {
      let finalPhotoUrl = item.photo_url || '';

      // Upload base64 photo to Supabase storage if needed
      if (item.photo_url && item.photo_url.startsWith('data:image')) {
        try {
          const res = await fetch(item.photo_url);
          const blob = await res.blob();
          const fileName = `${item.pass_id}.jpg`;
          const { error: uploadErr } = await supabase.storage
            .from('visitor-photos')
            .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });

          if (!uploadErr) {
            const { data: publicUrlData } = supabase.storage
              .from('visitor-photos')
              .getPublicUrl(fileName);
            finalPhotoUrl = publicUrlData.publicUrl;
          }
        } catch (photoErr) {
          console.warn('Could not upload offline photo, keeping base64 fallback:', photoErr);
        }
      }

      // Upsert record into Supabase `visitors` table
      const { error: dbError } = await supabase.from('visitors').upsert([
        {
          pass_id: item.pass_id,
          full_name: item.full_name,
          mobile: item.mobile,
          email: item.email || '',
          company: item.company || '',
          purpose: item.purpose || 'General',
          who_to_meet: item.who_to_meet || '',
          host_department: item.host_department || '',
          host_title: item.host_title || '',
          number_of_visitors: item.number_of_visitors || 1,
          check_in_time: item.check_in_time,
          status: item.status || 'active',
          photo_url: finalPhotoUrl,
        },
      ]);

      if (dbError) throw dbError;

      // Trigger host email notification
      if (item.hostEmail) {
        try {
          await fetch('/api/notify-host', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              hostEmail: item.hostEmail,
              visitor: {
                ...item,
                photo_url: finalPhotoUrl,
              },
            }),
          });
        } catch (emailErr) {
          console.warn('Failed to send host notification for offline synced visitor:', emailErr);
        }
      }

      // Remove item from IndexedDB after successful sync
      await removePendingVisitor(item.id);
      syncedCount++;
      if (onProgress) onProgress(syncedCount, pendingList.length);
    } catch (err: any) {
      console.error(`Failed to sync offline visitor ${item.pass_id}:`, err);
      errors.push(err);
    }
  }

  return {
    success: errors.length === 0,
    syncedCount,
    errors,
  };
}

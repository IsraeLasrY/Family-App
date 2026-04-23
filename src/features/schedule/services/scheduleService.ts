import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../../core/api/firebase';
import { Schedule } from '../../../types';

export function subscribeToSchedules(
  familyId: string,
  onUpdate: (schedules: Schedule[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'Schedules'),
    where('familyId', '==', familyId)
  );
  return onSnapshot(q, (snap) => {
    const schedules = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Schedule));
    onUpdate(schedules);
  });
}

export async function addSchedule(
  familyId: string,
  userId: string,
  activityType: string,
  startTime: Date,
  endTime: Date,
  repeat: Schedule['repeat']
): Promise<void> {
  await addDoc(collection(db, 'Schedules'), {
    familyId,
    userId,
    activityType,
    startTime,
    endTime,
    repeat,
    isApproved: true,
    createdAt: serverTimestamp(),
  });
}

export async function approveSchedule(scheduleId: string): Promise<void> {
  await updateDoc(doc(db, 'Schedules', scheduleId), { isApproved: true });
}

export async function deleteSchedule(scheduleId: string): Promise<void> {
  await deleteDoc(doc(db, 'Schedules', scheduleId));
}

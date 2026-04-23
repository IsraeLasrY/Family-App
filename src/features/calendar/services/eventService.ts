import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../../core/api/firebase';
import { Event } from '../../../types';
import { notifyFamilyMembers } from '../../notifications/services/notificationService';

export function subscribeToEvents(
  familyId: string,
  onUpdate: (events: Event[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'Events'),
    where('familyId', '==', familyId),
    orderBy('date', 'asc')
  );

  return onSnapshot(q, (snap) => {
    const events = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Event));
    onUpdate(events);
  });
}

export async function addEvent(
  familyId: string,
  createdBy: string,
  title: string,
  date: Date,
  category: Event['category']
): Promise<void> {
  await addDoc(collection(db, 'Events'), {
    familyId,
    createdBy,
    title,
    date,
    category,
    createdAt: serverTimestamp(),
  });
  notifyFamilyMembers(familyId, 'אירוע חדש 📅', title, createdBy);
}

export async function updateEvent(
  eventId: string,
  title: string,
  date: Date,
  category: Event['category']
): Promise<void> {
  await updateDoc(doc(db, 'Events', eventId), { title, date, category });
}

export async function deleteEvent(eventId: string): Promise<void> {
  await deleteDoc(doc(db, 'Events', eventId));
}

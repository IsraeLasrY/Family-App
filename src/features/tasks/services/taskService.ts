import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  doc,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../../core/api/firebase';
import { Task } from '../../../types';
import { notifyUser } from '../../notifications/services/notificationService';

export function subscribeToTasks(
  familyId: string,
  onUpdate: (tasks: Task[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'Tasks'),
    where('familyId', '==', familyId),
    orderBy('dueDate', 'asc')
  );

  return onSnapshot(q, (snap) => {
    const tasks = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Task));
    onUpdate(tasks);
  });
}

export async function addTask(
  familyId: string,
  title: string,
  assignedTo: string,
  dueDate: Date,
  points: number,
  isRecurring: boolean
): Promise<void> {
  await addDoc(collection(db, 'Tasks'), {
    familyId,
    title,
    assignedTo,
    dueDate,
    points,
    isRecurring,
    status: 'todo',
    completedAt: null,
    createdAt: serverTimestamp(),
  });
  notifyUser(assignedTo, 'משימה חדשה 📋', title);
}

export async function updateTaskStatus(
  taskId: string,
  status: Task['status']
): Promise<void> {
  await updateDoc(doc(db, 'Tasks', taskId), {
    status,
    completedAt: status === 'done' ? serverTimestamp() : null,
  });
}

// Called on app open — resets recurring tasks completed before today
export async function resetDailyTasks(familyId: string): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const q = query(
    collection(db, 'Tasks'),
    where('familyId', '==', familyId),
    where('isRecurring', '==', true),
    where('status', '==', 'done')
  );

  const snap = await getDocs(q);
  const toReset = snap.docs.filter((d) => {
    const completedAt = d.data().completedAt?.toDate?.();
    return completedAt && completedAt < today;
  });

  await Promise.all(
    toReset.map((d) => updateDoc(d.ref, { status: 'todo', completedAt: null }))
  );
}

export async function deleteTask(taskId: string): Promise<void> {
  await deleteDoc(doc(db, 'Tasks', taskId));
}
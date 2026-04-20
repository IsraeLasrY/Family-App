import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../../core/api/firebase';
import { Transaction, BudgetLimit } from '../../../types';

export function subscribeToTransactions(
  familyId: string,
  onUpdate: (transactions: Transaction[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'Transactions'),
    where('familyId', '==', familyId),
    orderBy('date', 'desc')
  );
  return onSnapshot(q, (snap) => {
    const transactions = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Transaction));
    onUpdate(transactions);
  });
}

export async function addTransaction(
  familyId: string,
  amount: number,
  type: 'income' | 'expense',
  category: string,
  date: Date,
  description: string,
  addedBy: string
): Promise<void> {
  await addDoc(collection(db, 'Transactions'), {
    familyId,
    amount,
    type,
    category,
    date: Timestamp.fromDate(date),
    description,
    addedBy,
    createdAt: serverTimestamp(),
  });
}

export async function deleteTransaction(transactionId: string): Promise<void> {
  await deleteDoc(doc(db, 'Transactions', transactionId));
}

export function subscribeToBudgetLimits(
  familyId: string,
  onUpdate: (limits: BudgetLimit[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'BudgetLimits'),
    where('familyId', '==', familyId)
  );
  return onSnapshot(q, (snap) => {
    const limits = snap.docs.map((d) => ({ id: d.id, ...d.data() } as BudgetLimit));
    onUpdate(limits);
  });
}

export async function setBudgetLimit(
  familyId: string,
  category: string,
  monthlyLimit: number
): Promise<void> {
  const q = query(
    collection(db, 'BudgetLimits'),
    where('familyId', '==', familyId),
    where('category', '==', category)
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    await setDoc(snap.docs[0].ref, { familyId, category, monthlyLimit });
  } else {
    await addDoc(collection(db, 'BudgetLimits'), { familyId, category, monthlyLimit });
  }
}

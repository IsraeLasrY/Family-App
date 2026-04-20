import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../../core/api/firebase';
import { ShoppingItem } from '../../../types';

export function subscribeToShoppingItems(
  familyId: string,
  onUpdate: (items: ShoppingItem[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'Shopping'),
    where('familyId', '==', familyId),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ShoppingItem));
    onUpdate(items);
  });
}

export async function addShoppingItem(
  familyId: string,
  addedBy: string,
  name: string,
  quantity: number
): Promise<void> {
  await addDoc(collection(db, 'Shopping'), {
    familyId,
    addedBy,
    name,
    quantity,
    isBought: false,
    createdAt: serverTimestamp(),
  });
}

export async function toggleBought(itemId: string, isBought: boolean): Promise<void> {
  await updateDoc(doc(db, 'Shopping', itemId), { isBought });
}

export async function deleteShoppingItem(itemId: string): Promise<void> {
  await deleteDoc(doc(db, 'Shopping', itemId));
}

export async function deleteAllBought(items: ShoppingItem[]): Promise<void> {
  const bought = items.filter((i) => i.isBought);
  await Promise.all(bought.map((i) => deleteDoc(doc(db, 'Shopping', i.id))));
}

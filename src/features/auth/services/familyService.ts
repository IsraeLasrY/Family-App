import {
  doc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../../core/api/firebase';
import { Family } from '../../../types';

function generateInviteCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function createFamily(familyName: string, adminId: string): Promise<Family> {
  const familyRef = doc(collection(db, 'Families'));
  const inviteCode = generateInviteCode();

  const family = {
    id: familyRef.id,
    name: familyName,
    inviteCode,
    adminId,
    createdAt: serverTimestamp(),
  };

  await setDoc(familyRef, family);
  await updateDoc(doc(db, 'Users', adminId), { familyId: familyRef.id });

  return family as Family;
}

export async function joinFamily(inviteCode: string, userId: string): Promise<Family> {
  const q = query(collection(db, 'Families'), where('inviteCode', '==', inviteCode.trim()));
  const snap = await getDocs(q);

  if (snap.empty) {
    throw new Error('קוד הזמנה לא נמצא. בדוק את הקוד ונסה שוב.');
  }

  const familyDoc = snap.docs[0];
  const family = { id: familyDoc.id, ...familyDoc.data() } as Family;

  await updateDoc(doc(db, 'Users', userId), { familyId: family.id });

  return family;
}

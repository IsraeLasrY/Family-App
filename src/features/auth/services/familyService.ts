import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../../core/api/firebase';
import { Family, FamilyUser } from '../../../types';

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

export async function getFamily(familyId: string): Promise<Family | null> {
  const snap = await getDoc(doc(db, 'Families', familyId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Family;
}

export async function getFamilyMembers(familyId: string): Promise<FamilyUser[]> {
  const q = query(collection(db, 'Users'), where('familyId', '==', familyId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ uid: d.id, ...d.data() } as FamilyUser));
}

export async function updateUserName(userId: string, name: string): Promise<void> {
  await updateDoc(doc(db, 'Users', userId), { name });
}

export async function removeFamilyMember(memberId: string): Promise<void> {
  await updateDoc(doc(db, 'Users', memberId), { familyId: null });
}

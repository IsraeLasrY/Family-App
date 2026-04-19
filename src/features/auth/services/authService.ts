import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../../core/api/firebase';
import { FamilyUser } from '../../../types';

export async function registerUser(
  email: string,
  password: string,
  name: string,
  role: 'parent' | 'child' = 'parent'
): Promise<FirebaseUser> {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);

  await setDoc(doc(db, 'Users', user.uid), {
    familyId: '',
    name,
    email,
    role,
    avatarUrl: '',
  } satisfies Omit<FamilyUser, 'id'>);

  return user;
}

export async function signIn(email: string, password: string): Promise<FirebaseUser> {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export async function getUserDoc(uid: string): Promise<FamilyUser | null> {
  const snap = await getDoc(doc(db, 'Users', uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as FamilyUser;
}

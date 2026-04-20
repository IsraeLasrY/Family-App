import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../../../core/api/firebase';
import { getUserDoc } from '../services/authService';
import { FamilyUser } from '../../../types';

export interface AuthState {
  user: FirebaseUser | null;
  firebaseUser: FirebaseUser | null; // alias for backwards compat
  userDoc: FamilyUser | null;
  loading: boolean;
  setUserDoc: (updater: (prev: FamilyUser | null) => FamilyUser | null) => void;
}

export function useAuth(): AuthState {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userDoc, setUserDoc] = useState<FamilyUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        const doc = await getUserDoc(user.uid);
        setUserDoc(doc);
      } else {
        setUserDoc(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return {
    user: firebaseUser,
    firebaseUser,
    userDoc,
    loading,
    setUserDoc,
  };
}

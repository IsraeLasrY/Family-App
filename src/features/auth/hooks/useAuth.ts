import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../../../core/api/firebase';
import { getUserDoc } from '../services/authService';
import { FamilyUser } from '../../../types';

export interface AuthState {
  firebaseUser: FirebaseUser | null;
  userDoc: FamilyUser | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    firebaseUser: null,
    userDoc: null,
    loading: true,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getUserDoc(user.uid);
        setState({ firebaseUser: user, userDoc, loading: false });
      } else {
        setState({ firebaseUser: null, userDoc: null, loading: false });
      }
    });

    return unsubscribe;
  }, []);

  return state;
}

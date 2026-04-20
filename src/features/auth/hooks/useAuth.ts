import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../../core/api/firebase';
import { FamilyUser } from '../../../types';

export interface AuthState {
  user: FirebaseUser | null;
  firebaseUser: FirebaseUser | null;
  userDoc: FamilyUser | null;
  loading: boolean;
  setUserDoc: (updater: (prev: FamilyUser | null) => FamilyUser | null) => void;
}

export function useAuth(): AuthState {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userDoc, setUserDoc] = useState<FamilyUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);

      // בטל מאזין קודם אם קיים
      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = null;
      }

      if (user) {
        // מאזין בזמן אמת — מתעדכן אוטומטית כשהמסמך משתנה (למשל כשמצטרפים למשפחה)
        unsubscribeDoc = onSnapshot(doc(db, 'Users', user.uid), (snap) => {
          if (snap.exists()) {
            setUserDoc({ uid: snap.id, ...snap.data() } as FamilyUser);
          } else {
            setUserDoc(null);
          }
          setLoading(false);
        });
      } else {
        setUserDoc(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  return {
    user: firebaseUser,
    firebaseUser,
    userDoc,
    loading,
    setUserDoc,
  };
}

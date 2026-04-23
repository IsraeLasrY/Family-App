import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../src/features/auth/hooks/useAuth';
import { Colors } from '../src/core/theme/colors';
import { registerForPushNotifications } from '../src/features/notifications/services/notificationService';

function InitialLayout() {
  const { firebaseUser, userDoc, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (firebaseUser && userDoc?.familyId) {
      registerForPushNotifications(firebaseUser.uid);
    }
  }, [firebaseUser?.uid, userDoc?.familyId]);

  useEffect(() => {
    if (loading) return;

    const inAuth = (segments[0] as string) === '(auth)';

    if (!firebaseUser) {
      // Not logged in → go to welcome
      if (!inAuth) router.replace('/(auth)');
    } else if (!userDoc?.familyId) {
      // Logged in but no family → go to family setup
      if (!inAuth) router.replace('/(auth)');
    } else {
      // Fully onboarded → go to main app
      if (inAuth) router.replace('/(tabs)');
    }
  }, [firebaseUser, userDoc, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return <InitialLayout />;
}

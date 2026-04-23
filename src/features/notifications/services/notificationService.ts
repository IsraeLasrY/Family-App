import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '../../../core/api/firebase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export async function registerForPushNotifications(userId: string): Promise<void> {
  if (!Device.isDevice) return;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { data: token } = await Notifications.getExpoPushTokenAsync();
  await updateDoc(doc(db, 'Users', userId), { pushToken: token });
}

async function sendPushNotifications(
  tokens: string[],
  title: string,
  body: string
): Promise<void> {
  if (tokens.length === 0) return;
  const messages = tokens.map((to) => ({ to, title, body, sound: 'default' }));
  try {
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });
  } catch {
    // Silent — notification failure must not break the calling flow
  }
}

export async function notifyUser(userId: string, title: string, body: string): Promise<void> {
  try {
    const snap = await getDoc(doc(db, 'Users', userId));
    const token = snap.data()?.pushToken as string | undefined;
    if (token) await sendPushNotifications([token], title, body);
  } catch {
    // Silent
  }
}

export async function notifyFamilyMembers(
  familyId: string,
  title: string,
  body: string,
  excludeUid?: string
): Promise<void> {
  try {
    const snap = await getDocs(
      query(collection(db, 'Users'), where('familyId', '==', familyId))
    );
    const tokens = snap.docs
      .filter((d) => d.id !== excludeUid && d.data().pushToken)
      .map((d) => d.data().pushToken as string);
    await sendPushNotifications(tokens, title, body);
  } catch {
    // Silent
  }
}

export async function notifyParents(
  familyId: string,
  title: string,
  body: string
): Promise<void> {
  try {
    const snap = await getDocs(
      query(
        collection(db, 'Users'),
        where('familyId', '==', familyId),
        where('role', '==', 'parent')
      )
    );
    const tokens = snap.docs
      .filter((d) => d.data().pushToken)
      .map((d) => d.data().pushToken as string);
    await sendPushNotifications(tokens, title, body);
  } catch {
    // Silent
  }
}

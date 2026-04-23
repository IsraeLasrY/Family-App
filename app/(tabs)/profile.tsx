import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Clipboard,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../src/core/theme/colors';
import { useAuth } from '../../src/features/auth/hooks/useAuth';
import { signOut } from '../../src/features/auth/services/authService';
import {
  getFamily,
  getFamilyMembers,
  updateUserName,
  updateUserAvatar,
  removeFamilyMember,
} from '../../src/features/auth/services/familyService';
import { Family, FamilyUser } from '../../src/types';

const ROLE_LABEL: Record<string, string> = {
  parent: 'הורה',
  child: 'ילד/ה',
};

const AVATAR_COLORS = ['#FF8A80', '#82B1FF', '#CCFF90', '#FFD180', '#EA80FC'];

function MemberAvatar({ member, size = 40 }: { member: FamilyUser; size?: number }) {
  const color = AVATAR_COLORS[member.name.charCodeAt(0) % AVATAR_COLORS.length];
  const initials = member.name.split(' ').map(w => w[0]).slice(0, 2).join('');
  const radius = size * 0.3;

  if (member.avatarUrl) {
    return (
      <Image
        source={{ uri: member.avatarUrl }}
        style={{ width: size, height: size, borderRadius: radius }}
      />
    );
  }
  return (
    <View style={[{ width: size, height: size, borderRadius: radius, alignItems: 'center', justifyContent: 'center' }, { backgroundColor: color }]}>
      <Text style={{ fontSize: size * 0.35, fontWeight: '700', color: Colors.text }}>{initials}</Text>
    </View>
  );
}

function MemberRow({ member, isMe, canRemove, onRemove }: {
  member: FamilyUser;
  isMe: boolean;
  canRemove: boolean;
  onRemove: () => void;
}) {
  return (
    <View style={styles.memberRow}>
      {canRemove && (
        <TouchableOpacity style={styles.removeBtn} onPress={onRemove}>
          <Text style={styles.removeBtnText}>הסר</Text>
        </TouchableOpacity>
      )}
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{member.name} {isMe ? '(אני)' : ''}</Text>
        <Text style={styles.memberRole}>{ROLE_LABEL[member.role] ?? member.role}</Text>
      </View>
      <MemberAvatar member={member} size={40} />
    </View>
  );
}

export default function ProfileScreen() {
  const { userDoc, user, setUserDoc } = useAuth();
  const [family, setFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<FamilyUser[]>([]);
  const [loadingFamily, setLoadingFamily] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    if (!userDoc?.familyId) return;
    (async () => {
      setLoadingFamily(true);
      const [fam, mems] = await Promise.all([
        getFamily(userDoc.familyId!),
        getFamilyMembers(userDoc.familyId!),
      ]);
      setFamily(fam);
      setMembers(mems);
      setLoadingFamily(false);
    })();
  }, [userDoc?.familyId]);

  async function handlePickAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('הרשאה נדרשת', 'יש לאפשר גישה לגלריה בהגדרות');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled || !result.assets[0]?.uri) return;

    setUploadingAvatar(true);
    try {
      const url = await updateUserAvatar(user!.uid, result.assets[0].uri);
      setUserDoc(prev => prev ? { ...prev, avatarUrl: url } : prev);
      setMembers(prev => prev.map(m => m.uid === user!.uid ? { ...m, avatarUrl: url } : m));
    } catch {
      Alert.alert('שגיאה', 'לא הצלחנו להעלות את התמונה. נסה שוב.');
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSaveName() {
    if (!newName.trim() || newName.trim().length < 2) {
      Alert.alert('שגיאה', 'השם חייב להכיל לפחות 2 תווים');
      return;
    }
    setSavingName(true);
    try {
      await updateUserName(user!.uid, newName.trim());
      setUserDoc(prev => prev ? { ...prev, name: newName.trim() } : prev);
      setEditing(false);
    } catch {
      Alert.alert('שגיאה', 'לא הצלחנו לשמור את השם. נסה שוב.');
    } finally {
      setSavingName(false);
    }
  }

  function handleCopyCode() {
    if (!family?.inviteCode) return;
    Clipboard.setString(family.inviteCode);
    Alert.alert('הועתק!', `קוד ההזמנה ${family.inviteCode} הועתק ללוח`);
  }

  function handleRemoveMember(member: FamilyUser) {
    Alert.alert('הסרת חבר', `להסיר את ${member.name} מהמשפחה?`, [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'הסר', style: 'destructive', onPress: async () => {
          await removeFamilyMember(member.uid);
          setMembers(prev => prev.filter(m => m.uid !== member.uid));
        }
      },
    ]);
  }

  function handleSignOut() {
    Alert.alert('יציאה', 'האם להתנתק?', [
      { text: 'ביטול', style: 'cancel' },
      { text: 'התנתק', style: 'destructive', onPress: signOut },
    ]);
  }

  const myMember: FamilyUser | undefined = userDoc
    ? { uid: user!.uid, familyId: userDoc.familyId!, name: userDoc.name, email: userDoc.email, role: userDoc.role, avatarUrl: userDoc.avatarUrl }
    : undefined;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>

        <Text style={styles.screenTitle}>הפרופיל שלי</Text>

        {/* כרטיס "אני" */}
        <View style={styles.card}>
          <View style={styles.profileHeader}>
            <View style={styles.profileInfo}>
              {editing ? (
                <View style={styles.editRow}>
                  <TextInput
                    style={styles.nameInput}
                    value={newName}
                    onChangeText={setNewName}
                    autoFocus
                    textAlign="right"
                    placeholder="שם מלא"
                    placeholderTextColor={Colors.textMuted}
                  />
                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={handleSaveName}
                    disabled={savingName}
                  >
                    {savingName
                      ? <ActivityIndicator size="small" color={Colors.white} />
                      : <Text style={styles.saveBtnText}>שמור</Text>
                    }
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={() => { setNewName(userDoc?.name ?? ''); setEditing(true); }}>
                  <Text style={styles.profileName}>{userDoc?.name ?? '—'}</Text>
                  <Text style={styles.editHint}>לחץ לעריכה ✏️</Text>
                </TouchableOpacity>
              )}
              <Text style={styles.profileEmail}>{userDoc?.email}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{ROLE_LABEL[userDoc?.role ?? ''] ?? userDoc?.role}</Text>
              </View>
            </View>

            {/* Avatar — לחיצה להעלאת תמונה */}
            <TouchableOpacity onPress={handlePickAvatar} disabled={uploadingAvatar}>
              <View style={styles.bigAvatarWrapper}>
                {myMember ? (
                  <MemberAvatar member={myMember} size={72} />
                ) : null}
                {uploadingAvatar && (
                  <View style={styles.avatarOverlay}>
                    <ActivityIndicator color={Colors.white} />
                  </View>
                )}
                <View style={styles.cameraTag}>
                  <Text style={styles.cameraIcon}>📷</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* כרטיס המשפחה */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>המשפחה שלנו</Text>

          {loadingFamily ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: 16 }} />
          ) : (
            <>
              <Text style={styles.familyName}>{family?.name ?? '—'}</Text>

              <View style={styles.inviteRow}>
                <TouchableOpacity style={styles.copyBtn} onPress={handleCopyCode}>
                  <Text style={styles.copyBtnText}>העתק</Text>
                </TouchableOpacity>
                <View style={styles.inviteCodeBox}>
                  <Text style={styles.inviteCode}>{family?.inviteCode}</Text>
                </View>
                <Text style={styles.inviteLabel}>קוד הזמנה</Text>
              </View>

              <Text style={styles.membersTitle}>חברי המשפחה ({members.length})</Text>
              {members.map(m => (
                <MemberRow
                  key={m.uid}
                  member={m}
                  isMe={m.uid === user?.uid}
                  canRemove={family?.adminId === user?.uid && m.uid !== user?.uid}
                  onRemove={() => handleRemoveMember(m)}
                />
              ))}
            </>
          )}
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>התנתק</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },
  screenTitle: { fontSize: 26, fontWeight: '800', color: Colors.text, textAlign: 'right', marginBottom: 20 },

  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: { fontSize: 12, fontWeight: '700', color: Colors.primary, textAlign: 'right', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.8 },

  profileHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  profileInfo: { flex: 1, alignItems: 'flex-end', marginLeft: 12 },
  profileName: { fontSize: 20, fontWeight: '800', color: Colors.text, textAlign: 'right' },
  editHint: { fontSize: 11, color: Colors.textMuted, textAlign: 'right', marginTop: 2 },
  profileEmail: { fontSize: 13, color: Colors.textMuted, textAlign: 'right', marginTop: 4 },
  roleBadge: { backgroundColor: Colors.primaryLight, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8 },
  roleText: { fontSize: 12, fontWeight: '700', color: Colors.primary },

  bigAvatarWrapper: { position: 'relative' },
  avatarOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  cameraTag: {
    position: 'absolute', bottom: -4, right: -4,
    backgroundColor: Colors.white, borderRadius: 10,
    width: 24, height: 24, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2, elevation: 2,
  },
  cameraIcon: { fontSize: 13 },

  editRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nameInput: { flex: 1, backgroundColor: Colors.inputBg, borderRadius: 12, height: 44, paddingHorizontal: 12, color: Colors.text, fontSize: 15, borderWidth: 1.5, borderColor: Colors.primary },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 12, height: 44, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },

  familyName: { fontSize: 18, fontWeight: '800', color: Colors.text, textAlign: 'right', marginBottom: 16 },
  inviteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginBottom: 20 },
  inviteLabel: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  inviteCodeBox: { backgroundColor: Colors.primaryLight, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  inviteCode: { fontSize: 20, fontWeight: '800', color: Colors.primary, letterSpacing: 4 },
  copyBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  copyBtnText: { color: Colors.white, fontWeight: '700', fontSize: 13 },

  membersTitle: { fontSize: 13, fontWeight: '700', color: Colors.text, textAlign: 'right', marginBottom: 12 },
  memberRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.cardBorder, gap: 8 },
  removeBtn: { backgroundColor: '#FFEBEE', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  removeBtnText: { color: '#FF5252', fontWeight: '700', fontSize: 12 },
  memberInfo: { flex: 1, alignItems: 'flex-end' },
  memberName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  memberRole: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  signOutBtn: { borderRadius: 16, borderWidth: 1.5, borderColor: '#FF5252', padding: 16, alignItems: 'center', marginTop: 8 },
  signOutText: { color: '#FF5252', fontWeight: '700', fontSize: 15 },
});

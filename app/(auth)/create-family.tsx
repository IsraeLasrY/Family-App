import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../src/core/theme/colors';
import { FamilyButton } from '../../src/core/theme/components/FamilyButton';
import { registerUser } from '../../src/features/auth/services/authService';
import { createFamily } from '../../src/features/auth/services/familyService';
import { validateEmail, validateName, validatePassword } from '../../src/core/utils/validation';

export default function CreateFamilyScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!name || !email || !password || !familyName) {
      Alert.alert('שגיאה', 'נא למלא את כל השדות');
      return;
    }
    const nameCheck = validateName(name);
    if (!nameCheck.valid) { Alert.alert('שגיאה', nameCheck.error); return; }
    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) { Alert.alert('שגיאה', emailCheck.error); return; }
    const passCheck = validatePassword(password);
    if (!passCheck.valid) { Alert.alert('שגיאה', passCheck.error); return; }
    setLoading(true);
    try {
      const user = await registerUser(email, password, name, 'parent');
      const family = await createFamily(familyName, user.uid);
      Alert.alert(
        'המשפחה נוצרה! 🎉',
        `קוד ההזמנה שלכם: ${family.inviteCode}\nשתפו אותו עם בני המשפחה`,
        [{ text: 'מעולה!', onPress: () => router.replace('/(tabs)') }]
      );
    } catch (err: any) {
      Alert.alert('שגיאה', err.code === 'auth/email-already-in-use' ? 'האימייל כבר קיים' : 'אירעה שגיאה. נסה שוב.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.back} onPress={() => router.back()}>
            <Text style={styles.backText}>← חזרה</Text>
          </TouchableOpacity>

          <Text style={styles.title}>צור משפחה חדשה</Text>
          <Text style={styles.subtitle}>הירשם ופתח את המרחב המשפחתי שלך</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>פרטים אישיים</Text>

            <Text style={styles.label}>שם מלא</Text>
            <TextInput style={styles.input} placeholder="ישראל ישראלי" placeholderTextColor={Colors.textMuted} value={name} onChangeText={setName} textAlign="right" />

            <Text style={styles.label}>אימייל</Text>
            <TextInput style={styles.input} placeholder="name@example.com" placeholderTextColor={Colors.textMuted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" textAlign="right" />

            <Text style={styles.label}>סיסמה</Text>
            <View style={styles.inputWrapper}>
              <TextInput style={[styles.input, styles.inputWithIcon]} placeholder="לפחות 6 תווים" placeholderTextColor={Colors.textMuted} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} textAlign="right" />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(v => !v)}>
                <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>פרטי המשפחה</Text>
            <Text style={styles.label}>שם המשפחה</Text>
            <TextInput style={[styles.input, { marginBottom: 0 }]} placeholder='למשל: "משפחת כהן"' placeholderTextColor={Colors.textMuted} value={familyName} onChangeText={setFamilyName} textAlign="right" />
          </View>

          <FamilyButton title="צור משפחה" loading={loading} onPress={handleCreate} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { paddingHorizontal: 28, paddingTop: 16, paddingBottom: 32 },
  back: { marginBottom: 24 },
  backText: { color: Colors.primary, fontSize: 15, fontWeight: '600' },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text, textAlign: 'right', marginBottom: 6 },
  subtitle: { fontSize: 14, color: Colors.textMuted, textAlign: 'right', marginBottom: 28 },
  section: {
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
  sectionTitle: { fontSize: 12, fontWeight: '700', color: Colors.primary, textAlign: 'right', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.8 },
  label: { color: Colors.text, fontSize: 13, fontWeight: '600', marginBottom: 8, textAlign: 'right' },
  input: { backgroundColor: Colors.inputBg, borderRadius: 14, height: 52, paddingHorizontal: 16, color: Colors.text, fontSize: 15, marginBottom: 14, borderWidth: 1.5, borderColor: Colors.inputBorder },
  inputWrapper: { position: 'relative', marginBottom: 14 },
  inputWithIcon: { marginBottom: 0, paddingLeft: 44 },
  eyeBtn: { position: 'absolute', left: 12, top: 14 },
  eyeIcon: { fontSize: 20 },
});

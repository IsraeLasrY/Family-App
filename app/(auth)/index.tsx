import React, { useState } from "react";
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
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../src/core/theme/colors";
import { FamilyButton } from "../../src/core/theme/components/FamilyButton";
import {
  signIn,
  getUserDoc,
} from "../../src/features/auth/services/authService";

type Tab = "welcome" | "signin";

export default function WelcomeScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("welcome");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    if (!email || !password) {
      Alert.alert("שגיאה", "נא למלא אימייל וסיסמה");
      return;
    }
    setLoading(true);
    try {
      const user = await signIn(email, password);
      const userDoc = await getUserDoc(user.uid);
      if (userDoc?.familyId) {
        router.replace("/(tabs)");
      } else {
        router.replace("/(auth)/create-family");
      }
    } catch {
      Alert.alert("כניסה נכשלה", "אימייל או סיסמה שגויים");
    } finally {
      setLoading(false);
    }
  }

  if (tab === "welcome") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.inner}>
          <View style={styles.hero}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>🏠</Text>
            </View>
            <Text style={styles.title}>משפחה שלנו</Text>
            <Text style={styles.subtitle}>המרכז החכם לניהול חיי המשפחה</Text>
          </View>

          <View style={styles.actions}>
            <FamilyButton
              title="כניסה לחשבון קיים"
              onPress={() => setTab("signin")}
            />
            <View style={styles.gap} />
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>חדש כאן?</Text>
              <View style={styles.dividerLine} />
            </View>
            <View style={styles.gap} />
            <FamilyButton
              title="צור משפחה חדשה"
              variant="outline"
              onPress={() => router.push("/(auth)/create-family")}
            />
            <View style={styles.gap} />
            <FamilyButton
              title="הצטרף למשפחה קיימת"
              variant="outline"
              onPress={() => router.push("/(auth)/join-family")}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.inner}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={styles.back}
            onPress={() => setTab("welcome")}
          >
            <Text style={styles.backText}>חזרה →</Text>
          </TouchableOpacity>

          <Text style={styles.title}>כניסה</Text>
          <Text style={styles.subtitle}>ברוך השב למשפחה שלך</Text>

          <View style={styles.form}>
            <Text style={styles.label}>אימייל</Text>
            <TextInput
              style={styles.input}
              placeholder="name@example.com"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              textAlign="right"
            />

            <Text style={styles.label}>סיסמה</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, styles.inputWithIcon]}
                placeholder="••••••••"
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                textAlign="right"
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword((v) => !v)}
              >
                <Text style={styles.eyeIcon}>{showPassword ? "🙈" : "👁️"}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <FamilyButton
            title="כניסה"
            loading={loading}
            onPress={handleSignIn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.background },
  inner: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 24,
    justifyContent: "center",
  },
  hero: { alignItems: "center", marginBottom: 52 },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  logoEmoji: { fontSize: 48 },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: Colors.text,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: { fontSize: 15, color: Colors.textMuted, textAlign: "center" },
  actions: { marginBottom: 28 },
  gap: { height: 12 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.cardBorder },
  dividerText: { fontSize: 13, color: Colors.textMuted, fontWeight: '600' },
  back: { marginBottom: 28 },
  backText: { color: Colors.primary, fontSize: 15, fontWeight: "600" },
  form: { marginBottom: 28 },
  label: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "right",
  },
  input: {
    backgroundColor: Colors.inputBg,
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 16,
    color: Colors.text,
    fontSize: 15,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
  },
  inputWrapper: { position: "relative", marginBottom: 16 },
  inputWithIcon: { marginBottom: 0, paddingLeft: 44 },
  eyeBtn: { position: "absolute", left: 12, top: 14 },
  eyeIcon: { fontSize: 20 },
});

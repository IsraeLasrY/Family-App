import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../../src/core/theme/colors';
import { useAuth } from '../../src/features/auth/hooks/useAuth';

const FEATURES = [
  { icon: '📅', title: 'לוח שנה', subtitle: 'אירועים קרובים', color: '#EAE8FF', route: 'calendar' },
  { icon: '🛒', title: 'קניות',   subtitle: 'רשימת קניות',    color: '#FFF3E0', route: 'shopping' },
  { icon: '💰', title: 'תקציב',   subtitle: 'מעקב הוצאות',   color: '#E8F5E9', route: 'budget' },
  { icon: '✅', title: 'מטלות',   subtitle: 'משימות המשפחה',  color: '#FCE4EC', route: 'tasks' },
];

function MemberAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('');

  const colors = ['#FF8A80', '#82B1FF', '#CCFF90', '#FFD180', '#EA80FC'];
  const color = colors[name.charCodeAt(0) % colors.length];

  return (
    <View style={[styles.avatar, { backgroundColor: color }]}>
      <Text style={styles.avatarText}>{initials}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const { userDoc } = useAuth();
  const router = useRouter();

  function handleFeaturePress(route: string) {
    if (route === 'calendar') router.push('/(tabs)/calendar');
    if (route === 'shopping') router.push('/(tabs)/shopping');
  }

  const today = new Date().toLocaleDateString('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.avatarLarge} onPress={() => router.push('/(tabs)/profile')}>
              <Text style={styles.avatarLargeText}>
                {userDoc?.name?.charAt(0) ?? '?'}
              </Text>
            </TouchableOpacity>
            <View style={styles.headerGreeting}>
              <Text style={styles.helloText}>שלום,</Text>
              <Text style={styles.nameText}>{userDoc?.name ?? 'אורח'} 👋</Text>
            </View>
          </View>

          <Text style={styles.familyName}>{userDoc?.familyId ? 'המשפחה שלנו' : ''}</Text>

          {/* Member avatars */}
          <View style={styles.membersRow}>
            {userDoc?.name && <MemberAvatar name={userDoc.name} />}
            <View style={[styles.avatar, styles.avatarAdd]}>
              <Text style={styles.avatarAddText}>+</Text>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>0</Text>
              <Text style={styles.statLabel}>📅 אירועים</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>0</Text>
              <Text style={styles.statLabel}>🛒 פריטים</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>0</Text>
              <Text style={styles.statLabel}>✅ מטלות</Text>
            </View>
          </View>
        </View>

        {/* Features Grid */}
        <View style={styles.body}>
          <Text style={styles.sectionTitle}>מה תרצה לעשות?</Text>

          <View style={styles.grid}>
            {FEATURES.map((f) => (
              <TouchableOpacity
                key={f.route}
                style={[styles.featureCard, { backgroundColor: f.color }]}
                activeOpacity={0.8}
                onPress={() => handleFeaturePress(f.route)}
              >
                <Text style={styles.featureIcon}>{f.icon}</Text>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureSubtitle}>{f.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.dateText}>היום, {today}</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: {
    backgroundColor: Colors.headerBg,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerGreeting: { alignItems: 'flex-end' },
  helloText: { fontSize: 14, color: Colors.textOnDarkMuted },
  nameText: { fontSize: 22, fontWeight: '800', color: Colors.textOnDark },
  familyName: { fontSize: 18, fontWeight: '700', color: Colors.textOnDark, textAlign: 'right', marginBottom: 16 },

  // Avatars
  membersRow: { flexDirection: 'row-reverse', marginBottom: 24, gap: 8 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 15, fontWeight: '700', color: Colors.text },
  avatarAdd: { backgroundColor: 'rgba(255,255,255,0.2)' },
  avatarAddText: { fontSize: 22, color: Colors.textOnDark, fontWeight: '300' },
  avatarLarge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLargeText: { fontSize: 20, fontWeight: '700', color: Colors.textOnDark },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  statNum: { fontSize: 22, fontWeight: '800', color: Colors.textOnDark },
  statLabel: { fontSize: 11, color: Colors.textOnDarkMuted, marginTop: 2 },

  // Body
  body: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.text, textAlign: 'right', marginBottom: 16 },

  // Grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  featureCard: {
    width: '47.5%',
    borderRadius: 20,
    padding: 18,
    minHeight: 120,
    justifyContent: 'space-between',
  },
  featureIcon: { fontSize: 36, marginBottom: 8 },
  featureTitle: { fontSize: 16, fontWeight: '800', color: Colors.text },
  featureSubtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  // Date
  dateText: { fontSize: 13, color: Colors.textMuted, textAlign: 'right', marginTop: 24 },
});

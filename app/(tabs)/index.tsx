import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../../src/core/theme/colors';
import { useAuth } from '../../src/features/auth/hooks/useAuth';
import { subscribeToEvents } from '../../src/features/calendar/services/eventService';
import { subscribeToShoppingItems } from '../../src/features/shopping/services/shoppingService';
import { subscribeToTasks } from '../../src/features/tasks/services/taskService';
import { getFamilyMembers } from '../../src/features/auth/services/familyService';
import { Event, FamilyUser } from '../../src/types';

const FEATURES = [
  { icon: '📅', title: 'לוח שנה',    subtitle: 'אירועים קרובים',  color: '#EAE8FF', route: 'calendar' },
  { icon: '🛒', title: 'קניות',      subtitle: 'רשימת קניות',     color: '#FFF3E0', route: 'shopping' },
  { icon: '💰', title: 'תקציב',      subtitle: 'מעקב הוצאות',    color: '#E8F5E9', route: 'budget' },
  { icon: '✅', title: 'מטלות',      subtitle: 'משימות המשפחה',   color: '#FCE4EC', route: 'tasks' },
  { icon: '🍳', title: 'מתכונים',    subtitle: 'מתכונים + AI',    color: '#FFF8E1', route: 'recipes' },
  { icon: '⏰', title: 'לוח זמנים',  subtitle: 'זמני הילדים',    color: '#E0F7FA', route: 'schedule' },
];

const AVATAR_COLORS = ['#FF8A80', '#82B1FF', '#CCFF90', '#FFD180', '#EA80FC'];

function MemberAvatar({ member }: { member: FamilyUser }) {
  const color = AVATAR_COLORS[member.name.charCodeAt(0) % AVATAR_COLORS.length];
  const initials = member.name.split(' ').map(w => w[0]).slice(0, 2).join('');

  if (member.avatarUrl) {
    return <Image source={{ uri: member.avatarUrl }} style={styles.avatar} />;
  }
  return (
    <View style={[styles.avatar, { backgroundColor: color }]}>
      <Text style={styles.avatarText}>{initials}</Text>
    </View>
  );
}

const CATEGORY_ICONS: Record<string, string> = {
  general: '📌', medical: '🏥', school: '🎒', celebration: '🎉',
};

export default function HomeScreen() {
  const { userDoc } = useAuth();
  const router = useRouter();
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [pendingItemsCount, setPendingItemsCount] = useState(0);
  const [pendingTasksCount, setPendingTasksCount] = useState(0);
  const [members, setMembers] = useState<FamilyUser[]>([]);

  useEffect(() => {
    if (!userDoc?.familyId) return;

    getFamilyMembers(userDoc.familyId).then(setMembers);

    const unsubEvents = subscribeToEvents(userDoc.familyId, (all) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekAhead = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const filtered = all.filter((e) => {
        const d = e.date?.toDate ? e.date.toDate() : new Date(e.date as any);
        const eventDay = new Date(d);
        eventDay.setHours(0, 0, 0, 0);
        return eventDay >= today && eventDay <= weekAhead;
      });
      setUpcomingEvents(filtered.slice(0, 3));
    });

    const unsubShopping = subscribeToShoppingItems(userDoc.familyId, (items) => {
      setPendingItemsCount(items.filter((i) => !i.isBought).length);
    });

    const unsubTasks = subscribeToTasks(userDoc.familyId, (tasks) => {
      setPendingTasksCount(tasks.filter((t) => t.status !== 'done').length);
    });

    return () => { unsubEvents(); unsubShopping(); unsubTasks(); };
  }, [userDoc?.familyId]);

  function handleFeaturePress(route: string) {
    if (route === 'calendar') router.push('/(tabs)/calendar');
    if (route === 'shopping') router.push('/(tabs)/shopping');
    if (route === 'tasks') router.push('/(tabs)/tasks');
    if (route === 'budget') router.push('/(tabs)/budget');
    if (route === 'recipes') router.push('/(tabs)/recipes');
    if (route === 'schedule') router.push('/(tabs)/schedule');
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
            <View style={styles.headerGreeting}>
              <Text style={styles.helloText}>שלום,</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
                <Text style={styles.nameText}>{userDoc?.name ?? 'אורח'} 👋</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.familyName}>{userDoc?.familyId ? 'המשפחה שלנו' : ''}</Text>

          {/* Member avatars */}
          {members.length > 0 && (
            <View style={styles.membersRow}>
              {members.map(m => (
                <MemberAvatar key={m.uid} member={m} />
              ))}
            </View>
          )}

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>{upcomingEvents.length}</Text>
              <Text style={styles.statLabel}>📅 אירועים</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>{pendingItemsCount}</Text>
              <Text style={styles.statLabel}>🛒 פריטים</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>{pendingTasksCount}</Text>
              <Text style={styles.statLabel}>✅ מטלות</Text>
            </View>
          </View>
        </View>

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <View style={styles.upcomingSection}>
            <Text style={styles.sectionTitle}>אירועים קרובים</Text>
            {upcomingEvents.map((e) => {
              const d = e.date?.toDate ? e.date.toDate() : new Date(e.date as any);
              const dateStr = d.toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'short' });
              return (
                <TouchableOpacity key={e.id} style={styles.upcomingCard} onPress={() => router.push('/(tabs)/calendar')}>
                  <Text style={styles.upcomingIcon}>{CATEGORY_ICONS[e.category] ?? '📌'}</Text>
                  <View style={styles.upcomingInfo}>
                    <Text style={styles.upcomingTitle}>{e.title}</Text>
                    <Text style={styles.upcomingDate}>{dateStr}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

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
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerGreeting: { alignItems: 'flex-end' },
  helloText: { fontSize: 14, color: Colors.textOnDarkMuted },
  nameText: { fontSize: 22, fontWeight: '800', color: Colors.textOnDark },
  familyName: { fontSize: 18, fontWeight: '700', color: Colors.textOnDark, textAlign: 'right', marginBottom: 16 },

  membersRow: { flexDirection: 'row-reverse', marginBottom: 24, gap: 8 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 15, fontWeight: '700', color: Colors.text },

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

  body: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.text, textAlign: 'right', marginBottom: 16 },

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

  dateText: { fontSize: 13, color: Colors.textMuted, textAlign: 'right', marginTop: 24 },

  upcomingSection: { paddingHorizontal: 24, paddingTop: 24 },
  upcomingCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: Colors.cardBorder },
  upcomingIcon: { fontSize: 24 },
  upcomingInfo: { flex: 1 },
  upcomingTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, textAlign: 'right' },
  upcomingDate: { fontSize: 12, color: Colors.textMuted, textAlign: 'right', marginTop: 2 },
});

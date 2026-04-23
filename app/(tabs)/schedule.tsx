import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '../../src/core/theme/colors';
import { useAuth } from '../../src/features/auth/hooks/useAuth';
import { getFamilyMembers } from '../../src/features/auth/services/familyService';
import {
  subscribeToSchedules,
  addSchedule,
  approveSchedule,
  deleteSchedule,
} from '../../src/features/schedule/services/scheduleService';
import { Schedule, FamilyUser } from '../../src/types';

const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

const ACTIVITY_TYPES: { value: string; label: string; icon: string; color: string }[] = [
  { value: 'screen',   label: 'זמן מסך',    icon: '📱', color: '#EAE8FF' },
  { value: 'learning', label: 'למידה',       icon: '📚', color: '#E8F5E9' },
  { value: 'sport',    label: 'ספורט',       icon: '⚽', color: '#FFF3E0' },
  { value: 'free',     label: 'זמן חופשי',  icon: '🎮', color: '#FCE4EC' },
  { value: 'sleep',    label: 'שינה',        icon: '😴', color: '#F3E5F5' },
];

function activityMeta(value: string) {
  return ACTIVITY_TYPES.find((a) => a.value === value) ?? ACTIVITY_TYPES[0];
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function schedulesForDay(schedules: Schedule[], dayIndex: number): Schedule[] {
  return schedules.filter((s) => {
    const start = s.startTime?.toDate ? s.startTime.toDate() : new Date(s.startTime as any);
    if (s.repeat === 'daily') return true;
    if (s.repeat === 'weekly') return start.getDay() === dayIndex;
    return start.getDay() === dayIndex;
  }).sort((a, b) => {
    const aTime = a.startTime?.toDate ? a.startTime.toDate() : new Date(a.startTime as any);
    const bTime = b.startTime?.toDate ? b.startTime.toDate() : new Date(b.startTime as any);
    return aTime.getTime() - bTime.getTime();
  });
}

export default function ScheduleScreen() {
  const { userDoc, user } = useAuth();
  const isParent = userDoc?.role === 'parent';

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [members, setMembers] = useState<FamilyUser[]>([]);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [modalVisible, setModalVisible] = useState(false);

  // Form state
  const [selectedMember, setSelectedMember] = useState<FamilyUser | null>(null);
  const [activityType, setActivityType] = useState('learning');
  const [repeat, setRepeat] = useState<Schedule['repeat']>('none');
  const [startTime, setStartTime] = useState(() => { const d = new Date(); d.setMinutes(0, 0, 0); return d; });
  const [endTime, setEndTime] = useState(() => { const d = new Date(); d.setHours(d.getHours() + 1, 0, 0, 0); return d; });
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userDoc?.familyId) return;
    const unsub = subscribeToSchedules(userDoc.familyId, setSchedules);
    getFamilyMembers(userDoc.familyId).then(setMembers);
    return unsub;
  }, [userDoc?.familyId]);

  function openModal() {
    const start = new Date();
    start.setHours(8, 0, 0, 0);
    const end = new Date();
    end.setHours(9, 0, 0, 0);
    setSelectedMember(members.find((m) => m.uid !== user?.uid) ?? members[0] ?? null);
    setActivityType('learning');
    setRepeat('none');
    setStartTime(start);
    setEndTime(end);
    setModalVisible(true);
  }

  async function handleSave() {
    if (!selectedMember) {
      Alert.alert('שגיאה', 'נא לבחור ילד');
      return;
    }
    if (endTime <= startTime) {
      Alert.alert('שגיאה', 'שעת הסיום חייבת להיות אחרי שעת ההתחלה');
      return;
    }

    // Set the day of week to selected day
    const start = new Date(startTime);
    const end = new Date(endTime);
    const today = new Date();
    const diff = selectedDay - today.getDay();
    start.setDate(today.getDate() + diff);
    end.setDate(today.getDate() + diff);

    setSaving(true);
    try {
      await addSchedule(userDoc!.familyId, selectedMember.uid, activityType, start, end, repeat);
      setModalVisible(false);
    } catch {
      Alert.alert('שגיאה', 'לא ניתן לשמור. נסה שוב.');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(s: Schedule) {
    Alert.alert('מחיקה', 'למחוק את הפעילות?', [
      { text: 'ביטול', style: 'cancel' },
      { text: 'מחק', style: 'destructive', onPress: () => deleteSchedule(s.id) },
    ]);
  }

  function getMemberName(uid: string) {
    return members.find((m) => m.uid === uid)?.name ?? '—';
  }

  const daySchedules = schedulesForDay(
    isParent ? schedules : schedules.filter((s) => s.userId === user?.uid),
    selectedDay
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        {isParent && (
          <TouchableOpacity style={styles.addBtn} onPress={openModal}>
            <Text style={styles.addBtnText}>+ הוסף</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>לוח זמנים</Text>
      </View>

      {/* Day selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayBar} contentContainerStyle={styles.dayBarContent}>
        {DAYS.map((day, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.dayChip, selectedDay === i && styles.dayChipActive]}
            onPress={() => setSelectedDay(i)}
          >
            <Text style={[styles.dayChipText, selectedDay === i && styles.dayChipTextActive]}>{day}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Activities */}
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {daySchedules.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>אין פעילויות ביום זה</Text>
            {isParent && <Text style={styles.emptyHint}>לחץ "+ הוסף" כדי לתזמן פעילות</Text>}
          </View>
        ) : (
          daySchedules.map((s) => {
            const meta = activityMeta(s.activityType);
            const start = s.startTime?.toDate ? s.startTime.toDate() : new Date(s.startTime as any);
            const end = s.endTime?.toDate ? s.endTime.toDate() : new Date(s.endTime as any);
            return (
              <View key={s.id} style={[styles.card, { backgroundColor: meta.color }]}>
                <View style={styles.cardTimeBar} />
                <View style={styles.cardBody}>
                  <View style={styles.cardTop}>
                    <Text style={styles.cardIcon}>{meta.icon}</Text>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardTitle}>{meta.label}</Text>
                      <Text style={styles.cardMember}>{getMemberName(s.userId)}</Text>
                    </View>
                    <View style={styles.cardRight}>
                      <Text style={styles.cardTime}>{formatTime(start)} – {formatTime(end)}</Text>
                      {s.repeat !== 'none' && (
                        <Text style={styles.repeatBadge}>{s.repeat === 'daily' ? '🔁 יומי' : '🔁 שבועי'}</Text>
                      )}
                    </View>
                  </View>

                  {isParent && (
                    <View style={styles.cardActions}>
                      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(s)}>
                        <Text style={styles.deleteBtnText}>מחק</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>פעילות חדשה</Text>

            {/* Member selector */}
            <Text style={styles.fieldLabel}>ילד</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {members.map((m) => (
                <TouchableOpacity
                  key={m.uid}
                  style={[styles.memberChip, selectedMember?.uid === m.uid && styles.memberChipActive]}
                  onPress={() => setSelectedMember(m)}
                >
                  <Text style={[styles.memberChipText, selectedMember?.uid === m.uid && styles.memberChipTextActive]}>
                    {m.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Activity type */}
            <Text style={styles.fieldLabel}>סוג פעילות</Text>
            <View style={styles.typeRow}>
              {ACTIVITY_TYPES.map((a) => (
                <TouchableOpacity
                  key={a.value}
                  style={[styles.typeBtn, { backgroundColor: a.color }, activityType === a.value && styles.typeBtnActive]}
                  onPress={() => setActivityType(a.value)}
                >
                  <Text style={styles.typeBtnIcon}>{a.icon}</Text>
                  <Text style={[styles.typeBtnText, activityType === a.value && styles.typeBtnTextActive]}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Times */}
            <View style={styles.timeRow}>
              <View style={styles.timeField}>
                <Text style={styles.fieldLabel}>סיום</Text>
                <TouchableOpacity style={styles.timeBtn} onPress={() => setShowEndPicker(true)}>
                  <Text style={styles.timeBtnText}>{formatTime(endTime)}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.timeField}>
                <Text style={styles.fieldLabel}>התחלה</Text>
                <TouchableOpacity style={styles.timeBtn} onPress={() => setShowStartPicker(true)}>
                  <Text style={styles.timeBtnText}>{formatTime(startTime)}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {showStartPicker && (
              <DateTimePicker value={startTime} mode="time" is24Hour display="spinner"
                onChange={(_, d) => { setShowStartPicker(false); if (d) setStartTime(d); }} />
            )}
            {showEndPicker && (
              <DateTimePicker value={endTime} mode="time" is24Hour display="spinner"
                onChange={(_, d) => { setShowEndPicker(false); if (d) setEndTime(d); }} />
            )}

            {/* Repeat */}
            <Text style={styles.fieldLabel}>חזרה</Text>
            <View style={styles.repeatRow}>
              {(['none', 'weekly', 'daily'] as Schedule['repeat'][]).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.repeatBtn, repeat === r && styles.repeatBtnActive]}
                  onPress={() => setRepeat(r)}
                >
                  <Text style={[styles.repeatBtnText, repeat === r && styles.repeatBtnTextActive]}>
                    {r === 'none' ? 'חד פעמי' : r === 'weekly' ? 'שבועי' : 'יומי'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                <Text style={styles.saveBtnText}>{saving ? 'שומר...' : 'שמור'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    backgroundColor: Colors.headerBg,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.textOnDark },
  addBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: Colors.textOnDark, fontWeight: '700', fontSize: 14 },

  dayBar: { maxHeight: 56, marginTop: 12 },
  dayBarContent: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  dayChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.white, borderWidth: 1.5, borderColor: 'transparent' },
  dayChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dayChipText: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  dayChipTextActive: { color: Colors.white },

  list: { padding: 16, paddingBottom: 40 },

  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  emptyHint: { fontSize: 13, color: Colors.textMuted },

  card: { borderRadius: 18, marginBottom: 12, flexDirection: 'row', overflow: 'hidden' },
  cardTimeBar: { width: 5, backgroundColor: Colors.primary, opacity: 0.4 },
  cardBody: { flex: 1, padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIcon: { fontSize: 28 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: Colors.text },
  cardMember: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  cardRight: { alignItems: 'flex-end' },
  cardTime: { fontSize: 13, fontWeight: '700', color: Colors.text },
  repeatBadge: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-start', marginTop: 10 },
  deleteBtn: { backgroundColor: '#FFEBEE', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  deleteBtnText: { color: '#FF5252', fontWeight: '700', fontSize: 12 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Colors.white, borderRadius: 28, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.text, textAlign: 'right', marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.text, textAlign: 'right', marginBottom: 8 },

  memberChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.inputBg, marginLeft: 8, borderWidth: 1.5, borderColor: 'transparent' },
  memberChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  memberChipText: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  memberChipTextActive: { color: Colors.primary },

  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  typeBtn: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: 'transparent' },
  typeBtnActive: { borderColor: Colors.primary },
  typeBtnIcon: { fontSize: 16 },
  typeBtnText: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  typeBtnTextActive: { color: Colors.primary },

  timeRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  timeField: { flex: 1 },
  timeBtn: { backgroundColor: Colors.inputBg, borderRadius: 14, height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: Colors.inputBorder },
  timeBtnText: { fontSize: 18, fontWeight: '700', color: Colors.text },

  repeatRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  repeatBtn: { flex: 1, paddingVertical: 10, borderRadius: 14, backgroundColor: Colors.inputBg, alignItems: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  repeatBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  repeatBtnText: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  repeatBtnTextActive: { color: Colors.primary },

  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.inputBorder, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '700', color: Colors.textMuted },
  saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: Colors.white },
});

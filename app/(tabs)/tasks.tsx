import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '../../src/core/theme/colors';
import { useAuth } from '../../src/features/auth/hooks/useAuth';
import { getFamilyMembers } from '../../src/features/auth/services/familyService';
import {
  subscribeToTasks,
  addTask,
  updateTaskStatus,
  deleteTask,
  resetDailyTasks,
} from '../../src/features/tasks/services/taskService';
import { Task, FamilyUser } from '../../src/types';

const STATUS_META: Record<Task['status'], { label: string; color: string; next: Task['status'] }> = {
  todo:        { label: 'לביצוע',   color: '#EAE8FF', next: 'in_progress' },
  in_progress: { label: 'בביצוע',   color: '#FFF3E0', next: 'done' },
  done:        { label: 'הושלם ✓',  color: '#E8F5E9', next: 'todo' },
};

function formatDate(date: any): string {
  const d = date?.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
}

function TaskCard({ task, members, onStatusPress, onDelete }: {
  task: Task;
  members: FamilyUser[];
  onStatusPress: () => void;
  onDelete: () => void;
}) {
  const meta = STATUS_META[task.status];
  const assignee = members.find((m) => m.uid === task.assignedTo);

  return (
    <View style={styles.taskCard}>
      <View style={styles.taskTop}>
        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
          <Text style={styles.deleteBtnText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.taskInfo}>
          <Text style={[styles.taskTitle, task.status === 'done' && styles.taskTitleDone]}>
            {task.isRecurring ? '🔄 ' : ''}{task.title}
          </Text>
          <View style={styles.taskMeta}>
            <Text style={styles.taskDate}>📅 {formatDate(task.dueDate)}</Text>
            <Text style={styles.taskPoints}>⭐ {task.points} נקודות</Text>
            {assignee && <Text style={styles.taskAssignee}>👤 {assignee.name}</Text>}
          </View>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.statusBadge, { backgroundColor: meta.color }]}
        onPress={onStatusPress}
      >
        <Text style={styles.statusText}>{meta.label}</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function TasksScreen() {
  const { userDoc, user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<FamilyUser[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const [title, setTitle] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [points, setPoints] = useState('10');
  const [isRecurring, setIsRecurring] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userDoc?.familyId) return;
    resetDailyTasks(userDoc.familyId);
    const unsub = subscribeToTasks(userDoc.familyId, setTasks);
    getFamilyMembers(userDoc.familyId).then(setMembers);
    return unsub;
  }, [userDoc?.familyId]);

  function openModal() {
    setTitle('');
    setAssignedTo(user?.uid ?? '');
    setDueDate(new Date());
    setTempDate(new Date());
    setPoints('10');
    setIsRecurring(false);
    setModalVisible(true);
  }

  async function handleAdd() {
    if (!title.trim()) { Alert.alert('שגיאה', 'נא להזין כותרת'); return; }
    if (!assignedTo) { Alert.alert('שגיאה', 'נא לבחור חבר משפחה'); return; }
    if (isRecurring && tasks.filter((t) => t.isRecurring).length >= 10) {
      Alert.alert('הגבלה', 'לא ניתן להוסיף יותר מ-10 משימות יומיות קבועות.');
      return;
    }
    setSaving(true);
    try {
      await addTask(userDoc!.familyId, title.trim(), assignedTo, dueDate, parseInt(points) || 10, isRecurring);
      setModalVisible(false);
    } catch {
      Alert.alert('שגיאה', 'לא ניתן לשמור את המשימה. נסה שוב.');
    } finally {
      setSaving(false);
    }
  }

  function handleStatusPress(task: Task) {
    const next = STATUS_META[task.status].next;
    updateTaskStatus(task.id, next);
  }

  function handleDelete(task: Task) {
    Alert.alert('מחיקת משימה', `למחוק את "${task.title}"?`, [
      { text: 'ביטול', style: 'cancel' },
      { text: 'מחק', style: 'destructive', onPress: () => deleteTask(task.id) },
    ]);
  }

  // Leaderboard — sum points of done tasks per member
  const leaderboard = members
    .map((m) => ({
      member: m,
      points: tasks
        .filter((t) => t.assignedTo === m.uid && t.status === 'done')
        .reduce((sum, t) => sum + t.points, 0),
    }))
    .sort((a, b) => b.points - a.points);

  const todo = tasks.filter((t) => t.status === 'todo');
  const inProgress = tasks.filter((t) => t.status === 'in_progress');
  const done = tasks.filter((t) => t.status === 'done');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => setShowLeaderboard(true)}>
            <Text style={styles.headerBtnText}>🏆</Text>
          </TouchableOpacity>
          {userDoc?.role === 'parent' && (
            <TouchableOpacity style={styles.addBtn} onPress={openModal}>
              <Text style={styles.addBtnText}>+ הוסף</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.headerTitle}>משימות</Text>
      </View>

      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        {tasks.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyText}>אין משימות עדיין</Text>
            <Text style={styles.emptySubtext}>לחץ על "+ הוסף" כדי להתחיל</Text>
          </View>
        )}

        {inProgress.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>בביצוע ({inProgress.length})</Text>
            {inProgress.map((t) => (
              <TaskCard key={t.id} task={t} members={members}
                onStatusPress={() => handleStatusPress(t)}
                onDelete={() => handleDelete(t)} />
            ))}
          </>
        )}

        {todo.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>לביצוע ({todo.length})</Text>
            {todo.map((t) => (
              <TaskCard key={t.id} task={t} members={members}
                onStatusPress={() => handleStatusPress(t)}
                onDelete={() => handleDelete(t)} />
            ))}
          </>
        )}

        {done.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>הושלמו ({done.length})</Text>
            {done.map((t) => (
              <TaskCard key={t.id} task={t} members={members}
                onStatusPress={() => handleStatusPress(t)}
                onDelete={() => handleDelete(t)} />
            ))}
          </>
        )}
      </ScrollView>

      {/* Add Task Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>משימה חדשה</Text>

            <Text style={styles.fieldLabel}>כותרת</Text>
            <TextInput
              style={styles.input}
              placeholder="לדוגמה: לשטוף כלים..."
              placeholderTextColor={Colors.textMuted}
              value={title}
              onChangeText={setTitle}
              textAlign="right"
              autoFocus
            />

            <TouchableOpacity style={styles.recurringRow} onPress={() => setIsRecurring(v => !v)}>
              <View style={[styles.toggle, isRecurring && styles.toggleOn]}>
                <View style={[styles.toggleThumb, isRecurring && styles.toggleThumbOn]} />
              </View>
              <Text style={styles.recurringLabel}>🔄 משימה קבועה יומית</Text>
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>הקצה ל</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.membersScroll}>
              {members.map((m) => (
                <TouchableOpacity
                  key={m.uid}
                  style={[styles.memberChip, assignedTo === m.uid && styles.memberChipActive]}
                  onPress={() => setAssignedTo(m.uid)}
                >
                  <Text style={[styles.memberChipText, assignedTo === m.uid && styles.memberChipTextActive]}>
                    {m.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>תאריך יעד</Text>
            <TouchableOpacity style={styles.datePicker} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.datePickerText}>
                {dueDate.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
            </TouchableOpacity>

            {showDatePicker && Platform.OS === 'android' && (
              <DateTimePicker value={tempDate} mode="date" display="default" minimumDate={new Date()}
                onChange={(_, s) => { setShowDatePicker(false); if (s) setDueDate(s); }} />
            )}
            {showDatePicker && Platform.OS === 'ios' && (
              <Modal transparent animationType="fade">
                <View style={styles.iosPickerOverlay}>
                  <View style={styles.iosPickerCard}>
                    <DateTimePicker value={tempDate} mode="date" display="spinner" minimumDate={new Date()}
                      onChange={(_, s) => { if (s) setTempDate(s); }} />
                    <View style={styles.iosPickerActions}>
                      <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                        <Text style={styles.iosPickerCancel}>ביטול</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => { setDueDate(tempDate); setShowDatePicker(false); }}>
                        <Text style={styles.iosPickerDone}>אישור</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>
            )}

            <Text style={styles.fieldLabel}>נקודות</Text>
            <View style={styles.quantityRow}>
              <TouchableOpacity style={styles.qtyBtn}
                onPress={() => setPoints((p) => String(Math.max(5, parseInt(p) - 5)))}>
                <Text style={styles.qtyBtnText}>−</Text>
              </TouchableOpacity>
              <TextInput style={styles.qtyInput} value={points} onChangeText={setPoints}
                keyboardType="number-pad" textAlign="center" />
              <TouchableOpacity style={styles.qtyBtn}
                onPress={() => setPoints((p) => String(parseInt(p) + 5))}>
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleAdd} disabled={saving}>
                <Text style={styles.saveBtnText}>{saving ? 'שומר...' : 'הוסף'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Leaderboard Modal */}
      <Modal visible={showLeaderboard} animationType="slide" transparent onRequestClose={() => setShowLeaderboard(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowLeaderboard(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.modalCard}>
            <Text style={styles.modalTitle}>🏆 לוח תוצאות</Text>
            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              {leaderboard.map((entry, i) => (
                <View key={entry.member.uid} style={styles.leaderRow}>
                  <Text style={styles.leaderPoints}>{entry.points} ⭐</Text>
                  <Text style={styles.leaderName}>{entry.member.name}</Text>
                  <Text style={styles.leaderRank}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                  </Text>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={[styles.saveBtn, { marginTop: 20 }]} onPress={() => setShowLeaderboard(false)}>
              <Text style={styles.saveBtnText}>סגור</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
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
  headerActions: { flexDirection: 'row', gap: 8 },
  addBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: Colors.textOnDark, fontWeight: '700', fontSize: 14 },
  headerBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  headerBtnText: { fontSize: 16 },
  inner: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.textMuted, textAlign: 'right', marginBottom: 10, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.8 },

  empty: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  emptySubtext: { fontSize: 13, color: Colors.textMuted },

  taskCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  taskTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  taskInfo: { flex: 1, alignItems: 'flex-end' },
  taskTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, textAlign: 'right' },
  taskTitleDone: { textDecorationLine: 'line-through', color: Colors.textMuted },
  taskMeta: { flexDirection: 'row', gap: 10, marginTop: 6, flexWrap: 'wrap', justifyContent: 'flex-end' },
  taskDate: { fontSize: 12, color: Colors.textMuted },
  taskPoints: { fontSize: 12, color: Colors.textMuted },
  taskAssignee: { fontSize: 12, color: Colors.textMuted },
  deleteBtn: { padding: 4, marginLeft: 8 },
  deleteBtnText: { color: '#FF5252', fontSize: 14 },
  statusBadge: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-end' },
  statusText: { fontSize: 12, fontWeight: '700', color: Colors.text },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Colors.white, borderRadius: 28, padding: 28, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.text, textAlign: 'right', marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.text, textAlign: 'right', marginBottom: 8 },
  input: { backgroundColor: Colors.inputBg, borderRadius: 14, height: 52, paddingHorizontal: 16, color: Colors.text, fontSize: 15, marginBottom: 16, borderWidth: 1.5, borderColor: Colors.inputBorder },
  membersScroll: { marginBottom: 16 },
  memberChip: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: Colors.inputBg, marginRight: 8, borderWidth: 1.5, borderColor: Colors.inputBorder },
  memberChipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  memberChipText: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  memberChipTextActive: { color: Colors.primary },
  datePicker: { backgroundColor: Colors.inputBg, borderRadius: 14, height: 52, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'flex-end', marginBottom: 16, borderWidth: 1.5, borderColor: Colors.inputBorder },
  datePickerText: { fontSize: 15, color: Colors.text },
  quantityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 24 },
  qtyBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 22, fontWeight: '700', color: Colors.primary },
  qtyInput: { width: 60, height: 44, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.inputBorder, backgroundColor: Colors.inputBg, fontSize: 18, fontWeight: '700', color: Colors.text },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.inputBorder, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '700', color: Colors.textMuted },
  saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: Colors.white },
  iosPickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  iosPickerCard: { backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32 },
  iosPickerActions: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 8 },
  iosPickerCancel: { fontSize: 16, color: Colors.textMuted, fontWeight: '600' },
  iosPickerDone: { fontSize: 16, color: Colors.primary, fontWeight: '700' },

  // Recurring toggle
  recurringRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginBottom: 16, paddingVertical: 4 },
  toggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: Colors.inputBorder, justifyContent: 'center', paddingHorizontal: 2 },
  toggleOn: { backgroundColor: Colors.primary },
  toggleThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.white, alignSelf: 'flex-start' },
  toggleThumbOn: { alignSelf: 'flex-end' },
  recurringLabel: { fontSize: 14, fontWeight: '600', color: Colors.text },

  // Leaderboard
  leaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  leaderRank: { fontSize: 20, width: 32 },
  leaderName: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.text, textAlign: 'right', marginHorizontal: 12 },
  leaderPoints: { fontSize: 15, fontWeight: '800', color: Colors.primary },
});

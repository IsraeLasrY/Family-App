import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, DateData } from 'react-native-calendars';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '../../src/core/theme/colors';
import { useAuth } from '../../src/features/auth/hooks/useAuth';
import {
  subscribeToEvents,
  addEvent,
  updateEvent,
  deleteEvent,
} from '../../src/features/calendar/services/eventService';
import { Event } from '../../src/types';

const CATEGORIES: { value: Event['category']; label: string; color: string; icon: string }[] = [
  { value: 'general',     label: 'כללי',    color: '#EAE8FF', icon: '📌' },
  { value: 'medical',     label: 'רפואי',   color: '#FCE4EC', icon: '🏥' },
  { value: 'school',      label: 'בית ספר', color: '#E8F5E9', icon: '🎒' },
  { value: 'celebration', label: 'חגיגה',   color: '#FFF3E0', icon: '🎉' },
];

function categoryMeta(cat: Event['category']) {
  return CATEGORIES.find((c) => c.value === cat) ?? CATEGORIES[0];
}

function toDateString(date: any): string {
  const d = date?.toDate ? date.toDate() : new Date(date);
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}


export default function CalendarScreen() {
  const { userDoc, user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [modalVisible, setModalVisible] = useState(false);

  // Add/edit event form state
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [category, setCategory] = useState<Event['category']>('general');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userDoc?.familyId) return;
    const unsub = subscribeToEvents(userDoc.familyId, setEvents);
    return unsub;
  }, [userDoc?.familyId]);

  // Build marked dates for the calendar
  const markedDates: Record<string, any> = {};
  events.forEach((e) => {
    const key = toDateString(e.date);
    if (!markedDates[key]) {
      markedDates[key] = { dots: [], marked: true };
    }
    if (markedDates[key].dots.length < 3) {
      markedDates[key].dots.push({ color: Colors.primary });
    }
  });
  // Highlight selected date
  markedDates[selectedDate] = {
    ...(markedDates[selectedDate] ?? {}),
    selected: true,
    selectedColor: Colors.primary,
  };

  const selectedEvents = events.filter((e) => toDateString(e.date) === selectedDate);

  function openModal(event?: Event) {
    if (event) {
      const d = event.date?.toDate ? event.date.toDate() : new Date(event.date as any);
      setEditingEvent(event);
      setTitle(event.title);
      setDate(d);
      setTempDate(d);
      setCategory(event.category);
    } else {
      const d = new Date();
      setEditingEvent(null);
      setTitle('');
      setDate(d);
      setTempDate(d);
      setCategory('general');
    }
    setModalVisible(true);
  }

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert('שגיאה', 'נא להזין כותרת');
      return;
    }
    setSaving(true);
    try {
      if (editingEvent) {
        await updateEvent(editingEvent.id, title.trim(), date, category);
      } else {
        await addEvent(userDoc!.familyId, user!.uid, title.trim(), date, category);
      }
      setModalVisible(false);
    } catch {
      Alert.alert('שגיאה', 'לא ניתן לשמור את האירוע. נסה שוב.');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(event: Event) {
    Alert.alert('מחיקת אירוע', `למחוק את "${event.title}"?`, [
      { text: 'ביטול', style: 'cancel' },
      { text: 'מחק', style: 'destructive', onPress: () => deleteEvent(event.id) },
    ]);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.addBtn} onPress={() => openModal()}>
          <Text style={styles.addBtnText}>+ הוסף</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>לוח שנה</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Calendar */}
        <Calendar
          markingType="multi-dot"
          markedDates={markedDates}
          onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
          theme={{
            backgroundColor: Colors.white,
            calendarBackground: Colors.white,
            selectedDayBackgroundColor: Colors.primary,
            selectedDayTextColor: Colors.white,
            todayTextColor: Colors.primary,
            arrowColor: Colors.primary,
            dotColor: Colors.primary,
            monthTextColor: Colors.text,
            textDayFontWeight: '600',
            textMonthFontWeight: '800',
            textDayHeaderFontWeight: '600',
          }}
          style={styles.calendar}
        />

        {/* Events for selected day */}
        <View style={styles.eventsSection}>
          <Text style={styles.sectionTitle}>
            {new Date(selectedDate).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>

          {selectedEvents.length === 0 ? (
            <Text style={styles.noEvents}>אין אירועים ביום זה</Text>
          ) : (
            selectedEvents.map((e) => {
              const meta = categoryMeta(e.category);
              return (
                <View key={e.id} style={[styles.eventCard, { backgroundColor: meta.color }]}>
                  <View style={styles.eventBody}>
                    <Text style={styles.eventTitle}>{e.title}</Text>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryText}>{meta.icon} {meta.label}</Text>
                    </View>
                  </View>
                  {e.createdBy === user?.uid && (
                    <View style={styles.eventActions}>
                      <TouchableOpacity style={styles.editBtn} onPress={() => openModal(e)}>
                        <Text style={styles.editBtnText}>✏️</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(e)}>
                        <Text style={styles.deleteBtnText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Add Event Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editingEvent ? 'עריכת אירוע' : 'אירוע חדש'}</Text>

            <Text style={styles.fieldLabel}>כותרת</Text>
            <TextInput
              style={styles.input}
              placeholder="שם האירוע"
              placeholderTextColor={Colors.textMuted}
              value={title}
              onChangeText={setTitle}
              textAlign="right"
              autoFocus
            />

            <Text style={styles.fieldLabel}>תאריך</Text>
            <TouchableOpacity style={styles.datePicker} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.datePickerText}>
                {date.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
            </TouchableOpacity>

            {/* Date picker — iOS shows inline modal, Android shows native picker */}
            {showDatePicker && Platform.OS === 'android' && (
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="default"
                minimumDate={new Date()}
                onChange={(_, selected) => {
                  setShowDatePicker(false);
                  if (selected) setDate(selected);
                }}
              />
            )}
            {showDatePicker && Platform.OS === 'ios' && (
              <Modal transparent animationType="fade">
                <View style={styles.iosPickerOverlay}>
                  <View style={styles.iosPickerCard}>
                    <DateTimePicker
                      value={tempDate}
                      mode="date"
                      display="spinner"
                      minimumDate={new Date()}
                      onChange={(_, selected) => {
                        if (selected) setTempDate(selected);
                      }}
                    />
                    <View style={styles.iosPickerActions}>
                      <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                        <Text style={styles.iosPickerCancel}>ביטול</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => { setDate(tempDate); setShowDatePicker(false); }}>
                        <Text style={styles.iosPickerDone}>אישור</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>
            )}

            <Text style={styles.fieldLabel}>קטגוריה</Text>
            <View style={styles.categoryRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  style={[styles.catBtn, { backgroundColor: cat.color }, category === cat.value && styles.catBtnActive]}
                  onPress={() => setCategory(cat.value)}
                >
                  <Text style={styles.catBtnIcon}>{cat.icon}</Text>
                  <Text style={[styles.catBtnText, category === cat.value && styles.catBtnTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
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
  calendar: { borderRadius: 20, margin: 16, elevation: 2, shadowColor: Colors.primary, shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  eventsSection: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: Colors.text, marginBottom: 12, marginTop: 4 },
  noEvents: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', marginTop: 16 },
  eventCard: { borderRadius: 16, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  eventBody: { flex: 1 },
  eventTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  categoryBadge: { backgroundColor: 'rgba(0,0,0,0.07)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginTop: 6, alignSelf: 'flex-start' },
  categoryText: { fontSize: 11, fontWeight: '600', color: Colors.text },
  eventActions: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  editBtn: { padding: 6 },
  editBtnText: { fontSize: 15 },
  deleteBtn: { padding: 6 },
  deleteBtnText: { fontSize: 16, color: '#FF5252' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Colors.white, borderRadius: 28, padding: 28, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.text, textAlign: 'right', marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.text, textAlign: 'right', marginBottom: 8 },
  input: { backgroundColor: Colors.inputBg, borderRadius: 14, height: 52, paddingHorizontal: 16, color: Colors.text, fontSize: 15, marginBottom: 16, borderWidth: 1.5, borderColor: Colors.inputBorder },
  datePicker: { backgroundColor: Colors.inputBg, borderRadius: 14, height: 52, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'flex-end', marginBottom: 16, borderWidth: 1.5, borderColor: Colors.inputBorder },
  datePickerText: { fontSize: 15, color: Colors.text },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  catBtn: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: 'transparent' },
  catBtnActive: { borderColor: Colors.primary },
  catBtnIcon: { fontSize: 16 },
  catBtnText: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  catBtnTextActive: { color: Colors.primary },
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
});

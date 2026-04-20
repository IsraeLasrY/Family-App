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
import { Colors } from '../../src/core/theme/colors';
import { useAuth } from '../../src/features/auth/hooks/useAuth';
import {
  subscribeToShoppingItems,
  addShoppingItem,
  toggleBought,
  deleteShoppingItem,
  deleteAllBought,
} from '../../src/features/shopping/services/shoppingService';
import { ShoppingItem } from '../../src/types';

export default function ShoppingScreen() {
  const { userDoc, user } = useAuth();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userDoc?.familyId) return;
    const unsub = subscribeToShoppingItems(userDoc.familyId, setItems);
    return unsub;
  }, [userDoc?.familyId]);

  function openModal() {
    setName('');
    setQuantity('1');
    setModalVisible(true);
  }

  async function handleAdd() {
    if (!name.trim()) {
      Alert.alert('שגיאה', 'נא להזין שם פריט');
      return;
    }
    const qty = parseInt(quantity) || 1;
    setSaving(true);
    try {
      await addShoppingItem(userDoc!.familyId, user!.uid, name.trim(), qty);
      setModalVisible(false);
    } catch {
      Alert.alert('שגיאה', 'לא ניתן להוסיף פריט. נסה שוב.');
    } finally {
      setSaving(false);
    }
  }

  function handleDeleteBought() {
    const boughtCount = items.filter((i) => i.isBought).length;
    if (boughtCount === 0) return;
    Alert.alert('ניקוי רשימה', `למחוק ${boughtCount} פריטים שנקנו?`, [
      { text: 'ביטול', style: 'cancel' },
      { text: 'מחק', style: 'destructive', onPress: () => deleteAllBought(items) },
    ]);
  }

  const pending = items.filter((i) => !i.isBought);
  const bought = items.filter((i) => i.isBought);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>רשימת קניות</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openModal}>
          <Text style={styles.addBtnText}>+ הוסף</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        {items.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🛒</Text>
            <Text style={styles.emptyText}>הרשימה ריקה</Text>
            <Text style={styles.emptySubtext}>לחץ על "+ הוסף" כדי להתחיל</Text>
          </View>
        )}

        {/* Pending items */}
        {pending.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>לקנות ({pending.length})</Text>
            {pending.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                onToggle={() => toggleBought(item.id, true)}
                onDelete={() => deleteShoppingItem(item.id)}
              />
            ))}
          </>
        )}

        {/* Bought items */}
        {bought.length > 0 && (
          <>
            <View style={styles.boughtHeader}>
              <TouchableOpacity onPress={handleDeleteBought}>
                <Text style={styles.clearBtn}>נקה ({bought.length})</Text>
              </TouchableOpacity>
              <Text style={styles.sectionTitle}>נקנה</Text>
            </View>
            {bought.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                onToggle={() => toggleBought(item.id, false)}
                onDelete={() => deleteShoppingItem(item.id)}
              />
            ))}
          </>
        )}
      </ScrollView>

      {/* Add Item Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>פריט חדש</Text>

            <Text style={styles.fieldLabel}>שם הפריט</Text>
            <TextInput
              style={styles.input}
              placeholder="לדוגמה: חלב, לחם..."
              placeholderTextColor={Colors.textMuted}
              value={name}
              onChangeText={setName}
              textAlign="right"
              autoFocus
            />

            <Text style={styles.fieldLabel}>כמות</Text>
            <View style={styles.quantityRow}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setQuantity((q) => String(Math.max(1, parseInt(q) - 1)))}
              >
                <Text style={styles.qtyBtnText}>−</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.qtyInput}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="number-pad"
                textAlign="center"
              />
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setQuantity((q) => String(parseInt(q) + 1))}
              >
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleAdd}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>{saving ? 'שומר...' : 'הוסף'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function ItemRow({ item, onToggle, onDelete }: {
  item: ShoppingItem;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.itemRow, item.isBought && styles.itemRowBought]} onPress={onToggle} activeOpacity={0.7}>
      <TouchableOpacity style={styles.deleteItemBtn} onPress={onDelete}>
        <Text style={styles.deleteItemText}>✕</Text>
      </TouchableOpacity>
      <View style={styles.itemBody}>
        <Text style={[styles.itemName, item.isBought && styles.itemNameBought]}>{item.name}</Text>
        {item.quantity > 1 && (
          <Text style={styles.itemQty}>× {item.quantity}</Text>
        )}
      </View>
      <View style={[styles.checkbox, item.isBought && styles.checkboxChecked]}>
        {item.isBought && <Text style={styles.checkmark}>✓</Text>}
      </View>
    </TouchableOpacity>
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
  inner: { padding: 20, paddingBottom: 40 },

  empty: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  emptySubtext: { fontSize: 13, color: Colors.textMuted },

  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.textMuted, textAlign: 'right', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 },
  boughtHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
  clearBtn: { fontSize: 13, fontWeight: '700', color: '#FF5252' },

  itemRow: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  itemRowBought: { opacity: 0.5 },
  itemBody: { flex: 1, alignItems: 'flex-end', marginHorizontal: 10 },
  itemName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  itemNameBought: { textDecorationLine: 'line-through', color: Colors.textMuted },
  itemQty: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkmark: { color: Colors.white, fontSize: 14, fontWeight: '800' },
  deleteItemBtn: { padding: 4 },
  deleteItemText: { color: '#FF5252', fontSize: 14 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Colors.white, borderRadius: 28, padding: 28, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.text, textAlign: 'right', marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.text, textAlign: 'right', marginBottom: 8 },
  input: { backgroundColor: Colors.inputBg, borderRadius: 14, height: 52, paddingHorizontal: 16, color: Colors.text, fontSize: 15, marginBottom: 20, borderWidth: 1.5, borderColor: Colors.inputBorder },
  quantityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 28 },
  qtyBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 22, fontWeight: '700', color: Colors.primary },
  qtyInput: { width: 60, height: 44, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.inputBorder, backgroundColor: Colors.inputBg, fontSize: 18, fontWeight: '700', color: Colors.text },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.inputBorder, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '700', color: Colors.textMuted },
  saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: Colors.white },
});

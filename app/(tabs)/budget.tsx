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
  subscribeToTransactions,
  subscribeToBudgetLimits,
  addTransaction,
  deleteTransaction,
  setBudgetLimit,
} from '../../src/features/budget/services/budgetService';
import { Transaction, BudgetLimit } from '../../src/types';

const CATEGORIES = [
  { key: 'food',          label: 'מזון',      icon: '🍔' },
  { key: 'transport',     label: 'תחבורה',    icon: '🚗' },
  { key: 'shopping',      label: 'קניות',     icon: '🛍️' },
  { key: 'health',        label: 'בריאות',    icon: '💊' },
  { key: 'education',     label: 'חינוך',     icon: '📚' },
  { key: 'entertainment', label: 'בילויים',   icon: '🎬' },
  { key: 'other',         label: 'אחר',       icon: '💸' },
];

const INCOME_CATEGORIES = [
  { key: 'salary',  label: 'משכורת', icon: '💰' },
  { key: 'bonus',   label: 'בונוס',  icon: '🎁' },
  { key: 'other',   label: 'אחר',    icon: '💸' },
];

function getCategoryMeta(key: string) {
  return CATEGORIES.find((c) => c.key === key)
    ?? INCOME_CATEGORIES.find((c) => c.key === key)
    ?? { key, label: key, icon: '💸' };
}

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function isCurrentMonth(ts: any): boolean {
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function formatAmount(n: number) {
  return n.toLocaleString('he-IL', { maximumFractionDigits: 0 });
}

export default function BudgetScreen() {
  const { user, userDoc } = useAuth();
  const isParent = userDoc?.role === 'parent';

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgetLimits, setBudgetLimits] = useState<BudgetLimit[]>([]);

  // Add transaction modal
  const [modalVisible, setModalVisible] = useState(false);
  const [txType, setTxType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('food');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // Budget limit modal
  const [limitModalVisible, setLimitModalVisible] = useState(false);
  const [limitCategory, setLimitCategory] = useState('food');
  const [limitAmount, setLimitAmount] = useState('');
  const [savingLimit, setSavingLimit] = useState(false);

  useEffect(() => {
    if (!userDoc?.familyId) return;
    const unsub1 = subscribeToTransactions(userDoc.familyId, setTransactions);
    const unsub2 = subscribeToBudgetLimits(userDoc.familyId, setBudgetLimits);
    return () => { unsub1(); unsub2(); };
  }, [userDoc?.familyId]);

  function openModal(type: 'income' | 'expense') {
    setTxType(type);
    setAmount('');
    setCategory(type === 'expense' ? 'food' : 'salary');
    setDescription('');
    setModalVisible(true);
  }

  function openLimitModal(catKey: string) {
    const existing = budgetLimits.find((l) => l.category === catKey);
    setLimitCategory(catKey);
    setLimitAmount(existing ? String(existing.monthlyLimit) : '');
    setLimitModalVisible(true);
  }

  async function handleAdd() {
    const num = parseFloat(amount);
    if (!amount || isNaN(num) || num <= 0) {
      Alert.alert('שגיאה', 'נא להזין סכום תקין');
      return;
    }

    // Check budget limit before saving
    if (txType === 'expense') {
      const limit = budgetLimits.find((l) => l.category === category);
      if (limit) {
        const spent = transactions
          .filter((t) => t.type === 'expense' && t.category === category && isCurrentMonth(t.date))
          .reduce((sum, t) => sum + t.amount, 0);
        if (spent + num > limit.monthlyLimit) {
          const over = spent + num - limit.monthlyLimit;
          const shouldContinue = await new Promise<boolean>((resolve) => {
            Alert.alert(
              '⚠️ חריגה מהתקציב',
              `תחרוג ב-₪${formatAmount(over)} מהתקציב החודשי של ${getCategoryMeta(category).label}.\nבכל זאת להוסיף?`,
              [
                { text: 'ביטול', style: 'cancel', onPress: () => resolve(false) },
                { text: 'הוסף בכל זאת', onPress: () => resolve(true) },
              ]
            );
          });
          if (!shouldContinue) return;
        }
      }
    }

    setSaving(true);
    try {
      await addTransaction(
        userDoc!.familyId,
        num,
        txType,
        category,
        new Date(),
        description.trim(),
        user!.uid
      );
      setModalVisible(false);
    } catch {
      Alert.alert('שגיאה', 'לא ניתן לשמור. נסה שוב.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveLimit() {
    const num = parseFloat(limitAmount);
    if (!limitAmount || isNaN(num) || num <= 0) {
      Alert.alert('שגיאה', 'נא להזין סכום תקין');
      return;
    }
    setSavingLimit(true);
    try {
      await setBudgetLimit(userDoc!.familyId, limitCategory, num);
      setLimitModalVisible(false);
    } catch {
      Alert.alert('שגיאה', 'לא ניתן לשמור. נסה שוב.');
    } finally {
      setSavingLimit(false);
    }
  }

  function handleDelete(tx: Transaction) {
    Alert.alert('מחיקת עסקה', `למחוק את "${tx.description || getCategoryMeta(tx.category).label}"?`, [
      { text: 'ביטול', style: 'cancel' },
      { text: 'מחק', style: 'destructive', onPress: () => deleteTransaction(tx.id) },
    ]);
  }

  // Compute monthly totals
  const monthTx = transactions.filter((t) => isCurrentMonth(t.date));
  const totalIncome = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  // Expense breakdown by category (current month)
  const categorySpending = CATEGORIES.map((cat) => {
    const spent = monthTx
      .filter((t) => t.type === 'expense' && t.category === cat.key)
      .reduce((s, t) => s + t.amount, 0);
    const limit = budgetLimits.find((l) => l.category === cat.key);
    return { ...cat, spent, limit: limit?.monthlyLimit ?? 0 };
  }).filter((c) => c.spent > 0 || c.limit > 0);

  const cats = txType === 'expense' ? CATEGORIES : INCOME_CATEGORIES;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        {isParent && (
          <TouchableOpacity style={styles.limitBtn} onPress={() => openLimitModal('food')}>
            <Text style={styles.limitBtnText}>⚙️ גבולות</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>💰 תקציב</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.inner}>

        {/* Balance card */}
        <View style={[styles.balanceCard, { backgroundColor: balance >= 0 ? Colors.primary : Colors.error }]}>
          <Text style={styles.balanceLabel}>יתרה חודשית</Text>
          <Text style={styles.balanceAmount}>
            {balance >= 0 ? '+' : ''}₪{formatAmount(balance)}
          </Text>
          <View style={styles.balanceRow}>
            <View style={styles.balanceStat}>
              <Text style={styles.balanceStatLabel}>הכנסות</Text>
              <Text style={styles.balanceStatNum}>₪{formatAmount(totalIncome)}</Text>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceStat}>
              <Text style={styles.balanceStatLabel}>הוצאות</Text>
              <Text style={styles.balanceStatNum}>₪{formatAmount(totalExpense)}</Text>
            </View>
          </View>
        </View>

        {/* Add buttons */}
        {isParent && (
          <View style={styles.addRow}>
            <TouchableOpacity style={[styles.addTypeBtn, styles.addExpenseBtn]} onPress={() => openModal('expense')}>
              <Text style={styles.addTypeBtnText}>− הוצאה</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.addTypeBtn, styles.addIncomeBtn]} onPress={() => openModal('income')}>
              <Text style={styles.addTypeBtnText}>+ הכנסה</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Category breakdown */}
        {categorySpending.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>הוצאות לפי קטגוריה — החודש</Text>
            {categorySpending.map((cat) => {
              const hasLimit = cat.limit > 0;
              const pct = hasLimit ? Math.min(cat.spent / cat.limit, 1) : 0;
              const over = hasLimit && cat.spent > cat.limit;
              return (
                <TouchableOpacity
                  key={cat.key}
                  style={styles.catCard}
                  onPress={() => isParent && openLimitModal(cat.key)}
                  activeOpacity={isParent ? 0.7 : 1}
                >
                  <View style={styles.catHeader}>
                    <Text style={styles.catSpent}>
                      ₪{formatAmount(cat.spent)}{hasLimit ? ` / ₪${formatAmount(cat.limit)}` : ''}
                      {over && <Text style={styles.overText}> ⚠️</Text>}
                    </Text>
                    <View style={styles.catLabelRow}>
                      <Text style={styles.catLabel}>{cat.label}</Text>
                      <Text style={styles.catIcon}>{cat.icon}</Text>
                    </View>
                  </View>
                  {hasLimit && (
                    <View style={styles.progressBg}>
                      <View style={[
                        styles.progressFill,
                        { width: `${pct * 100}%` as any, backgroundColor: over ? Colors.error : pct > 0.8 ? Colors.warning : Colors.success }
                      ]} />
                    </View>
                  )}
                  {!hasLimit && isParent && (
                    <Text style={styles.setLimitHint}>לחץ לקביעת תקציב</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* Transactions list */}
        {transactions.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>💳</Text>
            <Text style={styles.emptyText}>אין עסקאות עדיין</Text>
            <Text style={styles.emptySubtext}>הוסף הכנסה או הוצאה כדי להתחיל לעקוב</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>עסקאות אחרונות</Text>
            {transactions.slice(0, 30).map((tx) => {
              const meta = getCategoryMeta(tx.category);
              const d = tx.date?.toDate ? tx.date.toDate() : new Date();
              return (
                <View key={tx.id} style={styles.txCard}>
                  <View style={styles.txLeft}>
                    {isParent && (
                      <TouchableOpacity onPress={() => handleDelete(tx)} style={styles.deleteBtn}>
                        <Text style={styles.deleteBtnText}>✕</Text>
                      </TouchableOpacity>
                    )}
                    <Text style={[styles.txAmount, { color: tx.type === 'income' ? Colors.success : Colors.error }]}>
                      {tx.type === 'income' ? '+' : '-'}₪{formatAmount(tx.amount)}
                    </Text>
                  </View>
                  <View style={styles.txRight}>
                    <Text style={styles.txTitle}>{tx.description || meta.label}</Text>
                    <View style={styles.txMeta}>
                      <Text style={styles.txDate}>
                        {d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })}
                      </Text>
                      <Text style={styles.txCat}>{meta.icon} {meta.label}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>

      {/* Add Transaction Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {txType === 'expense' ? '− הוספת הוצאה' : '+ הוספת הכנסה'}
            </Text>

            <Text style={styles.fieldLabel}>סכום (₪)</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              textAlign="right"
              autoFocus
            />

            <Text style={styles.fieldLabel}>קטגוריה</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catsScroll}>
              {cats.map((c) => (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.catChip, category === c.key && styles.catChipActive]}
                  onPress={() => setCategory(c.key)}
                >
                  <Text style={styles.catChipIcon}>{c.icon}</Text>
                  <Text style={[styles.catChipText, category === c.key && styles.catChipTextActive]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>תיאור (אופציונלי)</Text>
            <TextInput
              style={styles.input}
              placeholder="לדוגמה: סופרמרקט שופרסל..."
              placeholderTextColor={Colors.textMuted}
              value={description}
              onChangeText={setDescription}
              textAlign="right"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: txType === 'expense' ? Colors.error : Colors.success }, saving && { opacity: 0.6 }]}
                onPress={handleAdd}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>{saving ? 'שומר...' : 'הוסף'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Budget Limit Modal */}
      <Modal visible={limitModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>⚙️ קביעת תקציב חודשי</Text>

            <Text style={styles.fieldLabel}>קטגוריה</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catsScroll}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.catChip, limitCategory === c.key && styles.catChipActive]}
                  onPress={() => {
                    setLimitCategory(c.key);
                    const existing = budgetLimits.find((l) => l.category === c.key);
                    setLimitAmount(existing ? String(existing.monthlyLimit) : '');
                  }}
                >
                  <Text style={styles.catChipIcon}>{c.icon}</Text>
                  <Text style={[styles.catChipText, limitCategory === c.key && styles.catChipTextActive]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>תקציב חודשי (₪)</Text>
            <TextInput
              style={styles.input}
              placeholder="לדוגמה: 2000"
              placeholderTextColor={Colors.textMuted}
              value={limitAmount}
              onChangeText={setLimitAmount}
              keyboardType="decimal-pad"
              textAlign="right"
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setLimitModalVisible(false)}>
                <Text style={styles.cancelBtnText}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, savingLimit && { opacity: 0.6 }]}
                onPress={handleSaveLimit}
                disabled={savingLimit}
              >
                <Text style={styles.saveBtnText}>{savingLimit ? 'שומר...' : 'שמור'}</Text>
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
  limitBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  limitBtnText: { color: Colors.textOnDark, fontWeight: '700', fontSize: 14 },
  inner: { padding: 20, paddingBottom: 40 },

  // Balance card
  balanceCard: { borderRadius: 24, padding: 24, marginBottom: 20 },
  balanceLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'right', marginBottom: 4 },
  balanceAmount: { fontSize: 42, fontWeight: '900', color: Colors.white, textAlign: 'right', marginBottom: 20 },
  balanceRow: { flexDirection: 'row', alignItems: 'center' },
  balanceStat: { flex: 1, alignItems: 'center' },
  balanceStatLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  balanceStatNum: { fontSize: 18, fontWeight: '800', color: Colors.white },
  balanceDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.3)' },

  // Add buttons
  addRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  addTypeBtn: { flex: 1, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  addExpenseBtn: { backgroundColor: Colors.error },
  addIncomeBtn: { backgroundColor: Colors.success },
  addTypeBtnText: { color: Colors.white, fontWeight: '800', fontSize: 15 },

  // Section
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.textMuted, textAlign: 'right', marginBottom: 10, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.8 },

  // Category cards
  catCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 10, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 1 },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  catLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  catIcon: { fontSize: 20 },
  catLabel: { fontSize: 15, fontWeight: '700', color: Colors.text },
  catSpent: { fontSize: 14, fontWeight: '700', color: Colors.text },
  overText: { color: Colors.error },
  progressBg: { height: 8, backgroundColor: Colors.inputBorder, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
  setLimitHint: { fontSize: 11, color: Colors.textMuted, textAlign: 'right', marginTop: 4 },

  // Empty
  empty: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  emptySubtext: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },

  // Transaction cards
  txCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 1 },
  txRight: { flex: 1, alignItems: 'flex-end' },
  txLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  txTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, textAlign: 'right' },
  txMeta: { flexDirection: 'row', gap: 8, marginTop: 4, justifyContent: 'flex-end' },
  txDate: { fontSize: 12, color: Colors.textMuted },
  txCat: { fontSize: 12, color: Colors.textMuted },
  txAmount: { fontSize: 16, fontWeight: '800' },
  deleteBtn: { padding: 4 },
  deleteBtnText: { color: Colors.error, fontSize: 13, fontWeight: '700' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Colors.white, borderRadius: 28, padding: 28, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.text, textAlign: 'right', marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.text, textAlign: 'right', marginBottom: 8 },
  input: { backgroundColor: Colors.inputBg, borderRadius: 14, height: 52, paddingHorizontal: 16, color: Colors.text, fontSize: 15, marginBottom: 16, borderWidth: 1.5, borderColor: Colors.inputBorder },
  catsScroll: { marginBottom: 16 },
  catChip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: Colors.inputBg, marginRight: 8, borderWidth: 1.5, borderColor: Colors.inputBorder, alignItems: 'center', flexDirection: 'row', gap: 6 },
  catChipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  catChipIcon: { fontSize: 16 },
  catChipText: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  catChipTextActive: { color: Colors.primary },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.inputBorder, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '700', color: Colors.textMuted },
  saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: Colors.white },
});

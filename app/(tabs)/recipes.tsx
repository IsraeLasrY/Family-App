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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../../src/core/theme/colors';
import { useAuth } from '../../src/features/auth/hooks/useAuth';
import {
  subscribeToRecipes,
  addRecipe,
  deleteRecipe,
  suggestRecipeWithAI,
} from '../../src/features/recipes/services/recipeService';
import { addShoppingItem } from '../../src/features/shopping/services/shoppingService';
import { Recipe } from '../../src/types';

const ALL_TAGS = ['חלבי', 'בשרי', 'פרווה', 'מהיר', 'לילדים', 'בריא', 'קל', 'ארוחת ערב', 'ארוחת בוקר'];

export default function RecipesScreen() {
  const { user, userDoc } = useAuth();
  const router = useRouter();

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Manual add modal
  const [addModal, setAddModal] = useState(false);
  const [manTitle, setManTitle] = useState('');
  const [manIngredients, setManIngredients] = useState<string[]>(['']);
  const [manInstructions, setManInstructions] = useState('');
  const [manTags, setManTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // AI modal
  const [aiModal, setAiModal] = useState(false);
  const [aiIngredients, setAiIngredients] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{
    title: string; ingredients: string[]; instructions: string; tags: string[];
  } | null>(null);
  const [savingAi, setSavingAi] = useState(false);

  // Recipe detail modal
  const [detailRecipe, setDetailRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    if (!userDoc?.familyId) return;
    return subscribeToRecipes(userDoc.familyId, setRecipes);
  }, [userDoc?.familyId]);

  function openAddModal() {
    setManTitle(''); setManIngredients(['']); setManInstructions(''); setManTags([]);
    setAddModal(true);
  }

  function openAiModal() {
    setAiIngredients(''); setAiResult(null);
    setAiModal(true);
  }

  async function handleSaveManual() {
    const cleanIngredients = manIngredients.filter((i) => i.trim());
    if (!manTitle.trim()) { Alert.alert('שגיאה', 'נא להזין שם מתכון'); return; }
    if (cleanIngredients.length === 0) { Alert.alert('שגיאה', 'נא להזין לפחות מצרך אחד'); return; }
    if (!manInstructions.trim()) { Alert.alert('שגיאה', 'נא להזין הוראות הכנה'); return; }
    setSaving(true);
    try {
      await addRecipe(userDoc!.familyId, manTitle.trim(), cleanIngredients, manInstructions.trim(), manTags, 'User_Added');
      setAddModal(false);
    } catch {
      Alert.alert('שגיאה', 'לא ניתן לשמור. נסה שוב.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAISuggest() {
    const ingredients = aiIngredients.split(/[,،\n]/).map((s) => s.trim()).filter(Boolean);
    if (ingredients.length === 0) { Alert.alert('שגיאה', 'נא להזין לפחות מצרך אחד'); return; }
    setAiLoading(true);
    setAiResult(null);
    try {
      const result = await suggestRecipeWithAI(ingredients);
      setAiResult(result);
    } catch {
      Alert.alert('שגיאה', 'לא הצלחנו לקבל הצעה מה-AI. בדוק חיבור לאינטרנט ונסה שוב.');
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSaveAI() {
    if (!aiResult) return;
    setSavingAi(true);
    try {
      await addRecipe(userDoc!.familyId, aiResult.title, aiResult.ingredients, aiResult.instructions, aiResult.tags, 'AI_Generated');
      setAiModal(false);
    } catch {
      Alert.alert('שגיאה', 'לא ניתן לשמור. נסה שוב.');
    } finally {
      setSavingAi(false);
    }
  }

  function handleDelete(recipe: Recipe) {
    Alert.alert('מחיקת מתכון', `למחוק את "${recipe.title}"?`, [
      { text: 'ביטול', style: 'cancel' },
      { text: 'מחק', style: 'destructive', onPress: () => deleteRecipe(recipe.id) },
    ]);
  }

  async function handleSendToShopping(recipe: Recipe) {
    try {
      await Promise.all(
        recipe.ingredients.map((ing) =>
          addShoppingItem(userDoc!.familyId, user!.uid, ing, 1)
        )
      );
      Alert.alert('נשלח!', 'המצרכים נוספו לרשימת הקניות.');
    } catch {
      Alert.alert('שגיאה', 'לא הצלחנו לשלוח לקניות.');
    }
  }

  const filtered = recipes.filter((r) => {
    const matchTag = !filterTag || r.tags.includes(filterTag);
    const matchSearch = !search.trim() ||
      r.ingredients.some((i) => i.includes(search.trim())) ||
      r.title.includes(search.trim());
    return matchTag && matchSearch;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
            <Text style={styles.headerBtnText}>←</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.aiBtn} onPress={openAiModal}>
            <Text style={styles.aiBtnText}>✨ AI</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
            <Text style={styles.addBtnText}>+ הוסף</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>🍳 מתכונים</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.inner}>

        {/* Search */}
        <TextInput
          style={styles.searchInput}
          placeholder="חפש לפי שם או מצרך..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
          textAlign="right"
        />

        {/* Tag filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsScroll}>
          <TouchableOpacity
            style={[styles.tagChip, !filterTag && styles.tagChipActive]}
            onPress={() => setFilterTag(null)}
          >
            <Text style={[styles.tagChipText, !filterTag && styles.tagChipTextActive]}>הכל</Text>
          </TouchableOpacity>
          {ALL_TAGS.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tagChip, filterTag === t && styles.tagChipActive]}
              onPress={() => setFilterTag(filterTag === t ? null : t)}
            >
              <Text style={[styles.tagChipText, filterTag === t && styles.tagChipTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Recipe list */}
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🍽️</Text>
            <Text style={styles.emptyText}>אין מתכונים עדיין</Text>
            <Text style={styles.emptySubtext}>הוסף מתכון ידנית או קבל הצעה מה-AI</Text>
          </View>
        ) : (
          filtered.map((recipe) => (
            <TouchableOpacity key={recipe.id} style={styles.recipeCard} onPress={() => setDetailRecipe(recipe)}>
              <View style={styles.cardTop}>
                <View style={styles.cardBadges}>
                  <View style={[styles.sourceBadge, { backgroundColor: recipe.source === 'AI_Generated' ? '#EAE8FF' : '#E8F5E9' }]}>
                    <Text style={[styles.sourceBadgeText, { color: recipe.source === 'AI_Generated' ? Colors.primary : Colors.success }]}>
                      {recipe.source === 'AI_Generated' ? '✨ AI' : '✍️ ידני'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.recipeTitle}>{recipe.title}</Text>
              </View>
              <Text style={styles.recipeIngredients} numberOfLines={1}>
                {recipe.ingredients.slice(0, 4).join(' • ')}{recipe.ingredients.length > 4 ? '...' : ''}
              </Text>
              <View style={styles.cardTags}>
                {recipe.tags.map((t) => (
                  <View key={t} style={styles.tagPill}>
                    <Text style={styles.tagPillText}>{t}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Manual Add Modal */}
      <Modal visible={addModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>✍️ מתכון חדש</Text>

              <Text style={styles.fieldLabel}>שם המתכון</Text>
              <TextInput style={styles.input} placeholder="לדוגמה: פסטה ברוטב עגבניות" placeholderTextColor={Colors.textMuted}
                value={manTitle} onChangeText={setManTitle} textAlign="right" />

              <Text style={styles.fieldLabel}>מצרכים</Text>
              {manIngredients.map((ing, idx) => (
                <View key={idx} style={styles.ingredientRow}>
                  {manIngredients.length > 1 && (
                    <TouchableOpacity onPress={() => setManIngredients((prev) => prev.filter((_, i) => i !== idx))}>
                      <Text style={styles.removeIngredient}>✕</Text>
                    </TouchableOpacity>
                  )}
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 8 }]}
                    placeholder={`מצרך ${idx + 1}`}
                    placeholderTextColor={Colors.textMuted}
                    value={ing}
                    onChangeText={(v) => setManIngredients((prev) => prev.map((x, i) => i === idx ? v : x))}
                    textAlign="right"
                  />
                </View>
              ))}
              <TouchableOpacity style={styles.addIngredientBtn} onPress={() => setManIngredients((p) => [...p, ''])}>
                <Text style={styles.addIngredientBtnText}>+ הוסף מצרך</Text>
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>הוראות הכנה</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="כתוב את שלבי ההכנה..."
                placeholderTextColor={Colors.textMuted}
                value={manInstructions}
                onChangeText={setManInstructions}
                textAlign="right"
                multiline
                numberOfLines={4}
              />

              <Text style={styles.fieldLabel}>תגיות</Text>
              <View style={styles.tagsGrid}>
                {ALL_TAGS.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.tagChip, manTags.includes(t) && styles.tagChipActive]}
                    onPress={() => setManTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t])}
                  >
                    <Text style={[styles.tagChipText, manTags.includes(t) && styles.tagChipTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setAddModal(false)}>
                  <Text style={styles.cancelBtnText}>ביטול</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSaveManual} disabled={saving}>
                  <Text style={styles.saveBtnText}>{saving ? 'שומר...' : 'שמור'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* AI Modal */}
      <Modal visible={aiModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>✨ הצעת מתכון מ-AI</Text>

              <Text style={styles.fieldLabel}>מה יש לך בבית? (הפרד בפסיקים)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="לדוגמה: עוף, אורז, בצל, שום, עגבניות"
                placeholderTextColor={Colors.textMuted}
                value={aiIngredients}
                onChangeText={setAiIngredients}
                textAlign="right"
                multiline
                numberOfLines={3}
                autoFocus
              />

              <TouchableOpacity
                style={[styles.aiSuggestBtn, aiLoading && { opacity: 0.6 }]}
                onPress={handleAISuggest}
                disabled={aiLoading}
              >
                {aiLoading ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.aiSuggestBtnText}>✨ הצע מתכון</Text>
                )}
              </TouchableOpacity>

              {aiResult && (
                <View style={styles.aiResult}>
                  <Text style={styles.aiResultTitle}>{aiResult.title}</Text>

                  <Text style={styles.aiResultSection}>מצרכים:</Text>
                  {aiResult.ingredients.map((ing, i) => (
                    <Text key={i} style={styles.aiResultItem}>• {ing}</Text>
                  ))}

                  <Text style={styles.aiResultSection}>הכנה:</Text>
                  <Text style={styles.aiResultInstructions}>{aiResult.instructions}</Text>

                  <View style={styles.cardTags}>
                    {aiResult.tags.map((t) => (
                      <View key={t} style={styles.tagPill}>
                        <Text style={styles.tagPillText}>{t}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setAiModal(false)}>
                  <Text style={styles.cancelBtnText}>סגור</Text>
                </TouchableOpacity>
                {aiResult && (
                  <TouchableOpacity style={[styles.saveBtn, savingAi && { opacity: 0.6 }]} onPress={handleSaveAI} disabled={savingAi}>
                    <Text style={styles.saveBtnText}>{savingAi ? 'שומר...' : 'שמור מתכון'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Recipe Detail Modal */}
      <Modal visible={!!detailRecipe} animationType="slide" transparent onRequestClose={() => setDetailRecipe(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDetailRecipe(null)}>
          <TouchableOpacity activeOpacity={1} style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
              <View style={styles.detailHeader}>
                <View style={[styles.sourceBadge, { backgroundColor: detailRecipe?.source === 'AI_Generated' ? '#EAE8FF' : '#E8F5E9' }]}>
                  <Text style={[styles.sourceBadgeText, { color: detailRecipe?.source === 'AI_Generated' ? Colors.primary : Colors.success }]}>
                    {detailRecipe?.source === 'AI_Generated' ? '✨ AI' : '✍️ ידני'}
                  </Text>
                </View>
                <Text style={styles.detailTitle}>{detailRecipe?.title}</Text>
              </View>

              <View style={styles.cardTags}>
                {detailRecipe?.tags.map((t) => (
                  <View key={t} style={styles.tagPill}>
                    <Text style={styles.tagPillText}>{t}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.detailSection}>מצרכים:</Text>
              {detailRecipe?.ingredients.map((ing, i) => (
                <Text key={i} style={styles.detailItem}>• {ing}</Text>
              ))}

              <Text style={styles.detailSection}>הכנה:</Text>
              <Text style={styles.detailInstructions}>{detailRecipe?.instructions}</Text>
            </ScrollView>

            <View style={styles.detailActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => handleDelete(detailRecipe!)}>
                <Text style={[styles.cancelBtnText, { color: Colors.error }]}>🗑️ מחק</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={() => { handleSendToShopping(detailRecipe!); setDetailRecipe(null); }}>
                <Text style={styles.saveBtnText}>🛒 לקניות</Text>
              </TouchableOpacity>
            </View>
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
  headerBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  headerBtnText: { color: Colors.textOnDark, fontWeight: '700', fontSize: 16 },
  addBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: Colors.textOnDark, fontWeight: '700', fontSize: 14 },
  aiBtn: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  aiBtnText: { color: Colors.textOnDark, fontWeight: '800', fontSize: 14 },
  inner: { padding: 20, paddingBottom: 40 },

  searchInput: { backgroundColor: Colors.white, borderRadius: 14, height: 48, paddingHorizontal: 16, color: Colors.text, fontSize: 14, marginBottom: 14, borderWidth: 1.5, borderColor: Colors.inputBorder },

  tagsScroll: { marginBottom: 20 },
  tagChip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: Colors.white, marginRight: 8, borderWidth: 1.5, borderColor: Colors.inputBorder },
  tagChipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  tagChipText: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  tagChipTextActive: { color: Colors.primary },
  tagsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },

  empty: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  emptySubtext: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },

  recipeCard: { backgroundColor: Colors.white, borderRadius: 18, padding: 16, marginBottom: 12, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardBadges: { flexDirection: 'row', gap: 6 },
  sourceBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  sourceBadgeText: { fontSize: 11, fontWeight: '700' },
  recipeTitle: { fontSize: 16, fontWeight: '800', color: Colors.text, textAlign: 'right', flex: 1, marginLeft: 8 },
  recipeIngredients: { fontSize: 12, color: Colors.textMuted, textAlign: 'right', marginBottom: 10 },
  cardTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' },
  tagPill: { backgroundColor: Colors.primaryLight, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  tagPillText: { fontSize: 11, fontWeight: '600', color: Colors.primary },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalScrollContent: { justifyContent: 'flex-end', flexGrow: 1 },
  modalCard: { backgroundColor: Colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, padding: 28, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.text, textAlign: 'right', marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.text, textAlign: 'right', marginBottom: 8 },
  input: { backgroundColor: Colors.inputBg, borderRadius: 14, height: 52, paddingHorizontal: 16, color: Colors.text, fontSize: 15, marginBottom: 16, borderWidth: 1.5, borderColor: Colors.inputBorder },
  textArea: { height: 100, paddingTop: 14, textAlignVertical: 'top' },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  removeIngredient: { color: Colors.error, fontSize: 14, fontWeight: '700', paddingBottom: 16 },
  addIngredientBtn: { alignSelf: 'flex-end', marginBottom: 16 },
  addIngredientBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 14 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.inputBorder, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '700', color: Colors.textMuted },
  saveBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: Colors.white },

  aiSuggestBtn: { height: 52, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  aiSuggestBtnText: { fontSize: 15, fontWeight: '800', color: Colors.white },
  aiResult: { backgroundColor: Colors.inputBg, borderRadius: 16, padding: 16, marginBottom: 16 },
  aiResultTitle: { fontSize: 17, fontWeight: '800', color: Colors.text, textAlign: 'right', marginBottom: 12 },
  aiResultSection: { fontSize: 13, fontWeight: '700', color: Colors.primary, textAlign: 'right', marginBottom: 6, marginTop: 8 },
  aiResultItem: { fontSize: 14, color: Colors.text, textAlign: 'right', marginBottom: 4 },
  aiResultInstructions: { fontSize: 14, color: Colors.text, textAlign: 'right', lineHeight: 22 },

  // Detail modal
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  detailTitle: { fontSize: 20, fontWeight: '800', color: Colors.text, textAlign: 'right', flex: 1, marginLeft: 8 },
  detailSection: { fontSize: 13, fontWeight: '700', color: Colors.primary, textAlign: 'right', marginBottom: 8, marginTop: 16 },
  detailItem: { fontSize: 14, color: Colors.text, textAlign: 'right', marginBottom: 6 },
  detailInstructions: { fontSize: 14, color: Colors.text, textAlign: 'right', lineHeight: 24 },
  detailActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
});

import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../../core/api/firebase';
import { Recipe } from '../../../types';

export function subscribeToRecipes(
  familyId: string,
  onUpdate: (recipes: Recipe[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'Recipes'),
    where('familyId', '==', familyId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    const recipes = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Recipe));
    onUpdate(recipes);
  });
}

export async function addRecipe(
  familyId: string,
  title: string,
  ingredients: string[],
  instructions: string,
  tags: string[],
  source: Recipe['source']
): Promise<void> {
  await addDoc(collection(db, 'Recipes'), {
    familyId,
    title,
    ingredients,
    instructions,
    tags,
    source,
    createdAt: serverTimestamp(),
  });
}

export async function deleteRecipe(recipeId: string): Promise<void> {
  await deleteDoc(doc(db, 'Recipes', recipeId));
}

interface AISuggestedRecipe {
  title: string;
  ingredients: string[];
  instructions: string;
  tags: string[];
}

export async function suggestRecipeWithAI(
  availableIngredients: string[]
): Promise<AISuggestedRecipe> {
  const apiKey = (globalThis as any).process?.env?.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';
  if (!apiKey) throw new Error('Anthropic API key not set');

  const prompt = `You are a professional chef. Reply ONLY in Hebrew language using Hebrew characters only (no Russian, no Latin, no Cyrillic).
The user has these ingredients at home: ${availableIngredients.join(', ')}.
Suggest one delicious recipe using these ingredients (basic spices and oil are allowed).
Return ONLY valid JSON, no extra text:
{
  "title": "שם המתכון בעברית",
  "ingredients": ["מצרך 1 + כמות", "מצרך 2 + כמות"],
  "instructions": "הוראות הכנה בעברית שלב אחרי שלב",
  "tags": ["תגית1", "תגית2"]
}
Available tags (use only these): חלבי, בשרי, פרווה, מהיר, לילדים, בריא, קל, ארוחת ערב, ארוחת בוקר`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) throw new Error('AI request failed');

  const data = await response.json();
  const text = data.content[0].text;

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Invalid AI response format');

  return JSON.parse(jsonMatch[0]) as AISuggestedRecipe;
}

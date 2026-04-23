# FamilyApp — Project Context for Claude

## Overview
Hebrew RTL family management app. React Native + Expo, Firebase backend.
All UI text is Hebrew. Headers and content always align to the **right**.

## Tech Stack
- React Native + Expo SDK 54, TypeScript (strict)
- Expo Router v6 (file-based routing, `app/` directory)
- Firebase Auth + Firestore (real-time `onSnapshot` listeners)
- Feature-first architecture: `src/features/[feature]/services/`
- Anthropic Claude Haiku for AI recipe suggestions (direct `fetch`, not SDK)

## Project Structure
```
app/
  (tabs)/
    index.tsx       — Home screen with feature grid
    calendar.tsx    — Events
    shopping.tsx    — Shopping list
    tasks.tsx       — Family tasks
    budget.tsx      — Budget tracker
    recipes.tsx     — Recipes + AI
    profile.tsx     — User profile (hidden tab)
    _layout.tsx     — Tab bar config
  (auth)/           — Login, register, onboarding screens
src/
  features/
    auth/services/authService.ts, familyService.ts
    auth/hooks/useAuth.ts          — main auth hook (userDoc, familyId, role)
    calendar/services/eventService.ts
    shopping/services/shoppingService.ts
    tasks/services/taskService.ts
    budget/services/budgetService.ts
    recipes/services/recipeService.ts
  types/index.ts    — All shared interfaces
  core/
    api/firebase.ts
    theme/colors.ts
firestore.rules
firestore.indexes.json
```

## Firestore Collections
| Collection    | Key fields                              |
|---------------|-----------------------------------------|
| Families      | name, inviteCode, adminId               |
| Users         | familyId, name, role (parent/child)     |
| Events        | familyId, title, date, category         |
| Shopping      | familyId, name, isBought, quantity      |
| Tasks         | familyId, title, assignedTo, isRecurring|
| Transactions  | familyId, amount, type, category, date  |
| BudgetLimits  | familyId, category, monthlyLimit        |
| Recipes       | familyId, title, ingredients, source    |

## Key Decisions & Conventions
- **AI via direct fetch** — not `@anthropic-ai/sdk` (has Node.js deps incompatible with RN)
- **API key access:** `(globalThis as any).process?.env?.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? ''`
- **AI model:** `claude-haiku-4-5-20251001`
- **Hidden tabs:** `tabBarButton: () => null` in `_layout.tsx`
- **Role-based UI:** parents can add/delete, children can only view/complete
- **Recurring tasks:** max 10 per family
- **RTL:** all headers have title on RIGHT, action buttons on LEFT
- **.md files stay local only** — never commit docs/*.md or planning files to git

## Phases Completed
| Phase | Feature |
|-------|---------|
| 1–2   | Auth, onboarding, family create/join |
| 3     | Calendar, tasks, profile, tab icons |
| 4     | Shopping list (real-time, role-based) |
| 5     | Budget tracker + category limits + overspend alerts |
| 6     | Budget limits modal (parents only) |
| 7     | Recipes — manual add + AI suggestions + send to shopping list |

## Current State (as of 2026-04-23)
- Branch `feature/phase-4-shopping` — all phases 1–7 committed
- **Known issue:** Tab bar items crowd to left side — needs layout fix
- Next phase: **Phase 8 — Weekly Schedule** (לוחות זמנים לילדים)

## Upcoming Phases
- Phase 8: Weekly Schedule (children's time schedules, parent approval)
- Phase 9: Push Notifications
- Phase 10–12: Polish, QA, Release

## Firestore Indexes (all deployed)
- Events: familyId ASC + date ASC
- Shopping: familyId ASC + createdAt ASC
- Tasks: familyId ASC + dueDate ASC
- Transactions: familyId ASC + date DESC
- Recipes: familyId ASC + createdAt DESC
- BudgetLimits: familyId ASC + category ASC

## Environment Variables
```
EXPO_PUBLIC_ANTHROPIC_API_KEY=...   # in .env (not committed)
```

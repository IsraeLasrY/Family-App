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
    index.tsx       — Home screen with feature grid + upcoming events + real-time stats
    calendar.tsx    — Events (add + edit + delete)
    shopping.tsx    — Shopping list
    tasks.tsx       — Family tasks
    budget.tsx      — Budget tracker
    recipes.tsx     — Recipes + AI (hidden tab, nav from home)
    schedule.tsx    — Weekly schedule (hidden tab, nav from home)
    profile.tsx     — User profile (hidden tab, nav from avatar)
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
    schedule/services/scheduleService.ts
  types/index.ts    — All shared interfaces
  core/
    api/firebase.ts
    theme/colors.ts
firestore.rules
firestore.indexes.json
```

## Firestore Collections
| Collection    | Key fields                                        |
|---------------|---------------------------------------------------|
| Families      | name, inviteCode, adminId                         |
| Users         | familyId, name, role (parent/child)               |
| Events        | familyId, title, date, category, createdBy        |
| Shopping      | familyId, name, isBought, quantity                |
| Tasks         | familyId, title, assignedTo, isRecurring, status  |
| Transactions  | familyId, amount, type, category, date            |
| BudgetLimits  | familyId, category, monthlyLimit                  |
| Recipes       | familyId, title, ingredients, source              |
| Schedules     | familyId, userId, activityType, startTime, endTime, repeat, isApproved |

## Key Decisions & Conventions
- **AI via direct fetch** — not `@anthropic-ai/sdk` (has Node.js deps incompatible with RN)
- **API key access:** `(globalThis as any).process?.env?.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? ''`
- **AI model:** `claude-haiku-4-5-20251001`
- **Hidden tabs:** `href: null` in `_layout.tsx` (NOT `tabBarButton: () => null` — that still takes space)
- **Tab bar:** 5 visible tabs with `tabBarItemStyle: { flex: 1 }` per tab + `href: null` hidden tabs get no itemStyle
- **Role-based UI:** parents can add/delete, children can only view/complete
- **Recurring tasks:** max 10 per family
- **RTL:** all headers have title on RIGHT, action buttons on LEFT
- **Date filter on home:** compare by day (setHours 0,0,0,0) not by exact time
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
| 8     | Weekly schedule — day selector, 5 activity types, repeat modes, parent-only |

## Extra features added alongside phases
- Calendar: edit existing events (✏️ opens pre-filled modal, calls `updateEvent`)
- Home: real-time stats (events this week / unbought items / pending tasks)
- Home: upcoming events section (today + 7 days, day-based filter)
- Profile: remove family member (admin only, calls `removeFamilyMember`)

## Current State (as of 2026-04-23)
- Branch `master` — all phases 1–8 committed and merged
- Next phase: **Phase 9 — Push Notifications**

## Upcoming Phases
- Phase 9: Push Notifications (Expo Notifications)
- Phase 10–12: Polish, QA, Release

## Firestore Indexes (all deployed)
- Events: familyId ASC + date ASC
- Shopping: familyId ASC + createdAt ASC
- Tasks: familyId ASC + dueDate ASC
- Transactions: familyId ASC + date DESC
- Recipes: familyId ASC + createdAt DESC
- BudgetLimits: familyId ASC + category ASC
- Schedules: familyId ASC + startTime ASC

## Environment Variables
```
EXPO_PUBLIC_ANTHROPIC_API_KEY=...   # in .env (not committed)
```

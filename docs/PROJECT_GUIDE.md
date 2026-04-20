# FamilyApp — Project Guide

## What is this?
A Smart Family Hub mobile app built with React Native + Expo.
Allows a family to manage events, shopping, tasks, budget, recipes and schedules — all in one place.

## Tech Stack
| Layer | Technology |
|---|---|
| Framework | React Native + Expo SDK 54 |
| Language | TypeScript (strict) |
| Navigation | Expo Router v6 (file-based) |
| Backend | Firebase Auth + Firestore |
| State | React hooks (no Redux) |
| Styling | StyleSheet (no external CSS) |

## Project Structure
```
app/
  (auth)/         — Onboarding screens (welcome, create-family, join-family)
  (tabs)/         — Main app screens (home, calendar, profile)
  _layout.tsx     — Root auth guard

src/
  core/
    api/          — Firebase init
    theme/        — Colors, shared components (FamilyButton, Card)
    utils/        — Validation (email, password, name)
  features/
    auth/
      hooks/      — useAuth (real-time user doc listener)
      services/   — authService, familyService
    calendar/
      services/   — eventService
  types/          — All TypeScript interfaces

docs/
  TODO.md         — Work plan with phase tracking
  PROJECT_GUIDE.md — This file

firestore.rules   — Firestore security rules
firestore.indexes.json — Composite indexes
```

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Firebase setup
- Create a Firebase project at console.firebase.google.com
- Enable Authentication → Email/Password
- Create Firestore database (eur3 region)
- Copy `.env.example` to `.env` and fill in your Firebase config values

### 3. Deploy Firestore rules and indexes
- Go to Firestore → Rules → paste contents of `firestore.rules` → Publish
- Go to Firestore → Indexes → create composite indexes from `firestore.indexes.json`

### 4. Run the app
```bash
npx expo start
```
Scan the QR code with Expo Go on your phone.

## Firebase Data Model

### Users/{uid}
```
uid: string
name: string
email: string
role: 'parent' | 'child'
familyId: string
avatarUrl?: string
```

### Families/{id}
```
id: string
name: string
inviteCode: string   — 6-digit code for joining
adminId: string      — uid of the family creator
createdAt: Timestamp
```

### Events/{id}
```
id: string
familyId: string
title: string
date: Timestamp
category: 'general' | 'medical' | 'school' | 'celebration'
createdBy: string    — uid
```

## Auth Flow
1. User opens app → `useAuth` listens to Firebase Auth state
2. No user → redirect to `/(auth)` welcome screen
3. User exists but no `familyId` → redirect to `/(auth)` family setup
4. User + `familyId` → redirect to `/(tabs)` main app

## Security Rules Summary
- Users: read by owner or family members, write by owner only
- Families: get by members, list by any authenticated user (needed for invite code lookup), create/update/delete by admin
- Events/Shopping/Tasks/Recipes: read+write by family members
- Transactions: read+write by family members, edit/delete by creator only
- Schedules: read by family members, write by parents only

## Key Decisions
- `onSnapshot` in `useAuth` instead of `getDoc` — ensures real-time updates when `familyId` changes after joining a family
- `FamilyUser.uid` (not `id`) — matches Firebase Auth uid convention
- Profile screen hidden from tab bar — accessed by tapping avatar on home screen
- Composite Firestore index required for Events queries (familyId + date)

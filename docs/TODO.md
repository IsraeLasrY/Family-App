# FamilyApp — Work Plan

## ✅ Phase 1 — Security & Infrastructure
- [x] Git hygiene — .env excluded, .claude excluded
- [x] `.env.example` created
- [x] Firestore security rules written and deployed
- [x] Password validation (8+ chars, uppercase, digit)
- [x] Email & name validation
- [x] `onSnapshot` real-time listener in `useAuth` (fixes join-family race condition)

## ✅ Phase 2 — Profile & Family Management
- [x] Profile screen with avatar, name, email, role badge
- [x] Inline name editing
- [x] Family info: name, invite code with copy button
- [x] Family members list
- [x] Profile accessible via avatar tap on home screen (no tab button)
- [x] Sign out moved to profile screen
- [x] Tab bar icons (Ionicons)
- [x] Join-family: role selector (parent / child)
- [x] Fixed FamilyUser.id → uid across all services

## ✅ Phase 3 — Family Calendar
- [x] Month calendar view (react-native-calendars)
- [x] Event dots on days that have events
- [x] Events list for selected day
- [x] Add event modal: title, date picker, category
- [x] Delete event (creator only)
- [x] Firestore composite index: Events (familyId + date)
- [x] Real-time sync via onSnapshot
- [x] iOS date picker with Cancel/Done modal
- [x] Home screen calendar card navigates to calendar tab
- [x] Full Hebrew UI

## 🔲 Phase 4 — Shopping List
- [ ] Shopping screen
- [ ] Add / remove items
- [ ] Mark item as bought
- [ ] Real-time sync

## 🔲 Phase 5 — Tasks & Chores
- [ ] Tasks screen
- [ ] Assign task to family member
- [ ] Status: todo / in progress / done
- [ ] Points system

## 🔲 Phase 6 — Budget Tracker
- [ ] Transactions screen
- [ ] Add income / expense
- [ ] Categories
- [ ] Monthly summary

## 🔲 Phase 7 — Recipes
- [ ] Recipes screen
- [ ] Add / view recipes
- [ ] AI-generated recipe suggestions

## 🔲 Phase 8 — Weekly Schedule
- [ ] Schedule screen (parent only)
- [ ] Assign activities to family members
- [ ] Repeat: daily / weekly / none

## 🔲 Phase 9 — Notifications
- [ ] Push notifications for events and tasks
- [ ] Expo Notifications setup

## 🔲 Phase 10 — Polish & UX
- [ ] Loading skeletons
- [ ] Empty states
- [ ] Animations
- [ ] Dark mode

## 🔲 Phase 11 — QA & Testing
- [ ] Jest unit tests for validation and services
- [ ] E2E tests with Detox
- [ ] Cross-platform testing (iOS + Android)

## 🔲 Phase 12 — Release
- [ ] Restrict Firebase API key in Google Cloud Console
- [ ] App icons and splash screen
- [ ] EAS Build setup
- [ ] Submit to App Store / Google Play

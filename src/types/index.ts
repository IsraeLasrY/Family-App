import { Timestamp } from 'firebase/firestore';

export interface Family {
  id: string;
  name: string;
  inviteCode: string;
  adminId: string;
  createdAt: Timestamp;
}

export interface FamilyUser {
  uid: string;
  familyId: string;
  name: string;
  email: string;
  role: 'parent' | 'child';
  avatarUrl?: string;
}

export interface Event {
  id: string;
  familyId: string;
  title: string;
  date: Timestamp;
  createdBy: string;
  category: 'medical' | 'school' | 'celebration' | 'general';
}

export interface ShoppingItem {
  id: string;
  familyId: string;
  name: string;
  isBought: boolean;
  addedBy: string;
  quantity: number;
  createdAt: Timestamp;
}

export interface Task {
  id: string;
  familyId: string;
  title: string;
  assignedTo: string;
  status: 'todo' | 'in_progress' | 'done';
  points: number;
  dueDate: Timestamp;
  isRecurring: boolean;
  completedAt?: Timestamp | null;
}

export interface Transaction {
  id: string;
  familyId: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: Timestamp;
  description?: string;
  addedBy: string;
}

export interface BudgetLimit {
  id: string;
  familyId: string;
  category: string;
  monthlyLimit: number;
}

export interface Recipe {
  id: string;
  familyId: string;
  title: string;
  ingredients: string[];
  instructions: string;
  source: 'AI_Generated' | 'User_Added';
  tags: string[];
  createdAt: Timestamp;
}

export interface Schedule {
  id: string;
  familyId: string;
  userId: string;
  activityType: string;
  startTime: Timestamp;
  endTime: Timestamp;
  repeat: 'daily' | 'weekly' | 'none';
  isApproved: boolean;
}

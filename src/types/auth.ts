// ============================================================
// NASA Jr_AstroCamp — Authentication & User Role Types
// Supports Student Cadet, Classroom Teacher, and NASA Judge
// ============================================================

export type UserRole = 'cadet' | 'teacher' | 'judge';

export interface User {
  id: string;
  username: string;
  password: string; // Stored in client-side secure store
  role: UserRole;
  email?: string; // Required for teachers/judges, optional for cadets
  fullName?: string;
  schoolOrOrg?: string; // School, educational institute, or NASA panel
  judgeSpecialty?: string; // e.g., 'Aerospace Engineering & EdTech'
  avatar: string;
  cadetRank: string; // e.g., 'Flight Candidate', 'Classroom Flight Commander', 'NASA Lead Evaluator'
  coins: number; // In-game currency / XP earned from missions
  selectedCharacterId?: string;
  unlockedCharacterIds?: string[];
  completedMissions?: string[];
  purchasedEquipments?: string[];
  createdAt: string;
}

export interface RegisterPayload {
  username: string;
  password: string;
  role: UserRole;
  email?: string;
  fullName?: string;
  schoolOrOrg?: string;
  judgeSpecialty?: string;
  avatar?: string;
}

export interface LoginPayload {
  identifier: string; // Username or Email
  password: string;
  expectedRole?: UserRole;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
}

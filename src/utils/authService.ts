// ============================================================
// NASA Jr_AstroCamp — Authentication Service
// Manages Cadet & Teacher Auth, Dataset Persistence, Coins & Astronaut Characters
// ============================================================

import type { User, RegisterPayload, LoginPayload, AuthResponse } from '../types/auth';

const STORAGE_KEY_CURRENT_USER = 'astro_camp_auth_current_user';
const STORAGE_KEY_USERS = 'astro_camp_registered_users';

// Seed default verified cadet students and educators matching classroom gradebook
const DEFAULT_USERS: User[] = [
  {
    id: 'cadet-01-artemis',
    username: 'CadetArtemis',
    password: 'space2026',
    role: 'cadet',
    avatar: '👨‍🚀',
    cadetRank: 'Flight Candidate',
    fullName: 'Artemis Junior',
    coins: 1420,
    selectedCharacterId: 'neil_armstrong',
    unlockedCharacterIds: ['neil_armstrong', 'kalpana_chawla'],
    completedMissions: ['nasa-artemis-3', 'apollo-11', 'mars-edl-2020'],
    purchasedEquipments: ['moxie-o2-gen', 'solar-array-flex'],
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'cadet-02-leo',
    username: 'LeoVance',
    password: 'space2026',
    role: 'cadet',
    avatar: '🚀',
    cadetRank: 'Rover Pilot',
    fullName: 'Leo Vance',
    coins: 1150,
    selectedCharacterId: 'buzz_aldrin',
    unlockedCharacterIds: ['neil_armstrong', 'buzz_aldrin'],
    completedMissions: ['apollo-11', 'curiosity-gale-crater'],
    purchasedEquipments: ['rover-nav-sensor'],
    createdAt: '2026-09-02T09:15:00.000Z',
  },
  {
    id: 'cadet-03-maya',
    username: 'MayaLin',
    password: 'space2026',
    role: 'cadet',
    avatar: '👩‍🚀',
    cadetRank: 'Flight Engineer',
    fullName: 'Maya Lin',
    coins: 980,
    selectedCharacterId: 'kalpana_chawla',
    unlockedCharacterIds: ['kalpana_chawla', 'sunita_williams'],
    completedMissions: ['earth-orbital-exam-100', 'iss-eclss-loop'],
    purchasedEquipments: ['water-recycler-membrane'],
    createdAt: '2026-09-03T10:30:00.000Z',
  },
  {
    id: 'cadet-04-zayn',
    username: 'ZaynTariq',
    password: 'space2026',
    role: 'cadet',
    avatar: '🪐',
    cadetRank: 'Cadet Trainee',
    fullName: 'Zayn Tariq',
    coins: 780,
    selectedCharacterId: 'yuri_gagarin',
    unlockedCharacterIds: ['neil_armstrong', 'yuri_gagarin'],
    completedMissions: ['shackleton-sol-1-base'],
    purchasedEquipments: ['cryo-ice-drill'],
    createdAt: '2026-09-05T11:45:00.000Z',
  },
  {
    id: 'cadet-05-nova',
    username: 'NovaChen',
    password: 'space2026',
    role: 'cadet',
    avatar: '🌟',
    cadetRank: 'Junior Stargazer',
    fullName: 'Nova Chen',
    coins: 640,
    selectedCharacterId: 'kalpana_chawla',
    unlockedCharacterIds: ['kalpana_chawla'],
    completedMissions: ['artemis-1-uncrewed'],
    purchasedEquipments: [],
    createdAt: '2026-09-08T14:20:00.000Z',
  },
  {
    id: 'cadet-06-tara',
    username: 'TaraSharma',
    password: 'space2026',
    role: 'cadet',
    avatar: '🛰️',
    cadetRank: 'Junior Stargazer',
    fullName: 'Tara Sharma',
    coins: 575,
    selectedCharacterId: 'sunita_williams',
    unlockedCharacterIds: ['neil_armstrong', 'sunita_williams'],
    completedMissions: ['ground-school-astronomy-101'],
    purchasedEquipments: [],
    createdAt: '2026-09-10T16:00:00.000Z',
  },
  {
    id: 'user-teacher-demo',
    username: 'TeacherSarah',
    email: 'sarah.stem@school.edu',
    password: 'teacher2026',
    role: 'teacher',
    fullName: 'Prof. Sarah Jenkins',
    schoolOrOrg: 'NASA STEM Academy / Central High',
    avatar: '👩‍🏫',
    cadetRank: 'Classroom Flight Commander',
    coins: 9999,
    selectedCharacterId: 'peggy_whitson',
    unlockedCharacterIds: ['neil_armstrong', 'kalpana_chawla', 'peggy_whitson', 'chris_hadfield'],
    completedMissions: ['teacher-master-curriculum'],
    purchasedEquipments: ['deep-space-transceiver', 'kilopower-reactor'],
    createdAt: '2026-08-15T08:00:00.000Z',
  },
  {
    id: 'user-teacher-cooper',
    username: 'DrCooper',
    email: 'cooper.space@school.edu',
    password: 'teacher2026',
    role: 'teacher',
    fullName: 'Dr. Joseph Cooper',
    schoolOrOrg: 'International Space Education Directorate',
    avatar: '👨‍🏫',
    cadetRank: 'Master Aerospace Director',
    coins: 9999,
    selectedCharacterId: 'victor_glover',
    unlockedCharacterIds: ['neil_armstrong', 'victor_glover', 'peggy_whitson'],
    completedMissions: ['orbital-mechanics-accreditation'],
    purchasedEquipments: ['orion-capsule-simulator'],
    createdAt: '2026-08-20T08:00:00.000Z',
  },
  {
    id: 'user-judge-nasa-01',
    username: 'NasaJudge2026',
    email: 'judge@spaceapps.nasa.gov',
    password: 'judge2026',
    role: 'judge',
    fullName: 'Dr. Elena Rostova (NASA Judge)',
    schoolOrOrg: 'NASA International Space Apps Challenge 2026 Panel',
    judgeSpecialty: 'Aerospace Systems & STEM Pedagogy',
    avatar: '⚖️',
    cadetRank: 'NASA Lead Evaluator',
    coins: 25000,
    selectedCharacterId: 'neil_armstrong',
    unlockedCharacterIds: ['neil_armstrong', 'kalpana_chawla', 'peggy_whitson', 'victor_glover', 'chris_hadfield', 'sunita_williams'],
    completedMissions: ['nasa-artemis-3', 'apollo-11', 'mars-edl-2020', 'shackleton-sol-1-base'],
    purchasedEquipments: ['kilopower-reactor', 'moxie-o2-gen', 'orion-capsule-simulator'],
    createdAt: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 'user-judge-nasa-02',
    username: 'DrGoddardEval',
    email: 'goddard.eval@nasa.gov',
    password: 'judge2026',
    role: 'judge',
    fullName: 'Cmdr. Marcus Vance (JPL Reviewer)',
    schoolOrOrg: 'NASA Jet Propulsion Laboratory / Goddard',
    judgeSpecialty: 'Orbital Mechanics & Flight Simulation',
    avatar: '🏆',
    cadetRank: 'Senior Flight Systems Judge',
    coins: 25000,
    selectedCharacterId: 'victor_glover',
    unlockedCharacterIds: ['neil_armstrong', 'kalpana_chawla', 'victor_glover'],
    completedMissions: ['apollo-11', 'mars-edl-2020'],
    purchasedEquipments: ['kilopower-reactor'],
    createdAt: '2026-10-02T09:00:00.000Z',
  },
];

export const authService = {
  // Get all registered users from local storage
  getUsers(): User[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_USERS);
      if (!stored) {
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(DEFAULT_USERS));
        return DEFAULT_USERS;
      }
      const parsed: User[] = JSON.parse(stored);
      // Ensure defaults exist if user wiped or has old schema
      let updated = false;
      DEFAULT_USERS.forEach((def) => {
        if (!parsed.some((u) => u.username.toLowerCase() === def.username.toLowerCase())) {
          parsed.push(def);
          updated = true;
        }
      });
      if (updated) {
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(parsed));
      }
      return parsed;
    } catch {
      return DEFAULT_USERS;
    }
  },

  // Save users array to local storage
  saveUsers(users: User[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    } catch (e) {
      console.warn('Failed to save users to localStorage', e);
    }
  },

  // Get currently logged in user
  getCurrentUser(): User | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
      if (!stored) {
        // Return null so user sees the login gateway option upon entering
        return null;
      }
      return JSON.parse(stored);
    } catch {
      return null;
    }
  },

  // Set currently logged in user
  setCurrentUser(user: User | null): void {
    try {
      if (user) {
        localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(user));
        // Also sync back to users array
        const users = this.getUsers();
        const idx = users.findIndex((u) => u.id === user.id || u.username.toLowerCase() === user.username.toLowerCase());
        if (idx !== -1) {
          users[idx] = { ...users[idx], ...user };
          this.saveUsers(users);
        }
      } else {
        localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
      }
    } catch (e) {
      console.warn('Failed to update current user', e);
    }
  },

  // Register a new user
  register(payload: RegisterPayload): AuthResponse {
    const { username, password, role, email, fullName, schoolOrOrg, judgeSpecialty, avatar } = payload;

    const trimmedUsername = (username || '').trim();
    if (trimmedUsername.length < 3) {
      return { success: false, error: 'Username must be at least 3 characters long.' };
    }

    if (!password || password.length < 4) {
      return { success: false, error: 'Password must be at least 4 characters long.' };
    }

    let trimmedEmail: string | undefined = (email || '').trim().toLowerCase() || undefined;
    if (role === 'teacher' || role === 'judge') {
      if (!trimmedEmail) {
        return {
          success: false,
          error: `${role === 'judge' ? 'Judges' : 'Teachers'} must provide a valid email address.`
        };
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        return {
          success: false,
          error: 'Please enter a valid email address format.'
        };
      }
    }

    const users = this.getUsers();
    const usernameTaken = users.some(
      (u) => u.username.toLowerCase() === trimmedUsername.toLowerCase()
    );
    if (usernameTaken) {
      return {
        success: false,
        error: `Username "${trimmedUsername}" is already taken. Please choose another.`
      };
    }

    if ((role === 'teacher' || role === 'judge') && trimmedEmail) {
      const emailTaken = users.some(
        (u) => u.email && u.email.toLowerCase() === trimmedEmail!.toLowerCase()
      );
      if (emailTaken) {
        return {
          success: false,
          error: `Email "${trimmedEmail}" is already registered. Please login instead.`
        };
      }
    }

    const defaultRank =
      role === 'judge'
        ? 'NASA Lead Evaluator'
        : role === 'teacher'
        ? 'Classroom Flight Commander'
        : 'Junior Stargazer';

    const defaultAvatar =
      role === 'judge' ? '⚖️' : role === 'teacher' ? '👩‍🏫' : '👨‍🚀';

    const newUser: User = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      username: trimmedUsername,
      password: password,
      role: role,
      email: trimmedEmail,
      fullName:
        fullName?.trim() ||
        (role === 'judge' ? 'NASA Evaluator' : role === 'teacher' ? 'Flight Instructor' : trimmedUsername),
      schoolOrOrg:
        schoolOrOrg?.trim() ||
        (role === 'judge' ? 'NASA Space Apps 2026 Panel' : role === 'teacher' ? 'STEM Academy' : 'Junior Space Corps'),
      judgeSpecialty: judgeSpecialty?.trim(),
      avatar: avatar || defaultAvatar,
      cadetRank: defaultRank,
      coins: role === 'judge' ? 25000 : role === 'teacher' ? 9999 : 500,
      selectedCharacterId: 'neil_armstrong',
      unlockedCharacterIds: ['neil_armstrong', 'kalpana_chawla'],
      completedMissions: role === 'judge' ? ['nasa-artemis-3', 'apollo-11', 'mars-edl-2020'] : [],
      purchasedEquipments: [],
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    this.saveUsers(users);
    this.setCurrentUser(newUser);

    return { success: true, user: newUser };
  },

  // 1-Click Instant Demo Login for Student, Teacher, or Judge
  quickDemoLogin(role: 'cadet' | 'teacher' | 'judge'): User {
    const users = this.getUsers();
    const targetUsername =
      role === 'judge'
        ? 'NasaJudge2026'
        : role === 'teacher'
        ? 'TeacherSarah'
        : 'CadetArtemis';
    const found =
      users.find((u) => u.username.toLowerCase() === targetUsername.toLowerCase()) ||
      users.find((u) => u.role === role) ||
      DEFAULT_USERS[0];
    this.setCurrentUser(found);
    return found;
  },

  // Login with Username (or Email for teachers) + Password
  login(payload: LoginPayload): AuthResponse {
    const { identifier, password } = payload;
    const cleanId = (identifier || '').trim().toLowerCase();
    const cleanPass = password || '';

    if (!cleanId || !cleanPass) {
      return { success: false, error: 'Please enter your username (or email) and password.' };
    }

    const users = this.getUsers();
    const matchedUser = users.find((u) => {
      const matchesUsername = u.username.toLowerCase() === cleanId;
      const matchesEmail = u.email ? u.email.toLowerCase() === cleanId : false;
      return matchesUsername || matchesEmail;
    });

    if (!matchedUser) {
      return {
        success: false,
        error: 'No astronaut account found matching those credentials. Please check your spelling or register.'
      };
    }

    if (matchedUser.password !== cleanPass) {
      return {
        success: false,
        error: 'Incorrect security password. Please try again.'
      };
    }

    this.setCurrentUser(matchedUser);
    return { success: true, user: matchedUser };
  },

  // Logout
  logout(): void {
    this.setCurrentUser(null);
  },

  // Unlock an Astronaut Character with Coins
  unlockCharacter(userId: string, characterId: string, costCoins: number): { success: boolean; error?: string; user?: User } {
    const users = this.getUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) return { success: false, error: 'Cadet profile not found.' };

    const unlocked = user.unlockedCharacterIds || ['neil_armstrong', 'kalpana_chawla'];
    if (unlocked.includes(characterId)) {
      return { success: false, error: 'Character is already unlocked!' };
    }

    if (user.coins < costCoins) {
      return { success: false, error: `Insufficient Coins! You need ${costCoins - user.coins} more Coins.` };
    }

    user.coins -= costCoins;
    user.unlockedCharacterIds = [...unlocked, characterId];
    user.selectedCharacterId = characterId;

    this.saveUsers(users);
    this.setCurrentUser(user);
    return { success: true, user };
  },

  // Select / Equip an unlocked character
  selectCharacter(userId: string, characterId: string, avatarEmoji: string): { success: boolean; user?: User } {
    const users = this.getUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) return { success: false };

    user.selectedCharacterId = characterId;
    user.avatar = avatarEmoji;

    this.saveUsers(users);
    this.setCurrentUser(user);
    return { success: true, user };
  },

  // Add Coins earned from mission / exam
  awardCoins(userId: string, amount: number): User | null {
    const users = this.getUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) return null;

    user.coins = (user.coins || 0) + amount;
    this.saveUsers(users);
    this.setCurrentUser(user);
    return user;
  },

  // Record completed mission
  recordMissionComplete(userId: string, missionId: string, earnedCoins = 150): User | null {
    const users = this.getUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) return null;

    const missions = user.completedMissions || [];
    if (!missions.includes(missionId)) {
      user.completedMissions = [...missions, missionId];
    }
    user.coins = (user.coins || 0) + earnedCoins;
    this.saveUsers(users);
    this.setCurrentUser(user);
    return user;
  },

  // Record purchased equipment
  recordEquipmentPurchase(userId: string, equipmentId: string, costCoins: number): { success: boolean; error?: string; user?: User } {
    const users = this.getUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) return { success: false, error: 'User not found' };

    if (user.coins < costCoins) {
      return { success: false, error: `Insufficient Coins! Need ${costCoins - user.coins} more Coins.` };
    }

    user.coins -= costCoins;
    const items = user.purchasedEquipments || [];
    if (!items.includes(equipmentId)) {
      user.purchasedEquipments = [...items, equipmentId];
    }
    this.saveUsers(users);
    this.setCurrentUser(user);
    return { success: true, user };
  },
};

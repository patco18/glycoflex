import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_STORAGE_KEY = 'internal_auth_session';
const API_BASE_URL = process.env.EXPO_PUBLIC_SYNC_API_URL;
const SESSION_DURATION_DAYS = 30;

export interface InternalUser {
  id: string;
  email: string;
  createdAt?: string | null;
  lastSignInAt?: string | null;
  uid: string;
}

type StoredUser = Omit<InternalUser, 'uid'>;

interface AuthSessionPayload {
  user: StoredUser;
  token: string;
  expiresAt?: string | null;
}

interface AuthState {
  user: StoredUser;
  token: string;
  expiresAt?: string | null;
}

let currentUser: InternalUser | null = null;
let currentToken: string | null = null;
let currentExpiresAt: string | null = null;
let initialized = false;
let initializing: Promise<void> | null = null;
const listeners = new Set<(user: InternalUser | null) => void>();

const ensureApiUrl = () => {
  if (!API_BASE_URL) {
    throw new Error('Missing EXPO_PUBLIC_SYNC_API_URL for internal auth');
  }
};

const notify = () => {
  listeners.forEach((listener) => listener(currentUser));
};

const persistState = async (state: AuthState | null) => {
  if (state) {
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
  } else {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  }
};

const setSession = async (payload: AuthSessionPayload | null) => {
  if (!payload) {
    currentUser = null;
    currentToken = null;
    currentExpiresAt = null;
    await persistState(null);
    notify();
    return;
  }

  currentUser = { ...payload.user, uid: payload.user.id };
  currentToken = payload.token;
  currentExpiresAt = payload.expiresAt ?? null;
  await persistState({
    user: payload.user,
    token: payload.token,
    expiresAt: payload.expiresAt ?? null,
  });
  notify();
};

const loadFromStorage = async () => {
  if (initialized) return;
  if (!initializing) {
    initializing = (async () => {
      const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as AuthState;
          currentUser = parsed.user ? { ...parsed.user, uid: parsed.user.id } : null;
          currentToken = parsed.token;
          currentExpiresAt = parsed.expiresAt ?? null;
        } catch (error) {
          console.warn('Impossible de charger la session interne:', error);
          await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
        }
      }
      initialized = true;
    })();
  }

  await initializing;
};

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  ensureApiUrl();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Auth request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
};

export const auth = {
  get currentUser() {
    return currentUser ? { ...currentUser, uid: currentUser.id } : null;
  },
  get token() {
    return currentToken;
  },
  get expiresAt() {
    return currentExpiresAt;
  },
  get sessionDurationDays() {
    return SESSION_DURATION_DAYS;
  },
  async initialize() {
    await loadFromStorage();
  },
  onAuthStateChanged(callback: (user: InternalUser | null) => void) {
    let active = true;
    loadFromStorage().then(() => {
      if (active) {
        callback(currentUser);
      }
    });

    listeners.add(callback);
    return () => {
      active = false;
      listeners.delete(callback);
    };
  },
  async register(email: string, password: string) {
    const payload = await request<AuthSessionPayload>('/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await setSession(payload);
    return currentUser;
  },
  async login(email: string, password: string) {
    const payload = await request<AuthSessionPayload>('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await setSession(payload);
    return currentUser;
  },
  async logout() {
    const token = currentToken;
    await setSession(null);
    if (!token) return;
    try {
      await request<void>('/v1/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.warn('Erreur lors de la déconnexion serveur:', error);
    }
  },
  async requestPasswordReset(email: string) {
    await request<void>('/v1/auth/password-reset', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },
  async deleteAccount() {
    if (!currentToken) {
      throw new Error('Utilisateur non connecté');
    }
    await request<void>('/v1/auth/account', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${currentToken}`,
      },
    });
    await setSession(null);
  },
  async getAuthHeader() {
    if (!currentToken) {
      throw new Error('Utilisateur non connecté');
    }
    return { Authorization: `Bearer ${currentToken}` };
  },
};

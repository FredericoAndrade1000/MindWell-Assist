// store.js - Teste com API, sem persist
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios'; // << ADICIONADO DE VOLTA

console.log("Loading store.js - Teste com API, sem persist");

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

// Helper to check JWT expiration (ADICIONADO DE VOLTA)
const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const expiry = (JSON.parse(atob(token.split('.')[1]))).exp;
    return (Math.floor((new Date).getTime() / 1000)) >= expiry;
  } catch (e) {
    console.error("Error parsing token expiration:", e); // Log error here
    return true; // Invalid token format or other error
  }
};

// Modifique 'create' para NÃO usar 'persist'
export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Action to initialize state (LÓGICA DE VOLTA)
      initAuth: async () => {
        set({ isLoading: true }); // Indica que está carregando
        const token = get().token;

        if (token && !isTokenExpired(token)) {
          try {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            const response = await axios.get(`${API_BASE_URL}/auth/me`);
            set({ isAuthenticated: true, user: response.data, error: null, isLoading: false });
          } catch (error) {
            set({ token: null, user: null, isAuthenticated: false, error: 'Sessão expirada ou inválida.', isLoading: false });
            delete axios.defaults.headers.common['Authorization'];
          }
        } else {
          set({ token: null, user: null, isAuthenticated: false, error: token ? 'Sessão expirada.' : null, isLoading: false });
          delete axios.defaults.headers.common['Authorization'];
        }
      },

      // Action for logging in (LÓGICA DE VOLTA)
      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/login`, { email, password });
          const { token, user } = response.data;
          
          if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            set({ token, user, isAuthenticated: true, isLoading: false, error: null });
            return true;
          } else {
            throw new Error('Token não recebido do servidor');
          }
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Falha no login. Verifique suas credenciais.';
          set({ isLoading: false, error: errorMessage, token: null, user: null, isAuthenticated: false });
          delete axios.defaults.headers.common['Authorization'];
          return false;
        }
      },

      // Action for registering (LÓGICA DE VOLTA)
      register: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          await axios.post(`${API_BASE_URL}/auth/register`, { email, password });
          set({ isLoading: false, error: null });
          return true;
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Falha no registro. Tente novamente.';
          set({ isLoading: false, error: errorMessage });
          return false;
        }
      },

      // Action for logging out (LÓGICA DE VOLTA)
      logout: () => {
        delete axios.defaults.headers.common['Authorization'];
        set({ token: null, user: null, isAuthenticated: false, isLoading: false, error: null });
      },

      // Action to clear the error message manually (LÓGICA DE VOLTA)
      clearError: () => set({ error: null })
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
    }
  )
);

// Inicializa a autenticação quando o app carrega
if (typeof window !== 'undefined') {
  useAuthStore.getState().initAuth();
}

console.log("store.js (API logic only) processed");
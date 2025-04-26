// store.js - Teste com API, sem persist
import { create } from 'zustand';
// REMOVIDO: import { persist, createJSONStorage } from 'zustand/middleware'; // << NÃO adicione ainda
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
export const useAuthStore = create((set, get) => ({
    token: null,
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,

    // Action to initialize state (LÓGICA DE VOLTA)
    initAuth: async () => {
        set({ isLoading: true }); // Indica que está carregando
        // Tenta pegar o token inicial (não persistido agora, então será null)
        const initialToken = get().token;

        // --- LÓGICA IMPORTANTE: Rehidratação Manual do Token (já que persist está desativado) ---
        // Tenta ler o token diretamente do localStorage para este teste
        let rehydratedToken = null;
        try {
            const authStorage = localStorage.getItem('auth-storage');
            if (authStorage) {
                const parsedStorage = JSON.parse(authStorage);
                rehydratedToken = parsedStorage?.state?.token;
                if (rehydratedToken) {
                    set({ token: rehydratedToken }); // Atualiza o estado do store com o token
                    console.log("Manually rehydrated token from localStorage for initAuth test.");
                     // Configura o header do Axios imediatamente após reidratar
                     if (!isTokenExpired(rehydratedToken)) {
                        axios.defaults.headers.common['Authorization'] = `Bearer ${rehydratedToken}`;
                     } else {
                         delete axios.defaults.headers.common['Authorization'];
                     }
                }
            }
        } catch (e) {
            console.error("Failed to manually rehydrate token from localStorage:", e);
            rehydratedToken = null; // Garante que está null se falhar
            set({ token: null });
             delete axios.defaults.headers.common['Authorization'];
        }
        // -------------------------------------------------------------------------------


        const tokenToValidate = get().token; // Pega o token potencialmente reidratado

        if (tokenToValidate && !isTokenExpired(tokenToValidate)) {
          try {
             const response = await axios.get(`${API_BASE_URL}/auth/me`, {
               headers: { Authorization: `Bearer ${tokenToValidate}` } // Usa o token validado
             });
             set({ isAuthenticated: true, user: response.data, error: null, isLoading: false });
          } catch (error) {
             console.error("Token validation failed during initAuth:", error);
             set({ token: null, user: null, isAuthenticated: false, error: 'Sessão expirada ou inválida.', isLoading: false });
             delete axios.defaults.headers.common['Authorization']; // Limpa o header se a validação falhar
          }
        } else if (tokenToValidate) {
            set({ token: null, user: null, isAuthenticated: false, error: 'Sessão expirada.', isLoading: false });
            delete axios.defaults.headers.common['Authorization']; // Limpa o header se expirado
        } else {
            set({ isAuthenticated: false, user: null, error: null, isLoading: false });
             delete axios.defaults.headers.common['Authorization']; // Garante que está limpo se não houver token
        }
    },

    // Action for logging in (LÓGICA DE VOLTA)
    login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/login`, { email, password });
          const { token, user } = response.data;
          set({ token, user, isAuthenticated: true, isLoading: false, error: null });
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          return true;
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Login falhou. Verifique suas credenciais.';
          set({ isLoading: false, error: errorMessage, token: null, user: null, isAuthenticated: false });
          delete axios.defaults.headers.common['Authorization']; // Limpa header em falha de login
          console.error("Login error:", error);
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
            const errorMessage = error.response?.data?.message || 'Falha no registro.';
            set({ isLoading: false, error: errorMessage });
            console.error("Registration error:", error);
            return false;
        }
    },

    // Action for logging out (LÓGICA DE VOLTA)
    logout: () => {
        set({ token: null, user: null, isAuthenticated: false, isLoading: false, error: null });
        delete axios.defaults.headers.common['Authorization'];
         // Limpa manualmente o localStorage simulando o que o persist faria
         try {
             localStorage.removeItem('auth-storage');
             console.log("Manually cleared auth-storage on logout.");
         } catch(e) {
             console.error("Failed to clear auth-storage on logout:", e);
         }
    },

    // Action to clear the error message manually (LÓGICA DE VOLTA)
    clearError: () => {
        set({ error: null });
    }

}));

console.log("store.js (API logic only) processed");
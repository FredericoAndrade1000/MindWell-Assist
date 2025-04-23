import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

// Helper to check JWT expiration
const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const expiry = (JSON.parse(atob(token.split('.')[1]))).exp;
    return (Math.floor((new Date).getTime() / 1000)) >= expiry;
  } catch (e) {
    return true; // Invalid token format
  }
};

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null, // { id, email, role }
      isAuthenticated: false,
      isLoading: false, // To track login/register loading state
      error: null, // To store login/register errors

      // Action to initialize state, potentially validate token
      initAuth: async () => {
        const token = get().token;
        if (token && !isTokenExpired(token)) {
          try {
            // Optional: Validate token with backend on initial load
             const response = await axios.get(`${API_BASE_URL}/auth/me`, {
               headers: { Authorization: `Bearer ${token}` }
             });
             set({ isAuthenticated: true, user: response.data, error: null });
          } catch (error) {
             console.error("Token validation failed:", error);
             set({ token: null, user: null, isAuthenticated: false, error: 'Session expired or invalid.' });
          }
        } else if (token) {
            // Token exists but is expired
            set({ token: null, user: null, isAuthenticated: false, error: 'Session expired.' });
        } else {
            set({ isAuthenticated: false, user: null, error: null });
        }
      },

      // Action for logging in
      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/login`, { email, password });
          const { token, user } = response.data;
          set({ token, user, isAuthenticated: true, isLoading: false, error: null });
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`; // Set default header for subsequent requests
          return true; // Indicate success
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Login failed. Please check your credentials.';
          set({ isLoading: false, error: errorMessage, token: null, user: null, isAuthenticated: false });
          console.error("Login error:", error);
          return false; // Indicate failure
        }
      },

      // Action for registering
      register: async (email, password) => {
          set({ isLoading: true, error: null });
          try {
              await axios.post(`${API_BASE_URL}/auth/register`, { email, password });
              // Optionally log in the user directly after registration
              // await get().login(email, password); // Uncomment to auto-login
              set({ isLoading: false, error: null });
               return true; // Indicate success
          } catch (error) {
              const errorMessage = error.response?.data?.message || 'Registration failed.';
              set({ isLoading: false, error: errorMessage });
              console.error("Registration error:", error);
              return false; // Indicate failure
          }
      },

      // Action for logging out
      logout: () => {
        set({ token: null, user: null, isAuthenticated: false, isLoading: false, error: null });
        delete axios.defaults.headers.common['Authorization']; // Remove default header
        // Optionally call a backend logout endpoint if needed (e.g., to invalidate refresh tokens)
      },
    }),
    {
      name: 'auth-storage', // name of the item in storage (must be unique)
      storage: createJSONStorage(() => localStorage), // use localStorage
      partialize: (state) => ({ token: state.token }), // only persist the token
      onRehydrateStorage: (state) => {
        // Optional: Can run logic upon rehydration
        console.log("Auth state rehydrated");
        // Set Axios default header if token exists after rehydration
        if (state?.token && !isTokenExpired(state.token)) {
           axios.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
        }
      }
    }
  )
)

// Custom Hook for Protected Routes
export const useAuthGuard = (allowedRoles = []) => {
    const { isAuthenticated, user } = useAuthStore();
    const navigate = ReactRouterDOM.useNavigate(); // Needs React Router context

    React.useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login', { replace: true });
            return;
        }
        if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
             navigate('/', { replace: true }); // Or a specific 'unauthorized' page
             return;
        }
    }, [isAuthenticated, user, allowedRoles, navigate]);

    // Return auth state for conditional rendering within the component
    return { isAuthenticated, user };
};

// Make sure React Router DOM is imported where useAuthGuard is used
// import * as ReactRouterDOM from 'react-router-dom';

#!/bin/bash

echo "Starting Project Setup..."

# Create project structure
echo "Creating directory structure..."
mkdir -p web api .github/workflows

# === Root Files ===
echo "Creating root files..."

# root/package.json
cat << 'EOF' > package.json
{
  "name": "mental-health-platform",
  "version": "1.0.0",
  "private": true,
  "description": "Mental health assessment and assistance platform",
  "workspaces": [
    "web",
    "api"
  ],
  "scripts": {
    "dev": "concurrently \"npm run dev -w web\" \"npm run dev -w api\"",
    "build": "npm run build -w web && npm run build -w api",
    "test": "npm run test -w web && npm run test -w api",
    "lint": "npm run lint -w web && npm run lint -w api",
    "install:all": "npm install && npm install -w web && npm install -w api"
  },
  "devDependencies": {
    "concurrently": "^8.2.2",
    "eslint": "^8.57.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
EOF

# root/.env (Initial Placeholder)
cat << 'EOF' > .env
# --- API Configuration ---
PORT=4000
DATABASE_URL=./api/database.sqlite
JWT_SECRET=YOUR_STRONG_JWT_SECRET_CHANGE_ME # Replace with a long, random, secure string
ENCRYPTION_KEY=YOUR_STRONG_ENCRYPTION_KEY_32BYTES # Replace with a secure 32-byte (64 hex chars) key
OPENAI_API_KEY=YOUR_OPENAI_API_KEY_CHANGE_ME # Replace with your OpenAI API Key

# --- Web Configuration (via Vite) ---
# Note: Prefix with VITE_ to be exposed to the frontend build
VITE_API_BASE_URL=http://localhost:4000
EOF

# === Web Files ===
echo "Creating web/ files..."

# web/package.json
cat << 'EOF' > web/package.json
{
  "name": "web",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "lint": "eslint . --ext js,jsx --report-unused-disable-directives --max-warnings 0"
  },
  "dependencies": {
    "@fortawesome/fontawesome-svg-core": "^6.5.2",
    "@fortawesome/free-solid-svg-icons": "^6.5.2",
    "@fortawesome/react-fontawesome": "^0.2.2",
    "@headlessui/react": "^2.1.2",
    "@hookform/resolvers": "^3.9.0",
    "@tanstack/react-query": "^5.51.1",
    "axios": "^1.7.2",
    "fuse.js": "^7.0.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-gauge-chart": "^0.5.1",
    "react-hook-form": "^7.52.1",
    "react-router-dom": "^6.25.1",
    "yup": "^1.4.0",
    "zustand": "^4.5.4"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.8",
    "@testing-library/react": "^16.0.0",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.19",
    "eslint": "^8.57.0",
    "eslint-plugin-react": "^7.34.4",
    "eslint-plugin-react-hooks": "^4.6.2",
    "eslint-plugin-react-refresh": "^0.4.7",
    "jsdom": "^24.1.1",
    "postcss": "^8.4.39",
    "tailwindcss": "^3.4.6",
    "vite": "^5.3.4",
    "vite-plugin-pwa": "^0.20.0",
    "vitest": "^2.0.4"
  }
}
EOF

# web/vite.config.js
cat << 'EOF' > web/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'MindWell Assist',
        short_name: 'MindWell',
        description: 'Mental health self-assessment and resource platform.',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png', // Create these icons later
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png', // Create these icons later
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png', // Maskable icon
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,woff}'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'document',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 // 1 day
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/autoavaliacao') || url.pathname.startsWith('/recursos'),
            handler: 'NetworkFirst', // Try network first, fallback to cache for core offline functionality
            options: {
              cacheName: 'app-core-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: ({ request, url }) => request.destination === 'image' || request.destination === 'font',
            handler: 'CacheFirst',
            options: {
              cacheName: 'assets-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Runtime caching for API calls (optional, might need adjustment)
            // Example: Cache GET requests to /api/resources if needed offline
            urlPattern: ({ url }) => url.origin === self.location.origin && url.pathname.startsWith('/api/resources'), // Adjust if API is elsewhere
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10, // If network fails within 10s, use cache
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 // 1 day
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true // Enable PWA in dev mode for testing
      }
    })
  ],
  server: {
    port: 5173,
    strictPort: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js', // Optional setup file for tests
  },
})
EOF

# web/tailwind.config.js
cat << 'EOF' > web/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}", // If you use a src directory
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#67e8f9', // cyan-300
          DEFAULT: '#06b6d4', // cyan-500
          dark: '#0e7490', // cyan-700
        },
        secondary: {
          light: '#fde047', // yellow-300
          DEFAULT: '#facc15', // yellow-500
          dark: '#ca8a04', // yellow-700
        },
        danger: {
          light: '#fca5a5', // red-300
          DEFAULT: '#ef4444', // red-500
          dark: '#b91c1c', // red-700
        },
        neutral: {
          light: '#f3f4f6', // gray-100
          DEFAULT: '#6b7280', // gray-500
          dark: '#1f2937', // gray-800
        }
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
EOF

# web/postcss.config.js
cat << 'EOF' > web/postcss.config.js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF

# web/index.html
cat << 'EOF' > web/index.html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" /> <!-- Replace with your favicon -->
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#ffffff">
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180"> <!-- Create this -->
    <link rel="mask-icon" href="/mask-icon.svg" color="#06b6d4"> <!-- Create this -->
    <title>MindWell Assist</title>
    <!-- Add manifest link - vite-plugin-pwa handles this automatically -->
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/main.jsx"></script>
  </body>
</html>
EOF

# web/index.css
cat << 'EOF' > web/index.css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-neutral-light text-neutral-dark font-sans antialiased;
}

/* Add any global custom styles here */
.gauge-container svg {
    max-width: 100%;
    height: auto;
}
EOF

# web/main.jsx
cat << 'EOF' > web/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Pages from './pages.jsx'
import './index.css' // Ensure Tailwind is loaded
import { useAuthStore } from './store.js' // Import Zustand store

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false, // Optional: disable refetch on window focus
    },
  },
})

// Initialize Zustand store (loads persisted state)
useAuthStore.getState().initAuth()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Pages />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)

// Basic PWA registration logic (vite-plugin-pwa handles most of this)
// You might add custom update prompts here if needed.
// import { registerSW } from 'virtual:pwa-register';
// const updateSW = registerSW({
//   onNeedRefresh() {
//     if (confirm("New content available, reload?")) {
//       updateSW(true);
//     }
//   },
//   onOfflineReady() {
//     console.log('App is ready to work offline');
//   },
// });

EOF

# web/store.js
cat << 'EOF' > web/store.js
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
EOF

# web/ui.jsx
cat << 'EOF' > web/ui.jsx
import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import GaugeChart from 'react-gauge-chart'; // Using react-gauge-chart for simplicity

// --- Button ---
export const Button = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  loading = false,
  className = '',
  ...props
}) => {
  const baseStyle = 'inline-flex items-center justify-center rounded-md font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 transition ease-in-out duration-150';
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };
  const variantStyles = {
    primary: 'bg-primary text-white hover:bg-primary-dark focus:ring-primary',
    secondary: 'bg-secondary text-neutral-dark hover:bg-secondary-dark focus:ring-secondary',
    danger: 'bg-danger text-white hover:bg-danger-dark focus:ring-danger',
    outline: 'bg-white text-primary border border-primary hover:bg-primary/10 focus:ring-primary',
    ghost: 'bg-transparent text-primary hover:bg-primary/10 focus:ring-primary',
  };
  const disabledStyle = 'opacity-50 cursor-not-allowed';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyle} ${sizeStyles[size]} ${variantStyles[variant]} ${ (disabled || loading) ? disabledStyle : ''} ${className}`}
      {...props}
    >
      {loading && <Spinner size="sm" className="mr-2" />}
      {children}
    </button>
  );
};

// --- Modal ---
export const Modal = ({ isOpen, onClose, title, children }) => {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                {title && (
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 mb-4"
                  >
                    {title}
                  </Dialog.Title>
                )}
                {children}
                 <div className="mt-4 text-right">
                  <Button variant="outline" onClick={onClose}>
                    Close
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

// --- Gauge ---
// Using react-gauge-chart. Ensure it's installed: npm install react-gauge-chart
export const Gauge = ({ value, maxValue, label, id }) => {
  const percentage = value / maxValue;
  const colorRanges = [
    { limit: 0.2, color: '#5BE12C' }, // Green
    { limit: 0.4, color: '#F5CD19' }, // Yellow
    { limit: 0.6, color: '#F5CD19' }, // Yellow
    { limit: 0.8, color: '#FF7C0A' }, // Orange
    { limit: 1.0, color: '#FF0000' }, // Red
  ];

  const colors = colorRanges.map(range => range.color);
  const arcLimits = colorRanges.map(range => range.limit);


  return (
    <div className="text-center gauge-container">
       <GaugeChart
            id={`gauge-chart-${id}`}
            nrOfLevels={20} // Controls smoothness
            arcsLength={arcLimits}
            colors={colors}
            percent={percentage}
            arcPadding={0.02}
            textColor="#374151" // gray-700
            needleColor="#d1d5db" // gray-300
            needleBaseColor="#374151" // gray-700
            hideText={false}
            style={{ width: '80%', margin: '0 auto' }} // Adjust width as needed
        />
      <p className="mt-2 text-sm font-medium text-neutral-DEFAULT">{label}: {value}/{maxValue}</p>
    </div>
  );
};


// --- Input Fields (Basic example, integrate with React Hook Form) ---
export const Input = React.forwardRef(({ label, name, type = 'text', error, className = '', ...props }, ref) => (
  <div className="mb-4">
    {label && <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <input
      id={name}
      name={name}
      type={type}
      ref={ref}
      className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm ${error ? 'border-danger' : ''} ${className}`}
      {...props}
    />
    {error && <p className="mt-1 text-sm text-danger">{error}</p>}
  </div>
));

export const Textarea = React.forwardRef(({ label, name, rows = 3, error, className = '', ...props }, ref) => (
 <div className="mb-4">
    {label && <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <textarea
      id={name}
      name={name}
      rows={rows}
      ref={ref}
      className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm ${error ? 'border-danger' : ''} ${className}`}
      {...props}
     />
     {error && <p className="mt-1 text-sm text-danger">{error}</p>}
  </div>
));

// Select needs more complex integration for RHF, basic structure:
export const Select = React.forwardRef(({ label, name, error, children, className = '', ...props }, ref) => (
 <div className="mb-4">
    {label && <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <select
        id={name}
        name={name}
        ref={ref}
        className={`block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-primary focus:outline-none focus:ring-primary sm:text-sm ${error ? 'border-danger' : ''} ${className}`}
        {...props}
    >
        {children}
    </select>
    {error && <p className="mt-1 text-sm text-danger">{error}</p>}
 </div>
));


// --- Card ---
export const Card = ({ children, className = '' }) => {
  return (
    <div className={`bg-white shadow-md rounded-lg overflow-hidden ${className}`}>
      <div className="p-4 md:p-6">
        {children}
      </div>
    </div>
  );
};

// --- Spinner ---
export const Spinner = ({ size = 'md', color = 'primary', className = '' }) => {
  const sizeStyles = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };
  const colorStyles = {
    primary: 'text-primary',
    secondary: 'text-secondary',
    danger: 'text-danger',
    white: 'text-white',
    neutral: 'text-neutral-DEFAULT',
  };
  return (
    <FontAwesomeIcon
      icon={faSpinner}
      spin
      className={`${sizeStyles[size]} ${colorStyles[color]} ${className}`}
    />
  );
};

// --- Alert ---
export const Alert = ({ type = 'info', title, message, className = '' }) => {
  const typeStyles = {
    info: 'bg-blue-100 border-blue-400 text-blue-700',
    success: 'bg-green-100 border-green-400 text-green-700',
    warning: 'bg-yellow-100 border-yellow-400 text-yellow-700',
    error: 'bg-red-100 border-red-400 text-red-700',
    danger: 'bg-red-100 border-red-400 text-red-700', // Alias for error
  };

  if (!message && !title) return null;

  return (
    <div className={`border-l-4 p-4 ${typeStyles[type]} ${className}`} role="alert">
      {title && <p className="font-bold">{title}</p>}
      {message && <p>{message}</p>}
    </div>
  );
};
EOF

# web/pages.jsx
cat << 'EOF' > web/pages.jsx
import React, { useState, useEffect, Suspense, lazy, useRef } from 'react';
import { Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import Fuse from 'fuse.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeartPulse, faComments, faBookOpen, faChartLine, faUsersCog, faUserShield, faCheckCircle, faExclamationTriangle, faArrowRight, faSearch, faPaperPlane, faRobot, faUser, faClipboardList, faCalendarAlt, faLock } from '@fortawesome/free-solid-svg-icons';
import { Button, Modal, Gauge, Input, Textarea, Card, Spinner, Alert } from './ui.jsx';
import { useAuthStore } from './store.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

// --- API Client Setup (using Axios instance from store if defaults are set) ---
const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// Add a request interceptor to include the token if available
apiClient.interceptors.request.use(config => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});


// --- Authentication Components ---
const loginSchema = yup.object({
  email: yup.string().email('Invalid email format').required('Email is required'),
  password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
}).required();

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading, error } = useAuthStore();
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(loginSchema),
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/pro/dashboard'); // Redirect if already logged in
    }
  }, [isAuthenticated, navigate]);

  const onSubmit = async (data) => {
    const success = await login(data.email, data.password);
    if (success) {
      navigate('/pro/dashboard'); // Redirect based on role might be better
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-light">
      <Card className="w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6 text-primary">Login</h2>
        {error && <Alert type="error" message={error} className="mb-4" />}
        <form onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="Email"
            name="email"
            type="email"
            error={errors.email?.message}
            {...register('email')}
            disabled={isLoading}
          />
          <Input
            label="Password"
            name="password"
            type="password"
            error={errors.password?.message}
            {...register('password')}
            disabled={isLoading}
          />
          <Button type="submit" variant="primary" className="w-full mt-4" loading={isLoading} disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
           <p className="mt-4 text-center text-sm text-neutral-DEFAULT">
              Don't have an account?{' '}
              <Link to="/register" className="font-medium text-primary hover:text-primary-dark">
                Register here
              </Link>
           </p>
        </form>
      </Card>
    </div>
  );
};

const registerSchema = yup.object({
    email: yup.string().email('Invalid email format').required('Email is required'),
    password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
    confirmPassword: yup.string()
        .oneOf([yup.ref('password'), null], 'Passwords must match')
        .required('Confirm Password is required'),
}).required();

const RegisterPage = () => {
    const navigate = useNavigate();
    const { register: registerUser, isLoading, error } = useAuthStore();
    const { register, handleSubmit, formState: { errors } } = useForm({
        resolver: yupResolver(registerSchema),
    });
    const [registrationSuccess, setRegistrationSuccess] = useState(false);

    const onSubmit = async (data) => {
        const success = await registerUser(data.email, data.password);
         if (success) {
             setRegistrationSuccess(true);
             // Optionally redirect after a delay or let user click login
             // setTimeout(() => navigate('/login'), 3000);
         }
    };

    if (registrationSuccess) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-neutral-light">
                <Card className="w-full text-center">
                    <FontAwesomeIcon icon={faCheckCircle} className="text-green-500 text-5xl mb-4" />
                    <h2 className="text-2xl font-bold mb-4">Registration Successful!</h2>
                    <p className="mb-6">You can now log in with your credentials.</p>
                    <Link to="/login">
                        <Button variant="primary">Go to Login</Button>
                    </Link>
                </Card>
            </div>
        );
    }


    return (
        <div className="flex items-center justify-center min-h-screen bg-neutral-light">
            <Card className="w-full max-w-md">
                <h2 className="text-2xl font-bold text-center mb-6 text-primary">Register</h2>
                {error && <Alert type="error" message={error} className="mb-4" />}
                <form onSubmit={handleSubmit(onSubmit)}>
                    <Input
                        label="Email"
                        name="email"
                        type="email"
                        error={errors.email?.message}
                        {...register('email')}
                        disabled={isLoading}
                    />
                    <Input
                        label="Password"
                        name="password"
                        type="password"
                        error={errors.password?.message}
                        {...register('password')}
                        disabled={isLoading}
                    />
                     <Input
                        label="Confirm Password"
                        name="confirmPassword"
                        type="password"
                        error={errors.confirmPassword?.message}
                        {...register('confirmPassword')}
                        disabled={isLoading}
                    />
                    <Button type="submit" variant="primary" className="w-full mt-4" loading={isLoading} disabled={isLoading}>
                        {isLoading ? 'Registering...' : 'Register'}
                    </Button>
                    <p className="mt-4 text-center text-sm text-neutral-DEFAULT">
                        Already have an account?{' '}
                        <Link to="/login" className="font-medium text-primary hover:text-primary-dark">
                            Login here
                        </Link>
                    </p>
                </form>
            </Card>
        </div>
    );
};


// --- Protected Route Component ---
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, isLoading } = useAuthStore();
  const location = useLocation();

  // Handle loading state from async initAuth or login process
  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>;
  }

  if (!isAuthenticated) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to when they were redirected. This allows us to send them
    // along to that page after they login, which is a nicer user experience
    // than dropping them off on the home page.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
     // Redirect to home or an unauthorized page if role doesn't match
     return <Navigate to="/" replace />;
  }

  return children;
};

// --- Layout Component ---
const Layout = ({ children }) => {
    const { isAuthenticated, user, logout } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div className="min-h-screen flex flex-col">
            <header className="bg-white shadow-sm">
                <nav className="container mx-auto px-4 py-3 flex justify-between items-center">
                    <Link to="/" className="text-xl font-bold text-primary">MindWell Assist</Link>
                    <div className="space-x-4">
                        <Link to="/autoavaliacao" className="text-neutral-dark hover:text-primary">Self-Assessment</Link>
                        <Link to="/chat" className="text-neutral-dark hover:text-primary">Chat Assistant</Link>
                        <Link to="/recursos" className="text-neutral-dark hover:text-primary">Resources</Link>
                        {isAuthenticated && user?.role === 'professional' && (
                             <Link to="/pro/dashboard" className="text-neutral-dark hover:text-primary">Dashboard</Link>
                        )}
                         {isAuthenticated && user?.role === 'admin' && (
                             <Link to="/admin" className="text-neutral-dark hover:text-primary">Admin Panel</Link>
                         )}
                         {isAuthenticated ? (
                             <Button onClick={handleLogout} variant="outline" size="sm">Logout</Button>
                         ) : (
                             <Link to="/login">
                                 <Button variant="primary" size="sm">Login</Button>
                             </Link>
                         )}
                    </div>
                </nav>
            </header>
            <main className="flex-grow container mx-auto px-4 py-8">
                {children}
            </main>
            <footer className="bg-neutral-dark text-neutral-light py-6 mt-12">
                <div className="container mx-auto px-4 text-center">
                    <p>&copy; {new Date().getFullYear()} MindWell Assist. All rights reserved.</p>
                    <div className="mt-2 space-x-4">
                        <Link to="/privacidade" className="hover:text-primary-light">Privacy Policy</Link>
                        {/* Add other footer links as needed */}
                    </div>
                </div>
            </footer>
        </div>
    );
};

// --- Page Components ---

// Home Page
const HomePage = () => {
  return (
    <div>
      {/* Hero Section */}
      <section className="text-center py-16 md:py-24 bg-gradient-to-r from-primary-light to-cyan-600 text-white rounded-lg shadow-lg">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Your Path to Mental Well-being Starts Here</h1>
        <p className="text-lg md:text-xl mb-8 max-w-3xl mx-auto">Understand your feelings, explore resources, and connect with our AI assistant. Confidential and supportive.</p>
        <div className="space-x-4">
          <Link to="/autoavaliacao">
            <Button variant="secondary" size="lg">
              <FontAwesomeIcon icon={faHeartPulse} className="mr-2" />
              Start Self-Assessment
            </Button>
          </Link>
          <Link to="/chat">
            <Button variant="outline" className="bg-white text-primary border-white hover:bg-white/90" size="lg">
               <FontAwesomeIcon icon={faComments} className="mr-2" />
              Chat with Assistant
            </Button>
          </Link>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-16">
        <h2 className="text-3xl font-bold text-center mb-12 text-neutral-dark">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8 text-center">
          <Card>
            <FontAwesomeIcon icon={faClipboardList} size="3x" className="text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">1. Assess Yourself</h3>
            <p className="text-neutral-DEFAULT">Take confidential PHQ-9 & GAD-7 questionnaires to understand your current mood and anxiety levels.</p>
          </Card>
          <Card>
            <FontAwesomeIcon icon={faRobot} size="3x" className="text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">2. Get Insights & Chat</h3>
            <p className="text-neutral-DEFAULT">Receive instant feedback and risk level. Chat with our AI assistant for support and information.</p>
          </Card>
           <Card>
            <FontAwesomeIcon icon={faBookOpen} size="3x" className="text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">3. Explore Resources</h3>
            <p className="text-neutral-DEFAULT">Access curated articles, guides, and tools to help you manage your mental well-being.</p>
          </Card>
        </div>
      </section>

        {/* Counters Section - Placeholder Static Data */}
      <section className="py-12 bg-primary-light rounded-lg my-16">
          <div className="container mx-auto px-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                  <div>
                      <p className="text-4xl font-bold text-primary-dark">10,000+</p>
                      <p className="text-lg text-neutral-dark">Assessments Taken</p>
                  </div>
                   <div>
                      <p className="text-4xl font-bold text-primary-dark">5,000+</p>
                      <p className="text-lg text-neutral-dark">Users Assisted</p>
                  </div>
                  <div>
                      <p className="text-4xl font-bold text-primary-dark">100+</p>
                      <p className="text-lg text-neutral-dark">Helpful Resources</p>
                  </div>
                   <div>
                      <p className="text-4xl font-bold text-primary-dark">95%</p>
                      <p className="text-lg text-neutral-dark">Positive Feedback</p>
                  </div>
              </div>
          </div>
      </section>


      {/* Testimonials Section - Placeholder */}
      <section className="py-16">
         <h2 className="text-3xl font-bold text-center mb-12 text-neutral-dark">What Users Say</h2>
         <div className="grid md:grid-cols-2 gap-8">
            <Card>
                <blockquote className="italic text-neutral-DEFAULT mb-4">"The assessment was quick and insightful. It helped me realize I needed to talk to someone."</blockquote>
                <p className="font-semibold">- Alex P.</p>
            </Card>
             <Card>
                <blockquote className="italic text-neutral-DEFAULT mb-4">"The AI chat provided comforting words when I felt overwhelmed. It's a great first step."</blockquote>
                <p className="font-semibold">- Jamie R.</p>
            </Card>
         </div>
      </section>
    </div>
  );
};

// --- Self-Assessment Page ---

// Questions Data
const phq9Questions = [
  { id: 'q1', text: 'Little interest or pleasure in doing things?' },
  { id: 'q2', text: 'Feeling down, depressed, or hopeless?' },
  { id: 'q3', text: 'Trouble falling or staying asleep, or sleeping too much?' },
  { id: 'q4', text: 'Feeling tired or having little energy?' },
  { id: 'q5', text: 'Poor appetite or overeating?' },
  { id: 'q6', text: 'Feeling bad about yourself — or that you are a failure or have let yourself or your family down?' },
  { id: 'q7', text: 'Trouble concentrating on things, such as reading the newspaper or watching television?' },
  { id: 'q8', text: 'Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual?' },
  { id: 'q9', text: 'Thoughts that you would be better off dead, or of hurting yourself in some way?' },
];

const gad7Questions = [
  { id: 'q10', text: 'Feeling nervous, anxious, or on edge?' },
  { id: 'q11', text: 'Not being able to stop or control worrying?' },
  { id: 'q12', text: 'Worrying too much about different things?' },
  { id: 'q13', text: 'Trouble relaxing?' },
  { id: 'q14', text: 'Being so restless that it is hard to sit still?' },
  { id: 'q15', text: 'Becoming easily annoyed or irritable?' },
  { id: 'q16', text: 'Feeling afraid as if something awful might happen?' },
];

const answerOptions = [
  { value: 0, label: 'Not at all' },
  { value: 1, label: 'Several days' },
  { value: 2, label: 'More than half the days' },
  { value: 3, label: 'Nearly every day' },
];

// Yup schema for validation
const assessmentSchema = yup.object().shape(
    Object.fromEntries(
        [...phq9Questions, ...gad7Questions].map(q => [
            q.id,
            yup.number().typeError('Please select an option').required('This field is required').min(0).max(3)
        ])
    )
).required();


const AssessmentPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore(); // Get user info if logged in
  const [step, setStep] = useState(1); // 1: Intro, 2: PHQ9, 3: GAD7, 4: Results, 5: Consent
  const [results, setResults] = useState(null);
  const [showConsentModal, setShowConsentModal] = useState(false);

  const { control, handleSubmit, watch, formState: { errors, isValid } } = useForm({
    resolver: yupResolver(assessmentSchema),
    mode: 'onChange', // Validate on change to enable next button
  });

  const mutation = useMutation({
    mutationFn: (assessmentData) => apiClient.post('/assessments', assessmentData),
    onSuccess: () => {
      console.log("Assessment saved successfully");
      // Optionally show a success message or clear form
      setShowConsentModal(false); // Close modal on success
       alert('Your assessment results have been saved.'); // Simple confirmation
    },
    onError: (error) => {
      console.error("Error saving assessment:", error);
      alert(`Failed to save assessment: ${error.response?.data?.message || error.message}`);
      setShowConsentModal(false); // Close modal on error too
    }
  });

  const calculateResults = (data) => {
    const score_phq = phq9Questions.reduce((sum, q) => sum + (data[q.id] || 0), 0);
    const score_gad = gad7Questions.reduce((sum, q) => sum + (data[q.id] || 0), 0);
    const isSuicidalRisk = (data['q9'] || 0) >= 1;

    let interpretation_phq;
    if (score_phq <= 4) interpretation_phq = 'Minimal depression';
    else if (score_phq <= 9) interpretation_phq = 'Mild depression';
    else if (score_phq <= 14) interpretation_phq = 'Moderate depression';
    else if (score_phq <= 19) interpretation_phq = 'Moderately severe depression';
    else interpretation_phq = 'Severe depression';

    let interpretation_gad;
    if (score_gad <= 4) interpretation_gad = 'Minimal anxiety';
    else if (score_gad <= 9) interpretation_gad = 'Mild anxiety';
    else if (score_gad <= 14) interpretation_gad = 'Moderate anxiety';
    else interpretation_gad = 'Severe anxiety';

    let riskLevel;
    if (score_phq >= 20 || score_gad >= 15 || isSuicidalRisk) {
        riskLevel = 'HIGH';
    } else if (score_phq >= 10 || score_gad >= 10) {
        riskLevel = 'MODERATE';
    } else {
        riskLevel = 'LOW';
    }

    return {
      phqScore: score_phq,
      gadScore: score_gad,
      interpretation_phq,
      interpretation_gad,
      isSuicidalRisk,
      riskLevel,
      answers: data, // Keep original answers
    };
  };

  const onSubmit = (data) => {
    const calculatedResults = calculateResults(data);
    setResults(calculatedResults);
    setStep(4); // Move to results display
  };

  const handleNextStep = () => {
     // Could add specific validation checks per step if needed
    setStep(prev => prev + 1);
  }

  const handleSaveResults = () => {
    if (results) {
      setShowConsentModal(true);
    }
  };

   const handleConsentAndSave = () => {
    if (results) {
      mutation.mutate({
        userId: user?.id || null, // Include userId if logged in, otherwise null
        phqScore: results.phqScore,
        gadScore: results.gadScore,
        riskLevel: results.riskLevel,
        isSuicidalRisk: results.isSuicidalRisk,
        // answers: results.answers, // Optionally send answers (ensure encryption in backend)
        consentGiven: true, // Indicate consent was given
      });
    }
  };


  const renderQuestion = (question) => (
    <div key={question.id} className="mb-6 p-4 border rounded-lg bg-white">
      <label className="block text-md font-medium text-gray-800 mb-3">{question.text}</label>
      <Controller
        name={question.id}
        control={control}
        render={({ field }) => (
          <div className="flex flex-col sm:flex-row sm:space-x-4">
            {answerOptions.map(option => (
              <label key={option.value} className="inline-flex items-center mb-2 sm:mb-0">
                <input
                  type="radio"
                  {...field}
                  value={option.value}
                  checked={field.value === option.value}
                  className="form-radio h-4 w-4 text-primary focus:ring-primary border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">{option.label} ({option.value})</span>
              </label>
            ))}
          </div>
        )}
      />
      {errors[question.id] && <p className="mt-1 text-sm text-danger">{errors[question.id].message}</p>}
    </div>
  );

  const totalQuestions = phq9Questions.length + gad7Questions.length;
  const answeredQuestions = Object.keys(watch()).filter(key => watch(key) !== undefined).length;
  const progress = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;


    // --- Contact Professional Modal ---
    const [isContactModalOpen, setContactModalOpen] = useState(false);
    const contactSchema = yup.object({
        name: yup.string().required('Name is required'),
        contact: yup.string().required('Email or Phone is required'), // Can be email or phone
        message: yup.string().required('Message is required').min(10, 'Message is too short'),
    }).required();
    const { register: registerContact, handleSubmit: handleContactSubmit, formState: { errors: contactErrors }, reset: resetContactForm } = useForm({
        resolver: yupResolver(contactSchema)
    });

    const appointmentMutation = useMutation({
        mutationFn: (appointmentData) => apiClient.post('/appointments', appointmentData),
        onSuccess: () => {
            console.log("Appointment request sent successfully");
            alert('Your request has been sent. A professional may contact you soon.');
            setContactModalOpen(false);
            resetContactForm();
        },
        onError: (error) => {
            console.error("Error sending appointment request:", error);
            alert(`Failed to send request: ${error.response?.data?.message || error.message}`);
        }
    });

    const onContactSubmit = (data) => {
        appointmentMutation.mutate(data);
    };


  return (
    <div className="max-w-3xl mx-auto">
        {step < 4 && (
             <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6 dark:bg-gray-700">
                <div className="bg-primary h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
            </div>
        )}

      {step === 1 && (
        <Card className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-primary">Mental Health Self-Assessment</h2>
          <p className="mb-6 text-neutral-DEFAULT">This tool includes the PHQ-9 (for depression) and GAD-7 (for anxiety) questionnaires. Your responses are confidential. This is not a diagnostic tool, but it can help you understand your feelings.</p>
           <p className="mb-6 text-sm text-neutral-DEFAULT">Over the last <strong>2 weeks</strong>, how often have you been bothered by the following problems?</p>
          <Button onClick={() => setStep(2)} variant="primary" size="lg">
            Start Assessment <FontAwesomeIcon icon={faArrowRight} className="ml-2"/>
          </Button>
        </Card>
      )}

      {step === 2 && (
        <form> {/* No onSubmit here, handled by button */}
          <h3 className="text-xl font-semibold mb-4">Part 1: Depression (PHQ-9)</h3>
          {phq9Questions.map(renderQuestion)}
          <div className="text-right">
            <Button onClick={handleNextStep} variant="primary">
               Next: Anxiety Questions <FontAwesomeIcon icon={faArrowRight} className="ml-2"/>
            </Button>
          </div>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleSubmit(onSubmit)}> {/* Submit on final step */}
          <h3 className="text-xl font-semibold mb-4">Part 2: Anxiety (GAD-7)</h3>
          {gad7Questions.map(renderQuestion)}
          <div className="flex justify-between items-center mt-6">
             <Button onClick={() => setStep(2)} variant="outline">Back</Button>
             <Button type="submit" variant="primary" disabled={!isValid}>
                 View Results <FontAwesomeIcon icon={faCheckCircle} className="ml-2"/>
             </Button>
          </div>
        </form>
      )}

      {step === 4 && results && (
        <Card>
          <h2 className="text-2xl font-bold mb-6 text-center text-primary">Your Assessment Results</h2>

          {results.isSuicidalRisk && (
            <Alert type="danger" className="mb-6">
               <div className='flex items-center'>
                    <FontAwesomeIcon icon={faExclamationTriangle} className="text-xl mr-3"/>
                    <div>
                        <p className="font-bold">Important Safety Notice</p>
                        <p>Your answers indicate thoughts of self-harm. If you are in immediate danger, please contact emergency services (e.g., 911, 112) or a crisis hotline immediately. Help is available.</p>
                     </div>
               </div>
            </Alert>
          )}

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">PHQ-9 Score (Depression)</h3>
               <Gauge id="phq9" value={results.phqScore} maxValue={27} label={results.interpretation_phq} />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">GAD-7 Score (Anxiety)</h3>
              <Gauge id="gad7" value={results.gadScore} maxValue={21} label={results.interpretation_gad} />
            </div>
          </div>

          <div className={`text-center p-4 rounded-lg mb-8 ${
            results.riskLevel === 'HIGH' ? 'bg-red-100 border border-red-300' :
            results.riskLevel === 'MODERATE' ? 'bg-yellow-100 border border-yellow-300' :
            'bg-green-100 border border-green-300'
          }`}>
            <h3 className="text-lg font-semibold">Overall Risk Level:
              <span className={`ml-2 font-bold ${
                results.riskLevel === 'HIGH' ? 'text-red-700' :
                results.riskLevel === 'MODERATE' ? 'text-yellow-700' :
                'text-green-700'
              }`}>{results.riskLevel}</span>
            </h3>
          </div>

          <p className="text-neutral-DEFAULT mb-6">These results are based on your self-reported symptoms over the past two weeks. They are not a diagnosis. Consider discussing these results with a healthcare professional.</p>

          <div className="flex flex-col md:flex-row justify-center gap-4">
            <Button onClick={() => navigate('/chat')} variant="primary">
              <FontAwesomeIcon icon={faComments} className="mr-2"/> Chat with AI Assistant
            </Button>
             <Button onClick={() => setContactModalOpen(true)} variant="secondary">
               <FontAwesomeIcon icon={faUserShield} className="mr-2"/> Seek Professional Help
             </Button>
             <Button onClick={handleSaveResults} variant="outline">
              Save Results (Requires Consent)
            </Button>
          </div>


         {/* Contact Professional Modal */}
          <Modal isOpen={isContactModalOpen} onClose={() => setContactModalOpen(false)} title="Request Professional Contact">
             <form onSubmit={handleContactSubmit(onContactSubmit)}>
                 <p className="text-sm text-neutral-DEFAULT mb-4">Please provide your details. A mental health professional may reach out to you. Your contact information will be kept confidential.</p>
                 <Input
                     label="Your Name"
                     name="name"
                     error={contactErrors.name?.message}
                     {...registerContact('name')}
                     disabled={appointmentMutation.isLoading}
                 />
                  <Input
                     label="Email or Phone Number"
                     name="contact"
                     error={contactErrors.contact?.message}
                     {...registerContact('contact')}
                     disabled={appointmentMutation.isLoading}
                 />
                  <Textarea
                     label="Brief Message (Optional)"
                     name="message"
                     rows={4}
                     error={contactErrors.message?.message}
                     {...registerContact('message')}
                     disabled={appointmentMutation.isLoading}
                 />
                  <div className="mt-4 flex justify-end space-x-2">
                      <Button type="button" variant="ghost" onClick={() => {setContactModalOpen(false); resetContactForm();}} disabled={appointmentMutation.isLoading}>
                          Cancel
                      </Button>
                      <Button type="submit" variant="primary" loading={appointmentMutation.isLoading} disabled={appointmentMutation.isLoading}>
                          {appointmentMutation.isLoading ? 'Sending...' : 'Send Request'}
                      </Button>
                  </div>
             </form>
          </Modal>


        </Card>
      )}

       {/* Consent Modal */}
        <Modal isOpen={showConsentModal} onClose={() => setShowConsentModal(false)} title="Consent to Save Data">
          <div className="text-sm">
            <p className="mb-4">We need your permission to save your assessment results. Here's how your data will be used:</p>
            <ul className="list-disc list-inside mb-4 space-y-1">
              <li>To allow you (if logged in) or professionals (anonymously if not logged in) to track general trends.</li>
              <li>To help improve our services and understand user needs (data is aggregated and anonymized).</li>
              <li>Sensitive details like specific answers may be stored encrypted.</li>
              <li>Data older than 12 months may be automatically anonymized or deleted.</li>
            </ul>
            <p className="mb-4">You can read our full <Link to="/privacidade" className="text-primary underline" target="_blank">Privacy Policy</Link> for more details.</p>
            <p className="font-semibold">Do you consent to saving your assessment results?</p>
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowConsentModal(false)} disabled={mutation.isLoading}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConsentAndSave} loading={mutation.isLoading} disabled={mutation.isLoading}>
              Yes, I Consent
            </Button>
          </div>
        </Modal>

    </div>
  );
};


// --- Chat Page ---
const ChatPage = () => {
  const [messages, setMessages] = useState([]); // { role: 'user' | 'assistant', content: string }[]
  const [input, setInput] = useState('');
  const { user } = useAuthStore(); // Get user info if logged in
  const messagesEndRef = useRef(null); // To auto-scroll

  const mutation = useMutation({
    mutationFn: (newMessage) => apiClient.post('/chat', { message: newMessage, userId: user?.id }), // Send userId if available
    onSuccess: (response) => {
        setMessages(prev => [...prev, { role: 'assistant', content: response.data.reply }]);
    },
    onError: (error) => {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error. Please try again later." }]);
    },
  });

   const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]); // Scroll whenever messages update

  const handleSend = (e) => {
    e.preventDefault();
    if (input.trim() && !mutation.isLoading) {
      const userMessage = { role: 'user', content: input };
      setMessages(prev => [...prev, userMessage]);
      mutation.mutate(input);
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] max-w-3xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 border-b bg-primary-light text-primary-dark font-semibold">
         <FontAwesomeIcon icon={faComments} className="mr-2" /> AI Assistant Chat
      </div>
      <div className="flex-grow p-4 overflow-y-auto space-y-4">
        {/* Initial message from bot */}
        {messages.length === 0 && (
             <div className="flex items-start space-x-3">
                 <FontAwesomeIcon icon={faRobot} className="text-primary text-xl mt-1" />
                <div className="bg-gray-100 p-3 rounded-lg max-w-xs sm:max-w-md">
                    <p className="text-sm">Hello! I'm MindGuide, your AI assistant. How can I help you today? You can ask me about mental well-being or how the assessments work.</p>
                </div>
            </div>
        )}
        {/* Chat messages */}
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
             <div className={`flex items-start space-x-3 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                 <FontAwesomeIcon icon={msg.role === 'user' ? faUser : faRobot} className={`text-xl mt-1 ${msg.role === 'user' ? 'text-secondary-dark' : 'text-primary'}`} />
                 <div className={`${msg.role === 'user' ? 'bg-primary text-white' : 'bg-gray-100 text-neutral-dark'} p-3 rounded-lg max-w-xs sm:max-w-md`}>
                    <p className="text-sm">{msg.content}</p>
                 </div>
            </div>
          </div>
        ))}
         {mutation.isLoading && (
            <div className="flex items-start space-x-3">
                <FontAwesomeIcon icon={faRobot} className="text-primary text-xl mt-1" />
                <div className="bg-gray-100 p-3 rounded-lg inline-flex items-center">
                    <Spinner size="sm" color="neutral" className="mr-2"/>
                    <span className="text-sm italic text-neutral-DEFAULT">MindGuide is thinking...</span>
                </div>
            </div>
        )}
         <div ref={messagesEndRef} /> {/* Anchor for scrolling */}
      </div>
      <form onSubmit={handleSend} className="p-4 border-t flex items-center space-x-2 bg-gray-50">
        <Input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="flex-grow !mb-0" // Override margin bottom from default Input
          disabled={mutation.isLoading}
          aria-label="Chat input"
        />
        <Button type="submit" variant="primary" disabled={mutation.isLoading || !input.trim()} className="!px-3 !py-2"> {/* Use ! to override size styles */}
           <FontAwesomeIcon icon={faPaperPlane} />
        </Button>
      </form>
    </div>
  );
};

// --- Resources Page ---
// Static data for now, could be fetched from API: GET /resources
const resourceData = [
  { id: 1, type: 'Article', title: 'Understanding Anxiety', description: 'Learn about the common symptoms and types of anxiety disorders.', content: 'Anxiety is a normal human emotion... (full article content here)' },
  { id: 2, type: 'Article', title: 'Coping Strategies for Low Mood', description: 'Practical tips to help manage feelings of depression or sadness.', content: 'When feeling low, small steps can make a difference... ' },
  { id: 3, type: 'Guide', title: 'Mindfulness Meditation Guide (PDF)', description: 'A step-by-step guide to starting a mindfulness practice.', link: '/resources/mindfulness-guide.pdf' }, // Needs actual PDF
  { id: 4, type: 'Audio', title: '5-Minute Breathing Exercise', description: 'A short guided audio for quick relaxation.', audioSrc: '/audio/breathing-exercise.mp3' }, // Needs actual MP3
  { id: 5, type: 'Article', title: 'The Importance of Sleep for Mental Health', description: 'Explore the connection between sleep quality and emotional well-being.', content: 'Sleep is crucial for...' },
   { id: 6, type: 'External Link', title: 'Crisis Text Line', description: 'Connect with a crisis counselor via text message (USA).', link: 'https://www.crisistextline.org/', external: true },
];

const fuseOptions = {
  keys: ['title', 'description', 'type'],
  threshold: 0.4, // Adjust sensitivity
};

const ResourcesPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredResources, setFilteredResources] = useState(resourceData);
  const [selectedResource, setSelectedResource] = useState(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const audioRef = useRef(null);

   // TODO: Fetch resources from API using React Query
   // const { data: resourceData = [], isLoading, error } = useQuery('resources', () =>
   //   apiClient.get('/resources').then(res => res.data)
   // );

  const fuse = new Fuse(resourceData, fuseOptions);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredResources(resourceData);
    } else {
      const results = fuse.search(searchTerm);
      setFilteredResources(results.map(result => result.item));
    }
  }, [searchTerm, resourceData]); // Re-run search if data or term changes

  const openResource = (resource) => {
    if (resource.external) {
        window.open(resource.link, '_blank', 'noopener,noreferrer');
    } else if (resource.type === 'Article' || resource.type === 'Audio' || resource.type === 'Guide') {
        setSelectedResource(resource);
        setModalOpen(true);
    } else {
        // Handle other types or simple links
        if(resource.link) window.open(resource.link, '_blank', 'noopener,noreferrer');
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedResource(null);
     if (audioRef.current) {
        audioRef.current.pause(); // Stop audio when closing modal
     }
  };

  return (
    <div>
      <h2 className="text-3xl font-bold mb-6 text-primary">Resources Library</h2>
      <p className="mb-8 text-neutral-DEFAULT">Explore articles, guides, and tools to support your mental well-being. Use the search bar to find specific topics.</p>

      <div className="mb-8 relative">
        <Input
          type="search"
          placeholder="Search resources (e.g., anxiety, sleep, meditation)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10" // Add padding for icon
          aria-label="Search resources"
        />
         <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
      </div>

       {/* Add Loading/Error states if fetching data */}
       {/* {isLoading && <div className="text-center"><Spinner size="lg" /></div>}
       {error && <Alert type="error" title="Error loading resources" message={error.message} />} */}

      {filteredResources.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredResources.map(resource => (
                  <Card key={resource.id} className="flex flex-col justify-between hover:shadow-lg transition-shadow">
                      <div>
                          <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full mb-2 ${
                              resource.type === 'Article' ? 'bg-blue-100 text-blue-800' :
                              resource.type === 'Guide' ? 'bg-green-100 text-green-800' :
                              resource.type === 'Audio' ? 'bg-purple-100 text-purple-800' :
                              'bg-gray-100 text-gray-800'
                          }`}>{resource.type}</span>
                          <h3 className="text-lg font-semibold mb-2">{resource.title}</h3>
                          <p className="text-sm text-neutral-DEFAULT mb-4">{resource.description}</p>
                      </div>
                      <Button onClick={() => openResource(resource)} variant="outline" size="sm" className="mt-auto">
                          {resource.external ? 'Visit Link' : 'View Resource'} <FontAwesomeIcon icon={faArrowRight} className="ml-1" />
                      </Button>
                  </Card>
              ))}
          </div>
      ) : (
          <p className="text-center text-neutral-DEFAULT italic">No resources found matching your search.</p>
      )}


      {/* Resource Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title={selectedResource?.title}>
         {selectedResource && (
           <div>
             {selectedResource.type === 'Article' && (
               <div className="prose max-w-none"> {/* Use Tailwind Typography if installed */}
                 {/* Render markdown here if content is markdown */}
                 <p>{selectedResource.content}</p>
               </div>
             )}
             {selectedResource.type === 'Guide' && (
                <div>
                    <p className="mb-4">{selectedResource.description}</p>
                    <a href={selectedResource.link} target="_blank" rel="noopener noreferrer" download>
                         <Button variant="primary">Download Guide (PDF)</Button>
                    </a>
                 </div>
             )}
              {selectedResource.type === 'Audio' && (
                 <div className="text-center">
                    <p className="mb-4">{selectedResource.description}</p>
                    <audio controls ref={audioRef} src={selectedResource.audioSrc} className="w-full">
                         Your browser does not support the audio element.
                     </audio>
                 </div>
              )}
             {/* Add rendering for other types if needed */}
           </div>
         )}
      </Modal>
    </div>
  );
};


// --- Professional Dashboard Page ---
const ProDashboardPage = () => {
    // Fetch data needed for the dashboard
    const { data: stats, isLoading: isLoadingStats, error: errorStats } = useQuery({
       queryKey: ['proStats'],
       queryFn: () => apiClient.get('/stats').then(res => res.data),
       // staleTime: 1000 * 60 * 5, // Cache for 5 mins
    });

    const { data: assessments, isLoading: isLoadingAssessments, error: errorAssessments } = useQuery({
        queryKey: ['recentAssessments'],
        queryFn: () => apiClient.get('/assessments?limit=10&sortBy=createdAt:desc').then(res => res.data), // Fetch recent 10
        // staleTime: 1000 * 60 * 5,
    });

     const { data: appointments, isLoading: isLoadingAppointments, error: errorAppointments } = useQuery({
         queryKey: ['appointments'],
         queryFn: () => apiClient.get('/appointments?status=pending').then(res => res.data), // Fetch pending appointments
         // staleTime: 1000 * 60 * 5,
     });

      // Example mutation to update appointment status
      const queryClient = useQueryClient();
      const updateAppointmentMutation = useMutation({
         mutationFn: ({ id, status }) => apiClient.put(`/appointments/${id}`, { status }),
         onSuccess: () => {
            queryClient.invalidateQueries(['appointments']); // Refetch appointments list
            queryClient.invalidateQueries(['proStats']); // Refetch stats might be affected
         },
         onError: (error) => {
            alert(`Failed to update appointment: ${error.response?.data?.message || error.message}`);
         }
      });

     const handleConfirmAppointment = (id) => {
         updateAppointmentMutation.mutate({ id, status: 'confirmed' });
     };
      const handleCancelAppointment = (id) => {
          updateAppointmentMutation.mutate({ id, status: 'cancelled' });
      };


    if (isLoadingStats || isLoadingAssessments || isLoadingAppointments) {
        return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;
    }

     const kpiError = errorStats ? 'Error loading KPIs' : null;
     const assessmentError = errorAssessments ? 'Error loading assessments' : null;
     const appointmentError = errorAppointments ? 'Error loading appointments' : null;

    // Placeholder data if stats are unavailable
    const displayStats = stats || { highRiskToday: 0, totalAssessmentsMonth: 0, newContactsPending: appointments?.length || 0 };

  return (
    <div>
      <h2 className="text-3xl font-bold mb-8 text-primary"><FontAwesomeIcon icon={faChartLine} className="mr-2" />Professional Dashboard</h2>

       {/* KPI Cards */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <Card className={kpiError ? 'border-l-4 border-danger' : ''}>
                 <h3 className="text-lg font-semibold text-neutral-DEFAULT mb-2">High Risk Today</h3>
                 {kpiError ? <p className="text-danger text-sm">{kpiError}</p> : <p className="text-4xl font-bold text-danger">{displayStats.highRiskToday ?? 'N/A'}</p>}
             </Card>
              <Card className={kpiError ? 'border-l-4 border-danger' : ''}>
                 <h3 className="text-lg font-semibold text-neutral-DEFAULT mb-2">Assessments (This Month)</h3>
                 {kpiError ? <p className="text-danger text-sm">{kpiError}</p> : <p className="text-4xl font-bold text-primary">{displayStats.totalAssessmentsMonth ?? 'N/A'}</p>}
             </Card>
             <Card className={appointmentError ? 'border-l-4 border-danger' : ''}>
                 <h3 className="text-lg font-semibold text-neutral-DEFAULT mb-2">Pending Contact Requests</h3>
                  {appointmentError ? <p className="text-danger text-sm">{appointmentError}</p> : <p className="text-4xl font-bold text-secondary-dark">{displayStats.newContactsPending ?? 'N/A'}</p>}
              </Card>
       </div>

       {/* Recent High-Risk Assessments Table */}
       <section className="mb-10">
            <h3 className="text-2xl font-semibold mb-4 text-neutral-dark">Recent Assessments (Prioritizing High Risk)</h3>
            {assessmentError && <Alert type="error" message={assessmentError} />}
             {!assessmentError && (!assessments || assessments.length === 0) && <p className="text-neutral-DEFAULT italic">No recent assessments found.</p>}
             {!assessmentError && assessments && assessments.length > 0 && (
                <Card className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                         <thead className="bg-gray-50">
                             <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk Level</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PHQ-9</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GAD-7</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Suicidal Risk?</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                             </tr>
                         </thead>
                         <tbody className="bg-white divide-y divide-gray-200">
                             {assessments.sort((a, b) => { // Sort to bring HIGH risk first, then by date
                                 const riskOrder = { 'HIGH': 0, 'MODERATE': 1, 'LOW': 2 };
                                 if (riskOrder[a.riskLevel] !== riskOrder[b.riskLevel]) {
                                     return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
                                 }
                                 return new Date(b.createdAt) - new Date(a.createdAt);
                             }).map((assessment) => (
                                 <tr key={assessment.id} className={`${assessment.riskLevel === 'HIGH' ? 'bg-red-50' : assessment.riskLevel === 'MODERATE' ? 'bg-yellow-50' : ''}`}>
                                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(assessment.createdAt).toLocaleDateString()}</td>
                                     <td className="px-6 py-4 whitespace-nowrap">
                                         <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                              assessment.riskLevel === 'HIGH' ? 'bg-red-100 text-red-800' :
                                              assessment.riskLevel === 'MODERATE' ? 'bg-yellow-100 text-yellow-800' :
                                              'bg-green-100 text-green-800'
                                            }`}>{assessment.riskLevel}</span>
                                     </td>
                                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{assessment.phqScore}</td>
                                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{assessment.gadScore}</td>
                                     <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                         {assessment.isSuicidalRisk ? <span className="text-red-600">Yes</span> : 'No'}
                                     </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                         {assessment.User ? assessment.User.email : 'Anonymous'}
                                      </td>
                                 </tr>
                             ))}
                         </tbody>
                    </table>
                 </Card>
             )}
       </section>

        {/* Pending Appointments/Contact Requests */}
        <section>
            <h3 className="text-2xl font-semibold mb-4 text-neutral-dark"><FontAwesomeIcon icon={faCalendarAlt} className="mr-2" />Pending Contact Requests</h3>
            {appointmentError && <Alert type="error" message={appointmentError} />}
             {!appointmentError && (!appointments || appointments.length === 0) && <p className="text-neutral-DEFAULT italic">No pending requests.</p>}
             {!appointmentError && appointments && appointments.length > 0 && (
                <div className="space-y-4">
                    {appointments.map(appt => (
                         <Card key={appt.id}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm text-gray-500">Received: {new Date(appt.createdAt).toLocaleString()}</p>
                                    <p className="font-semibold mt-1">From: {appt.patientName} ({appt.patientContact})</p>
                                    <p className="mt-2 text-sm text-gray-700">{appt.message || 'No message provided.'}</p>
                                </div>
                                 <div className="flex flex-col space-y-2 items-end flex-shrink-0 ml-4">
                                     <Button
                                         variant="primary"
                                         size="sm"
                                         onClick={() => handleConfirmAppointment(appt.id)}
                                         loading={updateAppointmentMutation.isLoading && updateAppointmentMutation.variables?.id === appt.id && updateAppointmentMutation.variables?.status === 'confirmed'}
                                         disabled={updateAppointmentMutation.isLoading}
                                      >
                                         Confirm
                                     </Button>
                                     <Button
                                         variant="danger"
                                         size="sm"
                                          onClick={() => handleCancelAppointment(appt.id)}
                                          loading={updateAppointmentMutation.isLoading && updateAppointmentMutation.variables?.id === appt.id && updateAppointmentMutation.variables?.status === 'cancelled'}
                                          disabled={updateAppointmentMutation.isLoading}
                                      >
                                          Cancel/Reject
                                      </Button>
                                 </div>
                             </div>
                         </Card>
                     ))}
                 </div>
             )}
        </section>

       {/* Add Charts or FullCalendar here later if needed */}
        {/* <section className="mt-10">
            <h3 className="text-2xl font-semibold mb-4 text-neutral-dark">Risk Level Trends</h3>
             Placeholder for Chart.js or Recharts component
            <Card>
                 <p className="text-center p-8 text-neutral-DEFAULT">Chart component to be implemented here.</p>
             </Card>
        </section> */}

    </div>
  );
};

// --- Admin Panel Page ---
const AdminPanelPage = () => {
     const queryClient = useQueryClient();

     // Fetch Users
     const { data: users, isLoading: isLoadingUsers, error: errorUsers, refetch: refetchUsers } = useQuery({
         queryKey: ['adminUsers'],
         queryFn: () => apiClient.get('/admin/users').then(res => res.data)
     });

     // Fetch Logs (example - might need adjustments based on API implementation)
      const { data: logs, isLoading: isLoadingLogs, error: errorLogs } = useQuery({
         queryKey: ['adminLogs'],
         queryFn: () => apiClient.get('/admin/logs?limit=50').then(res => res.data), // Limit logs fetched
         refetchInterval: 30000 // Refetch logs every 30 seconds (optional)
     });


     // --- Mutations ---
     const updateUserMutation = useMutation({
         mutationFn: ({ id, role }) => apiClient.put(`/admin/users/${id}`, { role }),
         onSuccess: () => {
             queryClient.invalidateQueries(['adminUsers']);
             alert('User role updated.');
         },
         onError: (error) => alert(`Error updating user: ${error.response?.data?.message || error.message}`)
     });

     const deleteUserMutation = useMutation({
          mutationFn: (id) => apiClient.delete(`/admin/users/${id}`),
          onSuccess: () => {
              queryClient.invalidateQueries(['adminUsers']);
              alert('User deleted.');
          },
          onError: (error) => alert(`Error deleting user: ${error.response?.data?.message || error.message}`)
      });

       const triggerBackupMutation = useMutation({
           mutationFn: () => apiClient.post('/admin/backup'),
           onSuccess: (data) => alert(`Backup successful: ${data.message || 'OK'}`),
           onError: (error) => alert(`Error triggering backup: ${error.response?.data?.message || error.message}`)
       });

       const triggerAnonymizeMutation = useMutation({
            mutationFn: () => apiClient.post('/admin/anonymize'),
            onSuccess: (data) => alert(`Anonymization task started: ${data.message || 'OK'}`),
            onError: (error) => alert(`Error triggering anonymization: ${error.response?.data?.message || error.message}`)
        });

     // --- Handlers ---
      const handleRoleChange = (userId, newRole) => {
         if (confirm(`Change user ${userId}'s role to ${newRole}?`)) {
             updateUserMutation.mutate({ id: userId, role: newRole });
         }
     };

     const handleDeleteUser = (userId, userEmail) => {
         if (confirm(`Are you sure you want to delete user ${userEmail} (ID: ${userId})? This cannot be undone.`)) {
            deleteUserMutation.mutate(userId);
         }
     };

      const handleTriggerBackup = () => {
         if (confirm('Are you sure you want to trigger a database backup now?')) {
            triggerBackupMutation.mutate();
         }
     };

     const handleTriggerAnonymize = () => {
          if (confirm('Are you sure you want to manually trigger the anonymization process for old data?')) {
              triggerAnonymizeMutation.mutate();
          }
      };


    return (
        <div>
            <h2 className="text-3xl font-bold mb-8 text-primary"><FontAwesomeIcon icon={faUsersCog} className="mr-2" />Admin Panel</h2>

             {/* Action Buttons */}
             <section className="mb-10">
                  <h3 className="text-xl font-semibold mb-4 text-neutral-dark">Administrative Actions</h3>
                  <div className="flex space-x-4">
                     <Button
                         variant="secondary"
                         onClick={handleTriggerBackup}
                         loading={triggerBackupMutation.isLoading}
                         disabled={triggerBackupMutation.isLoading}
                      >
                         Trigger DB Backup Now
                      </Button>
                      <Button
                          variant="warning" // Assuming you add a warning variant or use secondary/danger
                          onClick={handleTriggerAnonymize}
                          loading={triggerAnonymizeMutation.isLoading}
                          disabled={triggerAnonymizeMutation.isLoading}
                       >
                           Trigger Anonymization Now
                       </Button>
                       {/* Add Feature Flag Toggles here if implemented */}
                   </div>
                   {triggerBackupMutation.isError && <Alert type="error" message={triggerBackupMutation.error.message} className="mt-4"/>}
                   {triggerAnonymizeMutation.isError && <Alert type="error" message={triggerAnonymizeMutation.error.message} className="mt-4"/>}
             </section>

            {/* User Management Table */}
            <section className="mb-10">
                <h3 className="text-xl font-semibold mb-4 text-neutral-dark">User Management</h3>
                {isLoadingUsers && <Spinner />}
                {errorUsers && <Alert type="error" title="Error loading users" message={errorUsers.message} />}
                {!isLoadingUsers && !errorUsers && users && (
                    <Card className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {users.map(user => (
                                    <tr key={user.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.id}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                             {/* Simple Select for role change */}
                                             <select
                                                 value={user.role}
                                                 onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                 className="text-sm rounded border-gray-300 focus:ring-primary focus:border-primary"
                                                 disabled={updateUserMutation.isLoading && updateUserMutation.variables?.id === user.id}
                                             >
                                                 <option value="user">User</option>
                                                 <option value="professional">Professional</option>
                                                 <option value="admin">Admin</option>
                                             </select>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                             <Button
                                                 variant="danger"
                                                 size="sm"
                                                 onClick={() => handleDeleteUser(user.id, user.email)}
                                                 loading={deleteUserMutation.isLoading && deleteUserMutation.variables === user.id}
                                                 disabled={deleteUserMutation.isLoading}
                                             >
                                                 Delete
                                             </Button>
                                              {/* Add Edit button if more fields are editable */}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>
                )}
            </section>

             {/* System Logs */}
             <section>
                  <h3 className="text-xl font-semibold mb-4 text-neutral-dark">Recent System Logs</h3>
                  {isLoadingLogs && <Spinner />}
                  {errorLogs && <Alert type="error" title="Error loading logs" message={errorLogs.message} />}
                  {!isLoadingLogs && !errorLogs && logs && (
                       <Card className="bg-gray-800 text-gray-200 font-mono text-xs p-4 max-h-96 overflow-y-auto">
                          <pre>
                            {logs.length > 0 ? logs.join('\n') : 'No recent logs found.'}
                          </pre>
                       </Card>
                  )}
              </section>

        </div>
    );
};

// --- Privacy Policy Page ---
const PrivacyPolicyPage = () => {
  return (
    <div className="prose max-w-4xl mx-auto"> {/* Using Tailwind Typography for basic styling */}
      <h1 className="text-primary">Privacy Policy & Terms of Use</h1>
      <p><strong>Last Updated:</strong> {new Date().toLocaleDateString()}</p>

      <h2>1. Introduction</h2>
      <p>Welcome to MindWell Assist. We are committed to protecting your privacy and handling your data in an open and transparent manner. This policy details how we collect, use, store, and protect your personal information.</p>

      <h2>2. Information We Collect</h2>
      <ul>
        <li><strong>Account Information:</strong> If you register, we collect your email address and hashed password.</li>
        <li><strong>Assessment Data:</strong> We collect your responses to the PHQ-9 and GAD-7 questionnaires, the calculated scores, and risk level. We ask for your explicit consent before saving this data.</li>
        <li><strong>Chat Data:</strong> Conversations with the AI assistant may be logged for quality assurance and service improvement. User identification (if logged in) may be associated with the chat.</li>
        <li><strong>Contact Requests:</strong> If you use the "Seek Professional Help" form, we collect your name, contact details (email/phone), and message.</li>
        <li><strong>Usage Data:</strong> We may collect anonymous data about how you interact with the website (e.g., pages visited, features used) using standard web analytics tools.</li>
      </ul>

       <h2>3. How We Use Your Information</h2>
      <ul>
          <li>To provide and operate the service (assessments, chat).</li>
          <li>To store assessment results upon your consent.</li>
          <li>To facilitate contact between you and professionals if you request it.</li>
          <li>To improve the website and AI assistant performance (using anonymized or aggregated data).</li>
          <li>To ensure security and prevent abuse.</li>
          <li>To comply with legal obligations.</li>
      </ul>


      <h2>4. Data Storage and Security</h2>
      <ul>
        <li>Your data is stored in a secure database (SQLite file on the server).</li>
        <li>Sensitive information (passwords, specific assessment answers if stored, contact details, messages) is encrypted using industry-standard AES-256 encryption.</li>
        <li>We implement security measures like Helmet, CORS, and rate limiting to protect the API.</li>
        <li>Access to sensitive data is restricted to authorized personnel (professionals, admins) based on their roles.</li>
      </ul>

       <h2>5. Data Retention and Anonymization</h2>
        <ul>
            <li>Assessment data is subject to anonymization after 12 months (User ID and specific answers may be removed).</li>
            <li>You can request deletion of your account and associated data (subject to legal requirements).</li>
            <li>Anonymized and aggregated data may be kept for longer periods for statistical analysis.</li>
        </ul>


      <h2>6. Your Rights (LGPD Compliance)</h2>
       <p>You have the right to:</p>
        <ul>
            <li>Access the personal data we hold about you.</li>
            <li>Correct inaccurate information.</li>
            <li>Request deletion of your data (subject to limitations).</li>
            <li>Withdraw consent for data processing where consent is the basis.</li>
            <li>Request information about data sharing.</li>
            <li>Lodge a complaint with the relevant data protection authority.</li>
        </ul>
       <p>To exercise these rights, please contact us via [Provide Contact Method - e.g., email address].</p>

       <h2>7. Use of Cookies</h2>
        <p>We use necessary cookies for authentication and session management. We may use analytics cookies for usage tracking (you can manage cookie preferences via browser settings).</p>


      <h2>8. Third-Party Services</h2>
       <ul>
          <li><strong>OpenAI:</strong> Chat messages are sent to the OpenAI API (o4-mini model) to generate responses. OpenAI has its own privacy policy regarding data usage. We do not send identifiable personal information (like email) directly within the chat prompt unless you type it.</li>
          {/* List any other third-party services like analytics */}
       </ul>

       <h2>9. Children's Privacy</h2>
        <p>This service is not intended for individuals under the age of 16 (or the applicable age of consent in your jurisdiction). We do not knowingly collect data from children.</p>


      <h2>10. Changes to This Policy</h2>
      <p>We may update this policy from time to time. We will notify you of significant changes by posting the new policy on the website. Your continued use of the service after changes constitutes acceptance.</p>

      <h2>11. Contact Us</h2>
      <p>If you have questions about this policy, please contact us at [Provide Contact Email or Form Link].</p>

       <hr />

       <h2>Terms of Use</h2>
       <ol>
          <li>This website provides tools for self-assessment and general information about mental well-being. It is **not** a substitute for professional medical advice, diagnosis, or treatment.</li>
           <li>Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition. Never disregard professional medical advice or delay in seeking it because of something you have read on this website.</li>
           <li>If you are in crisis or think you may have an emergency, call your doctor or emergency services immediately.</li>
           <li>The AI assistant provides information and support but cannot offer therapy or medical advice.</li>
           <li>You agree not to misuse the service, attempt unauthorized access, or introduce malicious code.</li>
           <li>We reserve the right to modify or discontinue the service at any time.</li>
           <li>Use of this service is at your own risk. We provide it "as is" without warranties of any kind.</li>
       </ol>

    </div>
  );
};

// --- Not Found Page ---
const NotFoundPage = () => {
  return (
    <div className="text-center py-20">
      <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
      <h2 className="text-3xl font-semibold mb-6">Page Not Found</h2>
      <p className="text-neutral-DEFAULT mb-8">Sorry, the page you are looking for does not exist.</p>
      <Link to="/">
        <Button variant="primary">Go Back Home</Button>
      </Link>
    </div>
  );
};


// --- Main Router ---
function Pages() {
  return (
     <Layout>
        <Suspense fallback={<div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/autoavaliacao" element={<AssessmentPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/recursos" element={<ResourcesPage />} />
            <Route path="/privacidade" element={<PrivacyPolicyPage />} />
            <Route path="/login" element={<LoginPage />} />
             <Route path="/register" element={<RegisterPage />} />

            {/* Protected Routes */}
            <Route
              path="/pro/dashboard"
              element={
                <ProtectedRoute allowedRoles={['professional', 'admin']}>
                  <ProDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminPanelPage />
                </ProtectedRoute>
              }
            />

             {/* Catch-all for 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
    </Layout>
  );
}

export default Pages;
EOF

# web/web.test.jsx (Basic Vitest setup)
cat << 'EOF' > web/web.test.jsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock Zustand store if needed for component tests
// vi.mock('./store', () => ({
//   useAuthStore: () => ({
//     isAuthenticated: false,
//     user: null,
//     // Mock other state/actions as needed
//   }),
// }));

// Mock UI components if they interfere or are complex
// vi.mock('./ui', async (importOriginal) => {
//   const original = await importOriginal();
//   return {
//     ...original,
//     Gauge: () => <div data-testid="mock-gauge">Mock Gauge</div>, // Mock Gauge
//     Spinner: () => <div data-testid="mock-spinner">Loading...</div>,
//   };
// });


// Import components to test *after* mocks
import { Button } from './ui.jsx'; // Example: Test a simple UI component
// Import Pages or specific page components if needed (might require more setup)
// import HomePage from './pages.jsx'; // Example, adjust based on actual export


const queryClient = new QueryClient();

// Helper function to render with necessary providers
const renderWithProviders = (ui, { route = '/' } = {}) => {
  window.history.pushState({}, 'Test page', route);
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  );
};


describe('UI Components', () => {
  describe('Button', () => {
    it('renders children correctly', () => {
      render(<Button>Click Me</Button>);
      expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
    });

    it('calls onClick handler when clicked', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click Me</Button>);
      fireEvent.click(screen.getByRole('button', { name: /click me/i }));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('is disabled when disabled prop is true', () => {
      render(<Button disabled>Click Me</Button>);
      expect(screen.getByRole('button', { name: /click me/i })).toBeDisabled();
    });

     it('shows spinner and is disabled when loading prop is true', () => {
       // Need to ensure Spinner mock or actual component renders identifiable content
       // For now, just check disabled state and presence of button text
       render(<Button loading>Loading Button</Button>);
       const button = screen.getByRole('button', { name: /loading button/i });
       expect(button).toBeDisabled();
       // Ideally, check for spinner presence: expect(screen.getByTestId('mock-spinner')).toBeInTheDocument();
       expect(screen.getByText(/loading button/i)).toBeInTheDocument(); // Check text still exists
     });

     it('applies correct variant classes', () => {
       render(<Button variant="danger">Delete</Button>);
       expect(screen.getByRole('button', { name: /delete/i })).toHaveClass('bg-danger');
     });
  });

  // Add tests for other UI components like Card, Modal, Alert, Input etc.
});

// describe('Pages', () => {
//   describe('HomePage', () => {
//     it('renders hero section with main title', () => {
//       renderWithProviders(<Pages />, { route: '/' }); // Render the main router at home
//       expect(screen.getByRole('heading', { name: /your path to mental well-being/i })).toBeInTheDocument();
//     });

//     it('has links/buttons for assessment and chat', () => {
//       renderWithProviders(<Pages />, { route: '/' });
//       expect(screen.getByRole('link', { name: /start self-assessment/i })).toBeInTheDocument();
//       expect(screen.getByRole('link', { name: /chat with assistant/i })).toBeInTheDocument();
//     });
//   });

  // Add tests for AssessmentPage logic (calculation, steps)
  // Add tests for ResourcesPage (search filtering)
  // Add tests for protected routes (requires mocking auth state)
// });

// Example: Test calculation logic if extracted into a helper function
const calculateTestScores = (data) => {
     const score_phq = (data.q1 || 0) + (data.q2 || 0) + (data.q9 || 0); // Simplified subset
     const isSuicidalRisk = (data.q9 || 0) >= 1;
     let riskLevel;
     if (score_phq >= 5 || isSuicidalRisk) riskLevel = 'HIGH'; // Simplified logic
     else if (score_phq >= 2) riskLevel = 'MODERATE';
     else riskLevel = 'LOW';
     return { score_phq, isSuicidalRisk, riskLevel };
};

describe('Assessment Logic', () => {
     it('calculates scores and risk level correctly (Low Risk)', () => {
         const answers = { q1: 0, q2: 1, q9: 0 };
         const result = calculateTestScores(answers);
         expect(result.score_phq).toBe(1);
         expect(result.isSuicidalRisk).toBe(false);
         expect(result.riskLevel).toBe('LOW');
     });

     it('calculates scores and risk level correctly (Moderate Risk)', () => {
         const answers = { q1: 1, q2: 1, q9: 0 };
         const result = calculateTestScores(answers);
         expect(result.score_phq).toBe(2);
         expect(result.isSuicidalRisk).toBe(false);
         expect(result.riskLevel).toBe('MODERATE');
     });

      it('calculates scores and risk level correctly (High Risk due to score)', () => {
         const answers = { q1: 3, q2: 3, q9: 0 };
         const result = calculateTestScores(answers);
         expect(result.score_phq).toBe(6);
         expect(result.isSuicidalRisk).toBe(false);
         expect(result.riskLevel).toBe('HIGH');
     });

     it('calculates scores and risk level correctly (High Risk due to Q9)', () => {
         const answers = { q1: 0, q2: 0, q9: 1 };
         const result = calculateTestScores(answers);
         expect(result.score_phq).toBe(1);
         expect(result.isSuicidalRisk).toBe(true);
         expect(result.riskLevel).toBe('HIGH');
     });
});
EOF

# web/src/setupTests.js (Optional, if needed by vite config)
mkdir -p web/src
cat << 'EOF' > web/src/setupTests.js
// Optional: Setup file for Vitest
// Can be used to import global mocks or setup code before tests run
// Example: import '@testing-library/jest-dom/extend-expect'; // If needed and installed separately

import '@testing-library/jest-dom'; // Import directly if using @testing-library/jest-dom

// Mock matchMedia for components relying on it (like some Headless UI components)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver if needed (e.g., for lazy loading tests)
// const mockIntersectionObserver = vi.fn();
// mockIntersectionObserver.mockReturnValue({
//   observe: () => null,
//   unobserve: () => null,
//   disconnect: () => null
// });
// window.IntersectionObserver = mockIntersectionObserver;

console.log("Vitest setup file loaded.");
EOF


# === API Files ===
echo "Creating api/ files..."

# api/package.json
cat << 'EOF' > api/package.json
{
  "name": "api",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest --coverage --detectOpenHandles",
    "lint": "eslint . --ext js --report-unused-disable-directives --max-warnings 0",
    "db:init": "node -e \"import('./db.js').then(db => db.initializeDatabase());\""
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "crypto-js": "^4.2.0",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "express-rate-limit": "^7.3.1",
    "helmet": "^7.1.0",
    "jsonwebtoken": "^9.0.2",
    "node-cron": "^3.0.3",
    "openai": "^4.52.7",
    "sequelize": "^6.37.3",
    "sqlite3": "^5.1.7",
    "swagger-ui-express": "^5.0.1"
  },
  "devDependencies": {
    "eslint": "^8.57.0",
    "jest": "^29.7.0",
    "nodemon": "^3.1.4",
    "supertest": "^7.0.0"
  },
  "jest": {
    "testEnvironment": "node",
    "coverageThreshold": {
      "global": {
        "lines": 80,
        "statements": 80,
        "functions": 80,
        "branches": 80
      }
    },
    "collectCoverageFrom": [
      "**/*.js",
      "!server.js",
      "!db.js",
      "!cron.js",
      "!coverage/**",
      "!node_modules/**",
      "!api.test.js"
    ]
  }
}
EOF

# api/server.js
cat << 'EOF' > api/server.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') });


import apiRoutes from './routes.js';
import { initializeDatabase } from './db.js';
import { startCronJobs } from './cron.js';
// Basic Swagger spec (can be expanded)
const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'MindWell API',
    version: '1.0.0',
    description: 'API for the Mental Health Assessment Platform',
  },
  servers: [
    {
      url: process.env.VITE_API_BASE_URL || `http://localhost:${process.env.PORT || 4000}`,
    },
  ],
  // Define basic paths/schemas here later if needed
   paths: {},
   components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        }
      }
    },
    security: [{
      bearerAuth: [] // Make JWT default for protected routes visually
    }]
};

const app = express();
const PORT = process.env.PORT || 4000;

// --- Database Initialization ---
initializeDatabase()
  .then(() => console.log('Database initialized successfully.'))
  .catch(err => {
      console.error('Failed to initialize database:', err);
      process.exit(1); // Exit if DB fails to initialize
   });


// --- Middlewares ---

// Security Headers
app.use(helmet());

// CORS Configuration
// Adjust origin based on your deployment needs
const allowedOrigins = process.env.NODE_ENV === 'production'
    ? ['YOUR_PRODUCTION_FRONTEND_URL'] // Add your frontend production URL here
    : ['http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // If you need cookies or authorization headers
}));


// Body Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again after 15 minutes',
});
app.use('/api', apiLimiter); // Apply to all /api routes

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
	max: 10, // Limit each IP to 10 login/register attempts per hour
	message: 'Too many authentication attempts from this IP, please try again after an hour',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/auth/login', authLimiter);
app.use('/auth/register', authLimiter);


// --- API Routes ---
app.use('/', apiRoutes); // Mount all routes defined in routes.js

// --- Swagger UI ---
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// --- Basic Root/Health Check ---
app.get('/', (req, res) => {
  res.send('MindWell API is running!');
});

// --- Global Error Handler ---
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err.stack || err);
   // Check for specific error types if needed (e.g., validation errors)
   if (err.name === 'ValidationError') { // Example for a validation library
       return res.status(400).json({ message: "Validation Failed", errors: err.errors });
   }
   // Default error response
   res.status(err.status || 500).json({
       message: err.message || 'An unexpected error occurred on the server.',
        // Only include stack trace in development
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
   });
});


// --- Start Server ---
app.listen(PORT, () => {
  console.log(`API Server listening on http://localhost:${PORT}`);
   console.log(`API Docs available at http://localhost:${PORT}/api-docs`);
   // Start Cron Jobs after server starts
   startCronJobs();
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    // Perform cleanup if needed (e.g., close DB connection gracefully)
    server.close(() => { // Assuming 'server' holds the app.listen result if needed
        console.log('HTTP server closed');
        process.exit(0);
    });
});
EOF

# api/db.js
cat << 'EOF' > api/db.js
import { Sequelize, DataTypes, Model } from 'sequelize';
import bcrypt from 'bcryptjs';
import CryptoJS from 'crypto-js';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables relative to the project root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DATABASE_URL = process.env.DATABASE_URL || 'sqlite:./api/database.sqlite';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Must be 32 bytes (64 hex chars) for AES-256

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
    console.error("FATAL ERROR: ENCRYPTION_KEY is missing or not 32 bytes (64 hex characters) long in .env file.");
    process.exit(1);
}

const encryptionKeyHex = CryptoJS.enc.Hex.parse(ENCRYPTION_KEY);

// --- Encryption Helpers ---
const encrypt = (text) => {
    if (!text) return null;
    try {
        const iv = CryptoJS.lib.WordArray.random(128 / 8); // Generate a random 16-byte IV
        const encrypted = CryptoJS.AES.encrypt(text, encryptionKeyHex, {
            iv: iv,
            mode: CryptoJS.mode.CBC, // Using CBC mode
            padding: CryptoJS.pad.Pkcs7
        });
        // Prepend IV to the ciphertext for storage, separated by ':'
        return iv.toString(CryptoJS.enc.Hex) + ':' + encrypted.toString();
    } catch (error) {
        console.error("Encryption failed:", error);
        throw new Error("Encryption failed");
    }
};

const decrypt = (encryptedText) => {
    if (!encryptedText) return null;
    try {
        const parts = encryptedText.split(':');
        if (parts.length !== 2) {
            console.error("Decryption failed: Invalid format (missing IV)");
            // Handle this case - maybe return null or throw a specific error
             // Attempting legacy decryption if no IV present (use with caution)
             const decryptedLegacy = CryptoJS.AES.decrypt(encryptedText, encryptionKeyHex, {
                 mode: CryptoJS.mode.CBC, // Assuming legacy used CBC
                 padding: CryptoJS.pad.Pkcs7
             });
             const originalTextLegacy = decryptedLegacy.toString(CryptoJS.enc.Utf8);
             if (originalTextLegacy) return originalTextLegacy; // Return if decryption worked

            return null; // Return null if format is wrong and legacy fails
        }
        const iv = CryptoJS.enc.Hex.parse(parts[0]);
        const ciphertext = parts[1];
        const decrypted = CryptoJS.AES.decrypt(ciphertext, encryptionKeyHex, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });
        return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
         // This might happen if the key is wrong or data is corrupted
        console.error("Decryption failed:", error);
        // Depending on the field, returning null or a placeholder might be appropriate
        // For sensitive fields like email, failing might be safer than returning corrupted data.
        return null; // Or throw new Error("Decryption failed");
    }
};


// --- Sequelize Singleton Instance ---
let sequelizeInstance;

const getSequelizeInstance = () => {
    if (!sequelizeInstance) {
        sequelizeInstance = new Sequelize(DATABASE_URL, {
            dialect: 'sqlite', // Explicitly set dialect
            storage: DATABASE_URL.startsWith('sqlite:') ? DATABASE_URL.substring(7) : './api/database.sqlite', // Extract path for storage
            logging: process.env.NODE_ENV === 'development' ? console.log : false, // Log SQL in dev
            define: {
                // Define global model options if needed
                timestamps: true, // Automatically add createdAt and updatedAt
            }
        });
    }
    return sequelizeInstance;
};

const sequelize = getSequelizeInstance();


// --- Model Definitions ---

class User extends Model {}
User.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true,
        },
        // Optionally encrypt email - consider implications for lookups
        // get() {
        //     const rawValue = this.getDataValue('email');
        //     return decrypt(rawValue);
        // },
        // set(value) {
        //     this.setDataValue('email', encrypt(value));
        // }
    },
    passwordHash: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    role: {
        type: DataTypes.ENUM('user', 'professional', 'admin'),
        allowNull: false,
        defaultValue: 'user',
    },
}, {
    sequelize,
    modelName: 'User',
    hooks: {
        beforeCreate: async (user) => {
            if (user.passwordHash) {
                user.passwordHash = await bcrypt.hash(user.passwordHash, 10);
            }
        },
        beforeUpdate: async (user) => {
            // Hash password only if it has changed
            if (user.changed('passwordHash')) {
                user.passwordHash = await bcrypt.hash(user.passwordHash, 10);
            }
        },
    },
});

// Instance method to check password
User.prototype.isValidPassword = async function(password) {
    return bcrypt.compare(password, this.passwordHash);
};

class Assessment extends Model {}
Assessment.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.INTEGER,
        references: {
            model: User,
            key: 'id',
        },
        allowNull: true, // Allow anonymous assessments
        onDelete: 'SET NULL', // Keep assessment if user is deleted, but anonymize
        onUpdate: 'CASCADE',
    },
    phqScore: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    gadScore: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    riskLevel: {
        type: DataTypes.ENUM('LOW', 'MODERATE', 'HIGH'),
        allowNull: false,
    },
    isSuicidalRisk: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    answers: { // Store encrypted answers JSON
        type: DataTypes.TEXT,
        allowNull: true, // Or false if always required
        get() {
            const rawValue = this.getDataValue('answers');
            const decrypted = decrypt(rawValue);
             try {
                 return decrypted ? JSON.parse(decrypted) : null;
             } catch (e) {
                 console.error("Failed to parse decrypted answers JSON:", e);
                 return null; // Return null if JSON parsing fails
             }
        },
        set(value) {
             if (value) {
                 this.setDataValue('answers', encrypt(JSON.stringify(value)));
             } else {
                 this.setDataValue('answers', null);
             }
        }
    },
    consentGiven: { // Record consent
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    }
}, {
    sequelize,
    modelName: 'Assessment',
});

class ChatMessage extends Model {}
ChatMessage.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    sessionId: { // Group messages belonging to the same conversation
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
    },
    userId: {
        type: DataTypes.INTEGER,
        references: {
            model: User,
            key: 'id',
        },
        allowNull: true, // Allow anonymous chats
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
    },
    role: {
        type: DataTypes.ENUM('user', 'assistant'),
        allowNull: false,
    },
    content: { // Consider encrypting if chat content is highly sensitive
        type: DataTypes.TEXT,
        allowNull: false,
        // get() {
        //     const rawValue = this.getDataValue('content');
        //     return decrypt(rawValue);
        // },
        // set(value) {
        //     this.setDataValue('content', encrypt(value));
        // }
    },
}, {
    sequelize,
    modelName: 'ChatMessage',
});

class Appointment extends Model {}
Appointment.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    professionalId: { // Optional: Assign to a specific professional later
        type: DataTypes.INTEGER,
        references: {
            model: User,
            key: 'id',
        },
        allowNull: true,
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
    },
    patientName: { // Can be submitted by anonymous user
        type: DataTypes.STRING,
        allowNull: false,
    },
    patientContact: { // Encrypted Email or Phone
        type: DataTypes.STRING,
        allowNull: false,
         get() {
            const rawValue = this.getDataValue('patientContact');
            return decrypt(rawValue);
        },
        set(value) {
            this.setDataValue('patientContact', encrypt(value));
        }
    },
    message: { // Encrypted Message
        type: DataTypes.TEXT,
        allowNull: true,
         get() {
            const rawValue = this.getDataValue('message');
            return decrypt(rawValue);
        },
        set(value) {
             if (value) {
                 this.setDataValue('message', encrypt(value));
             } else {
                 this.setDataValue('message', null);
             }
        }
    },
    status: {
        type: DataTypes.ENUM('pending', 'confirmed', 'cancelled', 'completed'),
        allowNull: false,
        defaultValue: 'pending',
    },
    dateTime: { // Optional: If scheduling a specific time
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    sequelize,
    modelName: 'Appointment',
});


// --- Relationships ---
User.hasMany(Assessment, { foreignKey: 'userId' });
Assessment.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(ChatMessage, { foreignKey: 'userId' });
ChatMessage.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Appointment, { foreignKey: 'professionalId', as: 'AssignedAppointments' }); // Professional assigned
Appointment.belongsTo(User, { foreignKey: 'professionalId', as: 'Professional' });

// Might add a requestedByUserId to Appointment if requests always come from logged-in users


// --- Database Initialization Function ---
const initializeDatabase = async () => {
  try {
    // Test connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Sync all models
    // Use { force: true } only in development to drop and recreate tables
    // Use { alter: true } in development to attempt to alter tables to match models (use migrations in prod)
    await sequelize.sync({ alter: process.env.NODE_ENV !== 'production' });
    console.log('All models were synchronized successfully.');

    // Optional: Seed initial data (e.g., admin user)
     await seedAdminUser();

  } catch (error) {
    console.error('Unable to initialize the database:', error);
    throw error; // Re-throw error to be caught by server startup
  }
};

// --- Seed Admin User ---
const seedAdminUser = async () => {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'password123'; // CHANGE THIS IN PRODUCTION .env

    if (!adminEmail || !adminPassword) {
        console.warn('Admin user credentials not found in environment variables. Skipping admin seed.');
        return;
    }

     try {
        const existingAdmin = await User.findOne({ where: { email: adminEmail } });
        if (!existingAdmin) {
            await User.create({
                email: adminEmail,
                passwordHash: adminPassword, // Hook will hash this before saving
                role: 'admin',
            });
            console.log(`Admin user ${adminEmail} created successfully.`);
        } else {
            console.log(`Admin user ${adminEmail} already exists.`);
        }
    } catch (error) {
        console.error('Error seeding admin user:', error);
    }
};


export {
  sequelize,
  initializeDatabase,
  User,
  Assessment,
  ChatMessage,
  Appointment,
  // Export encryption functions if needed elsewhere, but usually keep DB logic encapsulated
  // encrypt,
  // decrypt,
};
EOF

# api/routes.js
cat << 'EOF' > api/routes.js
import express from 'express';
import jwt from 'jsonwebtoken';
import { User, Assessment, ChatMessage, Appointment } from './db.js';
import { generateO4MiniResponse } from './chatbot.js';
import { Op, fn, col, literal } from 'sequelize';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';


const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET is not defined in .env file.");
    process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_FILE_PATH = path.join(__dirname, 'app.log'); // Example log file path

// --- Middleware ---

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) return res.sendStatus(401); // if there isn't any token

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error("JWT Verification Error:", err.message);
             if (err.name === 'TokenExpiredError') {
                 return res.status(401).json({ message: 'Token expired' });
             }
            return res.status(403).json({ message: 'Invalid token' }); // Forbidden if token is invalid
        }
        req.user = user; // Add user payload ({ id, email, role }) to request object
        next(); // pass the execution off to whatever request the client intended
    });
};

// Role Authorization Middleware
const authorizeRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(403).json({ message: 'Access denied. User role not found.' });
        }
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: `Access denied. Role '${req.user.role}' is not authorized.` });
        }
        next();
    };
};


// --- Authentication Routes ---

// POST /auth/register
router.post('/auth/register', async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password || password.length < 6) {
        return res.status(400).json({ message: 'Email is required and password must be at least 6 characters long.' });
    }

    try {
        const existingUser = await User.findOne({ where: { email: email } });
        if (existingUser) {
            return res.status(409).json({ message: 'Email already in use.' }); // Conflict
        }

        // Role assignment could be more complex, e.g., based on domain or invite code
        // Defaulting to 'user' here.
        const newUser = await User.create({
            email: email,
            passwordHash: password, // Let the hook handle hashing
            role: 'user' // Default role
        });

        // Exclude password hash from response
        const userResponse = { id: newUser.id, email: newUser.email, role: newUser.role };
        res.status(201).json({ message: 'User registered successfully.', user: userResponse });

    } catch (error) {
         if (error.name === 'SequelizeValidationError') {
             return res.status(400).json({ message: 'Validation error', errors: error.errors.map(e => e.message) });
         }
         next(error); // Pass other errors to the global error handler
    }
});

// POST /auth/login
router.post('/auth/login', async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        const user = await User.findOne({ where: { email: email } });

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials.' }); // Unauthorized
        }

        const isMatch = await user.isValidPassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' }); // Unauthorized
        }

        // Generate JWT Payload
        const payload = {
            id: user.id,
            email: user.email,
            role: user.role,
        };

        // Sign token
        const token = jwt.sign(
            payload,
            JWT_SECRET,
            { expiresIn: '24h' } // Token expiration time (e.g., 1 hour, 1 day)
        );

         // Exclude password hash from user object sent back
         const userResponse = { id: user.id, email: user.email, role: user.role };
        res.json({ message: 'Login successful.', token, user: userResponse });

    } catch (error) {
        next(error);
    }
});

// GET /auth/me (Protected)
router.get('/auth/me', authenticateToken, (req, res) => {
    // req.user is populated by authenticateToken middleware
    // Return user info (excluding sensitive data like passwordHash)
    res.json({
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
    });
});


// --- Assessment Routes ---

// POST /assessments
router.post('/assessments', async (req, res, next) => {
    const { userId, phqScore, gadScore, riskLevel, isSuicidalRisk, answers, consentGiven } = req.body;

    // Basic Validation
     if (consentGiven !== true) {
        return res.status(400).json({ message: 'Consent is required to save assessment data.' });
    }
     if (phqScore === undefined || gadScore === undefined || !riskLevel || isSuicidalRisk === undefined) {
         return res.status(400).json({ message: 'Missing required assessment fields (scores, riskLevel, isSuicidalRisk).' });
     }
      const validRiskLevels = ['LOW', 'MODERATE', 'HIGH'];
      if (!validRiskLevels.includes(riskLevel)) {
          return res.status(400).json({ message: 'Invalid riskLevel provided.' });
      }


    try {
         // Verify userId exists if provided
         if (userId) {
             const userExists = await User.findByPk(userId);
             if (!userExists) {
                 return res.status(400).json({ message: `User with ID ${userId} not found.` });
             }
         }

        const newAssessment = await Assessment.create({
            userId: userId || null, // Store null if anonymous
            phqScore,
            gadScore,
            riskLevel,
            isSuicidalRisk,
            answers, // Stored encrypted via setter/hook
            consentGiven: true,
        });
        res.status(201).json({ message: 'Assessment saved successfully.', assessmentId: newAssessment.id });
    } catch (error) {
        next(error);
    }
});

// GET /assessments (Protected, Pro/Admin)
router.get('/assessments', authenticateToken, authorizeRole(['professional', 'admin']), async (req, res, next) => {
    // Add filtering/pagination options
    const { limit = 20, offset = 0, riskLevel, dateFrom, dateTo, sortBy = 'createdAt', sortOrder = 'DESC' } = req.query;
    const whereClause = {};

    if (riskLevel && ['LOW', 'MODERATE', 'HIGH'].includes(riskLevel.toUpperCase())) {
        whereClause.riskLevel = riskLevel.toUpperCase();
    }
    if (dateFrom) {
        whereClause.createdAt = { ...whereClause.createdAt, [Op.gte]: new Date(dateFrom) };
    }
    if (dateTo) {
         whereClause.createdAt = { ...whereClause.createdAt, [Op.lte]: new Date(dateTo) };
    }

     const validSortOrders = ['ASC', 'DESC'];
     const order = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
     const validSortBy = ['createdAt', 'riskLevel', 'phqScore', 'gadScore']; // Add other valid fields
     const sortField = validSortBy.includes(sortBy) ? sortBy : 'createdAt';


    try {
        const { count, rows } = await Assessment.findAndCountAll({
            where: whereClause,
            include: [{ model: User, attributes: ['id', 'email'] }], // Include basic user info
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10),
            order: [[sortField, order]],
            attributes: { exclude: ['answers'] } // Exclude raw answers from list view
        });
        res.json({ totalItems: count, assessments: rows, limit, offset });
    } catch (error) {
        next(error);
    }
});


// --- Chat Routes ---

// POST /chat
router.post('/chat', async (req, res, next) => {
    const { message, userId, sessionId } = req.body; // sessionId could be managed client-side or generated here

    if (!message) {
        return res.status(400).json({ message: 'Message content is required.' });
    }

     // Simple session management: Use provided sessionId or create a new one
     const currentSessionId = sessionId || crypto.randomUUID(); // Using crypto for UUID

    try {
         // Verify userId exists if provided
         let user = null;
         if (userId) {
             user = await User.findByPk(userId);
             // Decide if chat should fail if user not found, or proceed anonymously
             // if (!user) return res.status(400).json({ message: `User with ID ${userId} not found.` });
         }

        // 1. Save user message (optional, but good for history)
        await ChatMessage.create({
            sessionId: currentSessionId,
            userId: user ? user.id : null,
            role: 'user',
            content: message,
        });

        // 2. Get AI response (Add context if needed)
        // Fetch recent messages for context (example: last 5 messages)
        const recentMessages = await ChatMessage.findAll({
             where: { sessionId: currentSessionId },
             order: [['createdAt', 'DESC']],
             limit: 5 // Adjust context window size
         });
         // Format for OpenAI API (ensure latest message is last)
        const conversationHistory = recentMessages.reverse().map(msg => ({
             role: msg.role,
             content: msg.content
        }));
        // Add current user message if not already included (edge case on first message)
        if (!conversationHistory.some(m => m.role === 'user' && m.content === message)) {
             conversationHistory.push({ role: 'user', content: message });
        }


        const botReplyContent = await generateO4MiniResponse(conversationHistory); // Pass history

        // 3. Save AI response
        await ChatMessage.create({
            sessionId: currentSessionId,
             userId: null, // Or assign to a specific Bot User ID if you have one
            role: 'assistant',
            content: botReplyContent,
        });

        // 4. Send response back to client
        res.json({ reply: botReplyContent, sessionId: currentSessionId });

    } catch (error) {
        console.error("Chat endpoint error:", error);
        if (error.message && error.message.includes('OpenAI API request failed')) {
             // Handle specific OpenAI errors if needed
             return res.status(503).json({ message: 'AI assistant is currently unavailable. Please try again later.' });
        }
        next(error); // Pass to global handler
    }
});


// --- Appointment Routes ---

// POST /appointments
router.post('/appointments', async (req, res, next) => {
    const { name, contact, message } = req.body;

    if (!name || !contact) {
        return res.status(400).json({ message: 'Name and contact information are required.' });
    }

    try {
        const newAppointment = await Appointment.create({
            patientName: name,
            patientContact: contact, // Encrypted by setter
            message: message || null, // Encrypted by setter
            status: 'pending',
        });
        res.status(201).json({ message: 'Appointment request received successfully.', appointmentId: newAppointment.id });
    } catch (error) {
        next(error);
    }
});

// GET /appointments (Protected, Pro)
router.get('/appointments', authenticateToken, authorizeRole(['professional', 'admin']), async (req, res, next) => {
     const { limit = 20, offset = 0, status, sortBy = 'createdAt', sortOrder = 'DESC' } = req.query;
     const whereClause = {};

      const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
      if (status && validStatuses.includes(status.toLowerCase())) {
          whereClause.status = status.toLowerCase();
      }

       const validSortOrders = ['ASC', 'DESC'];
       const order = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
       const validSortBy = ['createdAt', 'status', 'patientName']; // Add other valid fields
       const sortField = validSortBy.includes(sortBy) ? sortBy : 'createdAt';

    try {
         const { count, rows } = await Appointment.findAndCountAll({
              where: whereClause,
              // Optionally include assigned professional info
               // include: [{ model: User, as: 'Professional', attributes: ['id', 'email'] }],
              limit: parseInt(limit, 10),
              offset: parseInt(offset, 10),
              order: [[sortField, order]],
         });
        // Note: patientContact and message will be automatically decrypted by getters when accessed
        res.json({ totalItems: count, appointments: rows, limit, offset });
    } catch (error) {
        next(error);
    }
});

// PUT /appointments/:id (Protected, Pro)
router.put('/appointments/:id', authenticateToken, authorizeRole(['professional', 'admin']), async (req, res, next) => {
    const { id } = req.params;
    const { status, professionalId, dateTime } = req.body; // Allow updating status, assigning pro, setting time

     const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
     if (status && !validStatuses.includes(status)) {
         return res.status(400).json({ message: 'Invalid status value.' });
     }

    try {
        const appointment = await Appointment.findByPk(id);
        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found.' });
        }

        const updateData = {};
        if (status) updateData.status = status;
        if (professionalId !== undefined) updateData.professionalId = professionalId; // Allow setting null
        if (dateTime !== undefined) updateData.dateTime = dateTime; // Allow setting null

         // Optional: Check if professionalId exists if provided
         if (professionalId) {
            const professionalExists = await User.findOne({ where: { id: professionalId, role: 'professional' } });
            if (!professionalExists) {
                 return res.status(400).json({ message: `Professional user with ID ${professionalId} not found.` });
            }
        }


        await appointment.update(updateData);
        res.json({ message: 'Appointment updated successfully.', appointment });

    } catch (error) {
        next(error);
    }
});

// --- Stats Routes ---

// GET /stats (Protected, Pro/Admin)
router.get('/stats', authenticateToken, authorizeRole(['professional', 'admin']), async (req, res, next) => {
    try {
        // Example Stats:
        // 1. Counts per risk level today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const riskCountsToday = await Assessment.findAll({
            attributes: ['riskLevel', [fn('COUNT', col('id')), 'count']],
            where: {
                createdAt: {
                    [Op.gte]: today,
                }
            },
            group: ['riskLevel'],
            raw: true, // Get plain objects
        });

        const highRiskToday = riskCountsToday.find(r => r.riskLevel === 'HIGH')?.count || 0;

         // 2. Total assessments this month
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const totalAssessmentsMonth = await Assessment.count({
            where: {
                createdAt: { [Op.gte]: startOfMonth }
            }
        });

         // 3. Pending contact requests
        const newContactsPending = await Appointment.count({
             where: { status: 'pending' }
        });

        // Format results
        const stats = {
            highRiskToday: parseInt(highRiskToday, 10), // Ensure integer
            totalAssessmentsMonth: totalAssessmentsMonth,
            newContactsPending: newContactsPending,
            riskCountsToday: riskCountsToday.reduce((acc, curr) => {
                 acc[curr.riskLevel] = parseInt(curr.count, 10);
                 return acc;
             }, { HIGH: 0, MODERATE: 0, LOW: 0 }), // Ensure all levels exist
            // Add more stats as needed (e.g., trends over time)
        };

        res.json(stats);

    } catch (error) {
        next(error);
    }
});

// --- Admin Routes ---

// GET /admin/users (Protected, Admin)
router.get('/admin/users', authenticateToken, authorizeRole(['admin']), async (req, res, next) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'email', 'role', 'createdAt', 'updatedAt'], // Exclude passwordHash
            order: [['createdAt', 'DESC']],
        });
        res.json(users);
    } catch (error) {
        next(error);
    }
});

// PUT /admin/users/:id (Protected, Admin)
router.put('/admin/users/:id', authenticateToken, authorizeRole(['admin']), async (req, res, next) => {
    const { id } = req.params;
    const { role } = req.body; // Only allow updating role for now

    if (!role || !['user', 'professional', 'admin'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role provided.' });
    }

     if (parseInt(id, 10) === req.user.id && role !== 'admin') {
         return res.status(400).json({ message: 'Admin cannot remove their own admin role.' });
     }

    try {
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        user.role = role;
        await user.save();

        const userResponse = { id: user.id, email: user.email, role: user.role };
        res.json({ message: 'User role updated successfully.', user: userResponse });
    } catch (error) {
        next(error);
    }
});

// DELETE /admin/users/:id (Protected, Admin)
router.delete('/admin/users/:id', authenticateToken, authorizeRole(['admin']), async (req, res, next) => {
    const { id } = req.params;

     // Prevent admin from deleting themselves
    if (parseInt(id, 10) === req.user.id) {
        return res.status(400).json({ message: "Admin cannot delete their own account." });
    }

    try {
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        await user.destroy(); // This will trigger onDelete:'SET NULL' in related tables
        res.status(200).json({ message: 'User deleted successfully.' }); // OK or No Content (204)

    } catch (error) {
        next(error);
    }
});

// POST /admin/backup (Protected, Admin) - Basic example: Copy SQLite file
router.post('/admin/backup', authenticateToken, authorizeRole(['admin']), async (req, res, next) => {
     const dbPath = path.resolve(__dirname, process.env.DATABASE_URL.substring(7)); // Assuming 'sqlite:./api/database.sqlite'
     const backupDir = path.resolve(__dirname, 'backups');
     const backupFileName = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite`;
     const backupPath = path.join(backupDir, backupFileName);

     try {
         await fs.mkdir(backupDir, { recursive: true }); // Ensure backup directory exists
         await fs.copyFile(dbPath, backupPath);
         console.log(`Database backup created at: ${backupPath}`);
         res.status(200).json({ message: `Backup created successfully: ${backupFileName}` });
     } catch (error) {
         console.error('Backup failed:', error);
         next(new Error('Database backup failed. Check server logs.'));
     }
});

// POST /admin/anonymize (Protected, Admin) - Triggers the cron job logic manually
router.post('/admin/anonymize', authenticateToken, authorizeRole(['admin']), async (req, res, next) => {
     try {
         // Import the function dynamically to avoid circular dependencies if cron imports db
         const { anonymizeOldAssessments } = await import('./cron.js');
         console.log("Manually triggering anonymization task...");
         // Run the task immediately, don't wait for schedule
         await anonymizeOldAssessments(true); // Pass a flag to indicate manual trigger if needed
         res.status(200).json({ message: 'Anonymization task triggered successfully.' });
     } catch (error) {
         console.error('Manual anonymization trigger failed:', error);
         next(new Error('Failed to trigger anonymization task.'));
     }
});

// GET /admin/logs (Protected, Admin) - Basic example: Read last N lines from a log file
router.get('/admin/logs', authenticateToken, authorizeRole(['admin']), async (req, res, next) => {
     const logLinesLimit = parseInt(req.query.limit || 100, 10);

     try {
         // Check if log file exists
          try {
             await fs.access(LOG_FILE_PATH);
         } catch (e) {
              // File doesn't exist
              return res.json({ logs: ["Log file not found or not created yet."] });
          }


         const data = await fs.readFile(LOG_FILE_PATH, 'utf-8');
         const lines = data.split('\n').filter(line => line.trim() !== ''); // Split and remove empty lines
         const recentLines = lines.slice(-logLinesLimit); // Get the last N lines
         res.json({ logs: recentLines });
     } catch (error) {
         console.error('Error reading log file:', error);
         next(new Error('Failed to retrieve logs.'));
     }
});


export default router;
EOF

# api/chatbot.js
cat << 'EOF' > api/chatbot.js
import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables relative to the project root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
    console.warn("Warning: OPENAI_API_KEY not found in .env. Chatbot functionality will be disabled.");
}

let openai;
if (OPENAI_API_KEY) {
     openai = new OpenAI({
       apiKey: OPENAI_API_KEY,
     });
} else {
    openai = null; // Explicitly set to null if key is missing
}

// Define the Bot's Persona and Instructions
const BOT_INSTRUCTIONS = `
You are 'MindGuide', a compassionate and supportive AI assistant focused on mental well-being.
Your primary role is to offer a listening ear, provide general information about mental health topics (like stress, anxiety, low mood), and explain how the self-assessment questionnaires (PHQ-9 for depression, GAD-7 for anxiety) work.
Encourage users to take the assessment if they express concerns related to mood or anxiety.
If a user's message indicates immediate distress or mentions self-harm, prioritize responding with empathy and immediately suggest contacting emergency services or a crisis hotline (provide generic examples like 'emergency services in your area' or 'a mental health crisis line') and gently guide them away from continuing the chat for crisis support.
You must not provide medical diagnoses, therapy, or specific treatment plans. Offer supportive statements and general information only.
Keep responses concise (under 150 words ideally), empathetic, and helpful.
Maintain a calm, understanding, and non-judgmental tone.
Do not ask for Personally Identifiable Information (PII).
If asked about topics outside mental well-being or the website's function, politely steer the conversation back or state you cannot help with that topic.
`;


/**
 * Generates a response using the OpenAI o4-mini model.
 * @param {Array<{role: 'user' | 'assistant' | 'system', content: string}>} conversationHistory - The conversation history, including the latest user message.
 * @param {string} reasoningEffort - The reasoning effort parameter for the API ('auto', 'low', 'high'). Defaults to 'auto'.
 * @returns {Promise<string>} The generated response text.
 * @throws {Error} If the OpenAI API request fails or the API key is missing.
 */
const generateO4MiniResponse = async (conversationHistory, reasoningEffort = 'auto') => {
    if (!openai) {
         console.error("OpenAI client not initialized. Check API Key.");
         // Fallback response or throw error
         return "I apologize, but I'm currently unable to process requests. My connection to the AI service is unavailable.";
         // Or: throw new Error("OpenAI client not initialized. API Key might be missing.");
    }

    if (!conversationHistory || conversationHistory.length === 0) {
        throw new Error("Conversation history cannot be empty.");
    }

    // Prepare messages for the API, including the system prompt
    const messages = [
        { role: "system", content: BOT_INSTRUCTIONS },
        ...conversationHistory // Spread the existing conversation history
    ];

    console.log("Sending to OpenAI:", JSON.stringify(messages, null, 2)); // Log request payload for debugging

    try {
        const completion = await openai.chat.completions.create({
            model: "o4-mini", // Use o4-mini as specified
            messages: messages,
            temperature: 0.7, // Adjust temperature for creativity vs. predictability
            max_tokens: 200, // Limit response length
            // Pass the reasoning_effort parameter as an extra body parameter
            extra_body: {
                reasoning_effort: reasoningEffort
            }
        });

        console.log("Received from OpenAI:", JSON.stringify(completion, null, 2)); // Log response for debugging


        // Extract the response content
        const replyContent = completion.choices[0]?.message?.content?.trim();

        if (!replyContent) {
            console.error("OpenAI response missing content:", completion);
            throw new Error("Received an empty response from the AI assistant.");
        }

        return replyContent;

    } catch (error) {
        console.error("OpenAI API request failed:", error.response ? error.response.data : error.message);
         // Provide a more specific error message if possible
         let errorMessage = "An error occurred while communicating with the AI assistant.";
         if (error.response?.status === 401) {
             errorMessage = "AI assistant authentication failed. Please check the API key.";
         } else if (error.response?.status === 429) {
             errorMessage = "AI assistant is currently experiencing high traffic. Please try again shortly.";
         } else if (error.message) {
             // Include OpenAI's error message if available and seems safe to expose
              errorMessage = `AI assistant error: ${error.message}`;
         }
        throw new Error(errorMessage); // Re-throw a potentially more user-friendly error
    }
};

export { generateO4MiniResponse };
EOF

# api/cron.js
cat << 'EOF' > api/cron.js
import cron from 'node-cron';
import { Assessment, sequelize } from './db.js'; // Import necessary model and sequelize instance
import { Op } from 'sequelize';
import fs from 'fs'; // Import fs for logging
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_FILE_PATH = path.join(__dirname, 'app.log'); // Central log file

// --- Logging Helper ---
const logToFile = (message) => {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} - ${message}\n`;
    try {
        fs.appendFileSync(LOG_FILE_PATH, logMessage);
        console.log(logMessage.trim()); // Also log to console
    } catch (err) {
        console.error('Failed to write to log file:', err);
    }
};


// --- Cron Job Definitions ---

/**
 * Anonymizes old assessment records based on retention policy (e.g., 12 months).
 * Sets userId and answers to NULL.
 * @param {boolean} manualTrigger - Indicates if the job was triggered manually (for logging purposes).
 */
const anonymizeOldAssessments = async (manualTrigger = false) => {
    const triggerType = manualTrigger ? 'Manual' : 'Scheduled';
    logToFile(`[Cron - ${triggerType}] Starting anonymization task...`);
    const retentionMonths = 12;
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - retentionMonths);

    try {
        const [affectedCount] = await Assessment.update(
            {
                userId: null,
                answers: null, // Nullify encrypted answers
                // Optionally add an 'anonymizedAt' timestamp field
                // anonymizedAt: new Date()
            },
            {
                where: {
                    createdAt: {
                        [Op.lt]: cutoffDate, // Less than the cutoff date
                    },
                    [Op.or]: [ // Only update if not already anonymized
                        { userId: { [Op.ne]: null } },
                        { answers: { [Op.ne]: null } }
                    ]
                    // If using anonymizedAt field:
                    // anonymizedAt: { [Op.is]: null }
                },
                // hooks: false // Potentially skip hooks if they interfere with nullifying
            }
        );

        if (affectedCount > 0) {
            logToFile(`[Cron - ${triggerType}] Successfully anonymized ${affectedCount} assessments older than ${cutoffDate.toISOString()}.`);
        } else {
             logToFile(`[Cron - ${triggerType}] No assessments required anonymization.`);
        }
    } catch (error) {
        logToFile(`[Cron - ${triggerType}] Error during assessment anonymization: ${error.message}\n${error.stack}`);
    }
};

/**
 * Calculates daily statistics (example: assessment counts per risk level).
 * In this simple setup, it just logs the counts. Could be extended to save to a DailyStats table.
 * @param {boolean} manualTrigger - Indicates if the job was triggered manually.
 */
const calculateDailyStats = async (manualTrigger = false) => {
     const triggerType = manualTrigger ? 'Manual' : 'Scheduled';
     logToFile(`[Cron - ${triggerType}] Starting daily stats calculation task...`);
     const todayStart = new Date();
     todayStart.setHours(0, 0, 0, 0);
     const todayEnd = new Date();
     todayEnd.setHours(23, 59, 59, 999);

     try {
         const stats = await Assessment.findAll({
             attributes: [
                 'riskLevel',
                 [sequelize.fn('COUNT', sequelize.col('id')), 'count']
             ],
             where: {
                 createdAt: {
                     [Op.between]: [todayStart, todayEnd],
                 },
             },
             group: ['riskLevel'],
             raw: true,
         });

         const counts = { LOW: 0, MODERATE: 0, HIGH: 0 };
         stats.forEach(stat => {
             counts[stat.riskLevel] = parseInt(stat.count, 10);
         });

         logToFile(`[Cron - ${triggerType}] Daily Stats (${todayStart.toISOString().split('T')[0]}): LOW=${counts.LOW}, MODERATE=${counts.MODERATE}, HIGH=${counts.HIGH}`);

         // TODO: Optionally save these stats to a 'DailyStats' table
         // await DailyStats.create({ date: todayStart, lowCount: counts.LOW, ... });

     } catch (error) {
          logToFile(`[Cron - ${triggerType}] Error calculating daily stats: ${error.message}\n${error.stack}`);
     }
};


// --- Job Scheduling ---
const scheduledJobs = [];

const startCronJobs = () => {
    logToFile("Initializing cron jobs...");

    // Schedule anonymization task (e.g., daily at 3:00 AM server time)
    // Cron format: second minute hour day-of-month month day-of-week
    const anonymizeJob = cron.schedule('0 3 * * *', () => anonymizeOldAssessments(false), {
        scheduled: true,
        timezone: "Etc/UTC" // Specify timezone, e.g., "America/New_York" or UTC
    });
    scheduledJobs.push(anonymizeJob);
    logToFile("Scheduled 'anonymizeOldAssessments' job for 03:00 UTC daily.");


    // Schedule daily stats calculation (e.g., daily at 00:05 AM server time)
     const statsJob = cron.schedule('5 0 * * *', () => calculateDailyStats(false), {
         scheduled: true,
         timezone: "Etc/UTC"
     });
     scheduledJobs.push(statsJob);
     logToFile("Scheduled 'calculateDailyStats' job for 00:05 UTC daily.");


    logToFile(`Started ${scheduledJobs.length} cron jobs.`);
};

const stopCronJobs = () => {
    logToFile("Stopping cron jobs...");
    scheduledJobs.forEach(job => job.stop());
    logToFile("All cron jobs stopped.");
};

// Export functions for potential manual triggering or testing
export { startCronJobs, stopCronJobs, anonymizeOldAssessments, calculateDailyStats };
EOF


# api/api.test.js (Basic Jest + Supertest setup)
cat << 'EOF' > api/api.test.js
import request from 'supertest';
import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env before importing modules that rely on it
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });


// Mock dependencies BEFORE importing modules that use them
const mockGenerateO4MiniResponse = jest.fn();
jest.mock('./chatbot.js', () => ({
    generateO4MiniResponse: mockGenerateO4MiniResponse,
}));

// Mock DB operations if needed, or use a test database
// For simplicity here, we assume the real DB functions (initializeDatabase, models) work,
// but ideally, you'd mock the DB interactions for unit/integration tests not hitting the actual DB.
// This setup will hit the actual SQLite file defined in .env during tests.
// Consider using an in-memory SQLite DB for tests: process.env.DATABASE_URL = 'sqlite::memory:';

import apiRoutes from './routes.js'; // Import routes AFTER mocks
import { sequelize, initializeDatabase, User, Assessment } from './db.js'; // Import DB utils
import jwt from 'jsonwebtoken'; // Import jwt to create test tokens


// --- Test Setup ---
const app = express();
app.use(express.json()); // Need body parser for tests
app.use('/', apiRoutes); // Mount the routes


let testUser;
let testToken;
let adminToken;


// Before all tests, initialize the database and create test users/tokens
beforeAll(async () => {
     // Ensure using a test database (e.g., in-memory or a specific test file)
    // process.env.DATABASE_URL = 'sqlite::memory:'; // Set before initializing
    try {
        await initializeDatabase(); // Sync models

        // Clean up potentially existing users from previous runs if needed
        await User.destroy({ where: { email: ['test@example.com', 'admin@example.com'] }});

        // Create a regular test user
        testUser = await User.create({
            email: 'test@example.com',
            passwordHash: 'password123', // Hook will hash
            role: 'user'
        });

         // Create an admin test user
         const adminUser = await User.create({
             email: 'admin@example.com',
             passwordHash: 'adminpass', // Hook will hash
             role: 'admin'
         });


        // Generate tokens for tests
        testToken = jwt.sign({ id: testUser.id, email: testUser.email, role: testUser.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        adminToken = jwt.sign({ id: adminUser.id, email: adminUser.email, role: adminUser.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

    } catch (error) {
        console.error("Test setup failed:", error);
        throw error; // Fail tests if setup doesn't work
    }
});

// After all tests, close the database connection
afterAll(async () => {
    await sequelize.close();
});

// Reset mocks before each test
beforeEach(() => {
    mockGenerateO4MiniResponse.mockReset();
});

// --- Test Suites ---

describe('Authentication API (/auth)', () => {
    it('POST /auth/register - should register a new user successfully', async () => {
        const newUserEmail = `newuser_${Date.now()}@example.com`;
        const res = await request(app)
            .post('/auth/register')
            .send({ email: newUserEmail, password: 'password123' });

        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('message', 'User registered successfully.');
        expect(res.body).toHaveProperty('user');
        expect(res.body.user.email).toEqual(newUserEmail);
         expect(res.body.user).not.toHaveProperty('passwordHash');

         // Clean up created user
         await User.destroy({where: { email: newUserEmail }});
    });

     it('POST /auth/register - should fail if email is already in use', async () => {
         const res = await request(app)
             .post('/auth/register')
             .send({ email: 'test@example.com', password: 'password123' }); // Use existing test user

         expect(res.statusCode).toEqual(409);
         expect(res.body).toHaveProperty('message', 'Email already in use.');
     });

      it('POST /auth/register - should fail with weak password', async () => {
         const res = await request(app)
             .post('/auth/register')
             .send({ email: 'weakpass@example.com', password: '123' });
         expect(res.statusCode).toEqual(400);
         expect(res.body).toHaveProperty('message', expect.stringContaining('password must be at least 6 characters'));
     });


    it('POST /auth/login - should login the test user and return a token', async () => {
        const res = await request(app)
            .post('/auth/login')
            .send({ email: 'test@example.com', password: 'password123' }); // Correct password

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('message', 'Login successful.');
        expect(res.body).toHaveProperty('token');
        expect(res.body).toHaveProperty('user');
        expect(res.body.user.email).toEqual('test@example.com');
         expect(res.body.user.role).toEqual('user');
         expect(res.body.user).not.toHaveProperty('passwordHash');
    });

     it('POST /auth/login - should fail with incorrect password', async () => {
         const res = await request(app)
             .post('/auth/login')
             .send({ email: 'test@example.com', password: 'wrongpassword' });

         expect(res.statusCode).toEqual(401);
         expect(res.body).toHaveProperty('message', 'Invalid credentials.');
     });

     it('POST /auth/login - should fail for non-existent user', async () => {
          const res = await request(app)
             .post('/auth/login')
             .send({ email: 'nosuchuser@example.com', password: 'password123' });
          expect(res.statusCode).toEqual(401); // Or 404 depending on implementation, 401 is common
          expect(res.body).toHaveProperty('message', 'Invalid credentials.');
     });


    it('GET /auth/me - should return user info for a valid token', async () => {
        const res = await request(app)
            .get('/auth/me')
            .set('Authorization', `Bearer ${testToken}`); // Use the generated token

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('id', testUser.id);
        expect(res.body).toHaveProperty('email', testUser.email);
        expect(res.body).toHaveProperty('role', testUser.role);
    });

    it('GET /auth/me - should return 401 if no token is provided', async () => {
        const res = await request(app).get('/auth/me');
        expect(res.statusCode).toEqual(401);
    });

    it('GET /auth/me - should return 403 if token is invalid/malformed', async () => {
        const res = await request(app)
            .get('/auth/me')
            .set('Authorization', 'Bearer invalidtoken123');
        expect(res.statusCode).toEqual(403);
         expect(res.body).toHaveProperty('message', 'Invalid token');
    });

     it('GET /auth/me - should return 401 if token is expired', async () => {
         // Create an expired token
         const expiredToken = jwt.sign({ id: testUser.id, email: testUser.email, role: testUser.role }, process.env.JWT_SECRET, { expiresIn: '-1s' });
         const res = await request(app)
             .get('/auth/me')
             .set('Authorization', `Bearer ${expiredToken}`);
         expect(res.statusCode).toEqual(401);
         expect(res.body).toHaveProperty('message', 'Token expired');
     });

});


describe('Assessment API (/assessments)', () => {
     let createdAssessmentId;

     it('POST /assessments - should save an anonymous assessment with consent', async () => {
         const assessmentData = {
             phqScore: 15,
             gadScore: 12,
             riskLevel: 'MODERATE',
             isSuicidalRisk: false,
             // answers: { q1: 3, q2: 2, ... }, // Optional answers, ensure encryption works
             consentGiven: true
         };
         const res = await request(app)
             .post('/assessments')
             .send(assessmentData);

         expect(res.statusCode).toEqual(201);
         expect(res.body).toHaveProperty('message', 'Assessment saved successfully.');
         expect(res.body).toHaveProperty('assessmentId');
         createdAssessmentId = res.body.assessmentId; // Save for potential cleanup

         // Verify in DB (optional but good)
         const savedAssessment = await Assessment.findByPk(createdAssessmentId);
         expect(savedAssessment).not.toBeNull();
         expect(savedAssessment.userId).toBeNull();
         expect(savedAssessment.phqScore).toBe(15);
         expect(savedAssessment.riskLevel).toBe('MODERATE');
          expect(savedAssessment.consentGiven).toBe(true);

          // Cleanup
          await Assessment.destroy({where: {id: createdAssessmentId}});

     });

      it('POST /assessments - should save an assessment for a logged-in user with consent', async () => {
         const assessmentData = {
             userId: testUser.id, // Associate with test user
             phqScore: 22,
             gadScore: 18,
             riskLevel: 'HIGH',
             isSuicidalRisk: true,
             consentGiven: true
         };
         const res = await request(app)
             .post('/assessments')
              // No token needed for this specific endpoint as designed (allows anonymous)
             .send(assessmentData);

         expect(res.statusCode).toEqual(201);
          expect(res.body).toHaveProperty('assessmentId');
          const savedId = res.body.assessmentId;

          // Verify in DB
          const savedAssessment = await Assessment.findByPk(savedId);
          expect(savedAssessment).not.toBeNull();
          expect(savedAssessment.userId).toBe(testUser.id);
          expect(savedAssessment.riskLevel).toBe('HIGH');
          expect(savedAssessment.isSuicidalRisk).toBe(true);
          expect(savedAssessment.consentGiven).toBe(true);

          // Cleanup
          await Assessment.destroy({where: {id: savedId}});
      });


     it('POST /assessments - should fail if consent is not given', async () => {
         const assessmentData = {
             phqScore: 5, gadScore: 3, riskLevel: 'LOW', isSuicidalRisk: false, consentGiven: false
         };
          const res = await request(app)
             .post('/assessments')
             .send(assessmentData);
          expect(res.statusCode).toEqual(400);
          expect(res.body).toHaveProperty('message', 'Consent is required to save assessment data.');
     });

      it('POST /assessments - should fail if required fields are missing', async () => {
           const assessmentData = { phqScore: 5, consentGiven: true }; // Missing fields
           const res = await request(app)
              .post('/assessments')
              .send(assessmentData);
           expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('message', expect.stringContaining('Missing required assessment fields'));
      });

      it('POST /assessments - should fail if riskLevel is invalid', async () => {
            const assessmentData = {
                 phqScore: 5, gadScore: 3, riskLevel: 'MEDIUM', isSuicidalRisk: false, consentGiven: true
            };
           const res = await request(app)
              .post('/assessments')
              .send(assessmentData);
           expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('message', 'Invalid riskLevel provided.');
       });


     it('GET /assessments - should return 401 for unauthenticated user', async () => {
         const res = await request(app).get('/assessments');
         expect(res.statusCode).toEqual(401);
     });

      it('GET /assessments - should return 403 for user with incorrect role (user)', async () => {
          const res = await request(app)
              .get('/assessments')
              .set('Authorization', `Bearer ${testToken}`); // Regular user token
          expect(res.statusCode).toEqual(403);
          expect(res.body).toHaveProperty('message', expect.stringContaining('not authorized'));
      });


     it('GET /assessments - should return list of assessments for admin user', async () => {
          // Create a dummy assessment first
          const tempAssessment = await Assessment.create({ phqScore: 10, gadScore: 8, riskLevel: 'MODERATE', isSuicidalRisk: false, consentGiven: true });

          const res = await request(app)
             .get('/assessments')
             .set('Authorization', `Bearer ${adminToken}`); // Use admin token

         expect(res.statusCode).toEqual(200);
         expect(res.body).toHaveProperty('assessments');
         expect(Array.isArray(res.body.assessments)).toBe(true);
          expect(res.body.assessments.length).toBeGreaterThanOrEqual(1); // Should include the one we created
          expect(res.body.assessments[0]).not.toHaveProperty('answers'); // Ensure answers are excluded by default

          // Cleanup
          await Assessment.destroy({where: {id: tempAssessment.id}});
     });

      // Add tests for filtering/pagination if implemented in GET /assessments
       it('GET /assessments - should filter by riskLevel', async () => {
           // Create assessments with different risks
           const highRisk = await Assessment.create({ phqScore: 20, gadScore: 15, riskLevel: 'HIGH', isSuicidalRisk: false, consentGiven: true });
           const lowRisk = await Assessment.create({ phqScore: 2, gadScore: 1, riskLevel: 'LOW', isSuicidalRisk: false, consentGiven: true });

           const res = await request(app)
               .get('/assessments?riskLevel=HIGH')
               .set('Authorization', `Bearer ${adminToken}`);

           expect(res.statusCode).toEqual(200);
           expect(res.body.assessments).toHaveLength(1);
           expect(res.body.assessments[0].id).toEqual(highRisk.id);
            expect(res.body.assessments[0].riskLevel).toEqual('HIGH');

            // Cleanup
            await Assessment.destroy({where: {id: [highRisk.id, lowRisk.id]}});
       });

});

describe('Chat API (/chat)', () => {
    it('POST /chat - should return a mock bot response', async () => {
        const userMessage = 'Hello there!';
        const mockReply = 'Hello! This is MindGuide. How can I help?';
        mockGenerateO4MiniResponse.mockResolvedValue(mockReply); // Setup mock response

        const res = await request(app)
            .post('/chat')
            .send({ message: userMessage });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('reply', mockReply);
        expect(res.body).toHaveProperty('sessionId'); // Ensure session ID is returned
        expect(mockGenerateO4MiniResponse).toHaveBeenCalledTimes(1);
         // Check if the conversation history passed includes the user message
         expect(mockGenerateO4MiniResponse).toHaveBeenCalledWith(
             expect.arrayContaining([
                 expect.objectContaining({ role: 'user', content: userMessage })
             ]),
             'auto' // Default reasoning effort
         );
    });

     it('POST /chat - should handle OpenAI API errors gracefully', async () => {
         const userMessage = 'Tell me something';
          const errorMessage = 'AI assistant is currently unavailable.';
         mockGenerateO4MiniResponse.mockRejectedValue(new Error(errorMessage)); // Simulate API error

         const res = await request(app)
             .post('/chat')
             .send({ message: userMessage });

          // Depending on error handler, could be 500 or 503
         expect(res.statusCode).toBeGreaterThanOrEqual(500);
         expect(res.body).toHaveProperty('message', expect.stringContaining('AI assistant')); // Check for user-friendly message
     });

     it('POST /chat - should fail if message is missing', async () => {
          const res = await request(app)
             .post('/chat')
             .send({}); // No message field
          expect(res.statusCode).toEqual(400);
          expect(res.body).toHaveProperty('message', 'Message content is required.');
      });

      // TODO: Test chat history context passing
      // TODO: Test user association (sending userId)
});


// --- Add tests for Appointments, Stats, and Admin routes ---
// These would follow a similar pattern:
// 1. Check authentication/authorization (401, 403 errors)
// 2. Check successful operation (200, 201, 204 status codes)
// 3. Check expected response body/data
// 4. Check input validation (400 errors)
// 5. Check not found errors (404)
// 6. Mock external dependencies or DB calls if needed for isolation

describe('Admin API (/admin)', () => {
    let tempUserId;

     beforeAll(async () => {
        // Create a temporary user for manipulation in admin tests
         const tempUser = await User.create({ email: 'tempuser@example.com', passwordHash: 'temppass', role: 'user' });
         tempUserId = tempUser.id;
     });

     afterAll(async () => {
         // Clean up the temporary user
         await User.destroy({ where: { id: tempUserId } });
     });


    it('GET /admin/users - should return 401 for unauthenticated', async () => {
        const res = await request(app).get('/admin/users');
        expect(res.statusCode).toBe(401);
    });

    it('GET /admin/users - should return 403 for non-admin user', async () => {
         const res = await request(app)
             .get('/admin/users')
             .set('Authorization', `Bearer ${testToken}`); // Regular user token
         expect(res.statusCode).toBe(403);
     });

    it('GET /admin/users - should return list of users for admin', async () => {
        const res = await request(app)
            .get('/admin/users')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        // Should contain at least the admin and the temp user
        expect(res.body.length).toBeGreaterThanOrEqual(2);
         expect(res.body[0]).not.toHaveProperty('passwordHash');
    });

     it('PUT /admin/users/:id - should update user role for admin', async () => {
         const res = await request(app)
             .put(`/admin/users/${tempUserId}`)
             .set('Authorization', `Bearer ${adminToken}`)
             .send({ role: 'professional' });

         expect(res.statusCode).toBe(200);
         expect(res.body.user.role).toBe('professional');

         // Verify in DB
         const updatedUser = await User.findByPk(tempUserId);
         expect(updatedUser.role).toBe('professional');
     });

     it('PUT /admin/users/:id - should fail if role is invalid', async () => {
          const res = await request(app)
             .put(`/admin/users/${tempUserId}`)
             .set('Authorization', `Bearer ${adminToken}`)
             .send({ role: 'superadmin' }); // Invalid role
           expect(res.statusCode).toBe(400);
           expect(res.body).toHaveProperty('message', 'Invalid role provided.');
      });

       it('PUT /admin/users/:id - should fail if admin tries to remove own admin role', async () => {
           const adminUser = await User.findOne({where: {email: 'admin@example.com'}});
           const res = await request(app)
              .put(`/admin/users/${adminUser.id}`)
              .set('Authorization', `Bearer ${adminToken}`)
              .send({ role: 'user' });
           expect(res.statusCode).toBe(400);
           expect(res.body).toHaveProperty('message', 'Admin cannot remove their own admin role.');
       });


     it('DELETE /admin/users/:id - should delete user for admin', async () => {
         // Create another temp user specifically for deletion test
         const userToDelete = await User.create({ email: 'delete_me@example.com', passwordHash: 'pass', role: 'user' });

         const res = await request(app)
             .delete(`/admin/users/${userToDelete.id}`)
             .set('Authorization', `Bearer ${adminToken}`);

         expect(res.statusCode).toBe(200); // Or 204 if no content
         expect(res.body).toHaveProperty('message', 'User deleted successfully.');

         // Verify deletion in DB
         const deletedUser = await User.findByPk(userToDelete.id);
         expect(deletedUser).toBeNull();
     });

      it('DELETE /admin/users/:id - should fail if admin tries to delete self', async () => {
          const adminUser = await User.findOne({where: {email: 'admin@example.com'}});
          const res = await request(app)
             .delete(`/admin/users/${adminUser.id}`)
             .set('Authorization', `Bearer ${adminToken}`);
          expect(res.statusCode).toBe(400);
           expect(res.body).toHaveProperty('message', 'Admin cannot delete their own account.');
       });

       it('DELETE /admin/users/:id - should return 404 for non-existent user', async () => {
            const nonExistentId = 99999;
            const res = await request(app)
               .delete(`/admin/users/${nonExistentId}`)
               .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toBe(404);
       });


     // Add tests for Backup, Anonymize, Logs endpoints if implemented robustly
     it('POST /admin/backup - should return success for admin', async () => {
        const res = await request(app)
            .post('/admin/backup')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.message).toContain('Backup created successfully');
        // TODO: Verify file was actually created (requires fs mocks or actual fs operations)
     });

      it('POST /admin/anonymize - should return success for admin', async () => {
          // Mock or spy on the actual anonymizeOldAssessments function if needed
          // For now, just test the endpoint response
          const res = await request(app)
              .post('/admin/anonymize')
              .set('Authorization', `Bearer ${adminToken}`);
          expect(res.statusCode).toBe(200);
          expect(res.body.message).toContain('Anonymization task triggered successfully');
      });

     // GET /admin/logs test would likely require mocking fs.readFile or ensuring a log file exists
});
EOF

# === GitHub Actions Workflow ===
echo "Creating GitHub Actions workflow..."

# .github/workflows/ci.yml
cat << 'EOF' > .github/workflows/ci.yml
name: Node.js CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18.x, 20.x] # Test against latest LTS versions

    steps:
    - name: Checkout repository
      uses: actions/checkout@v4

    - name: Set up Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm' # Cache npm dependencies

    - name: Install dependencies (Root & Workspaces)
      run: npm run install:all # Use the custom script from root package.json

    - name: Lint project
      run: npm run lint --workspaces --if-present

    - name: Run tests (Web & API)
      run: npm test --workspaces --if-present
      env:
        # Set dummy env vars required for tests (API mainly)
        # Secrets should NOT be hardcoded here. Use GitHub secrets for real keys if needed for integration tests.
        CI: true # Often disables watch modes etc.
        PORT: 4001 # Use a different port for tests if needed
        DATABASE_URL: sqlite::memory: # Use in-memory DB for tests
        JWT_SECRET: test-jwt-secret-for-ci-dont-use-in-prod
        ENCRYPTION_KEY: 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef # 64 hex chars / 32 bytes
        OPENAI_API_KEY: dummy-openai-key-for-ci # Mock should prevent actual calls

    # Optional: Check test coverage (if reports are generated)
    # - name: Upload API coverage reports
    #   uses: actions/upload-artifact@v3
    #   with:
    #     name: api-coverage-report-${{ matrix.node-version }}
    #     path: api/coverage/lcov.info # Adjust path if needed

    - name: Build project (Web & API)
      run: npm run build --workspaces --if-present
      env:
         # Required for Vite build accessing env vars
         VITE_API_BASE_URL: http://localhost:4000 # Or your production API URL

    # Optional: Deploy step (if configured)
    # - name: Deploy to production
    #   if: github.ref == 'refs/heads/main' && matrix.node-version == '20.x' # Deploy only from main branch on latest LTS
    #   run: |
    #     echo "Deploying application..."
    #     # Add your deployment script here (e.g., scp, rsync, serverless deploy)

EOF

# === Final Steps ===
echo "Running npm install in root, web, and api..."
npm install
npm install --workspace=web
npm install --workspace=api

# Add execute permissions to the script itself in case it needs to be run again
chmod +x setup.sh

echo ""
echo "================================================"
echo "Setup Complete!"
echo "================================================"
echo "IMPORTANT NEXT STEPS:"
echo "1. Edit the '.env' file in the root directory."
echo "   - Replace 'YOUR_OPENAI_API_KEY_CHANGE_ME' with your actual OpenAI API key."
echo "   - Replace 'YOUR_STRONG_JWT_SECRET_CHANGE_ME' with a strong, random secret."
echo "   - Replace 'YOUR_STRONG_ENCRYPTION_KEY_32BYTES' with a secure 32-byte (64 hex chars) key."
echo "   - Optionally change ADMIN_EMAIL/ADMIN_PASSWORD for the initial admin user."
echo "2. Create PWA icons (e.g., pwa-192x192.png, pwa-512x512.png) in 'web/public/' (or adjust vite.config.js)."
echo "3. Run the application locally using: npm run dev"
echo "   - Frontend will be available at http://localhost:5173"
echo "   - Backend API will be available at http://localhost:4000"
echo "4. To run tests: npm test"
echo "5. To run linting: npm run lint"
echo "6. To build for production: npm run build"
echo "================================================"

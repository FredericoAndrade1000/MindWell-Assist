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


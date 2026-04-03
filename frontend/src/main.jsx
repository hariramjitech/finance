import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter as Router } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.jsx'
import './index.css'

import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { AuthProvider } from './context/AuthContext.jsx'
import toast from 'react-hot-toast'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      console.error('Global Query Error:', error);
      // Only show toast for 5xx errors or visible network issues (not 404s usually)
      if (error?.response?.status >= 500) {
        toast.error(`Server Error: ${error.message}`);
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      console.error('Global Mutation Error:', error);
      // Consume the error message from backend if available
      const message = error?.response?.data?.message || error.message || 'Something went wrong';
      toast.error(message);
    },
  }),
})

const persister = createSyncStoragePersister({
  storage: window.localStorage,
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <HelmetProvider>
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
      <Router>
        <AuthProvider>
          <App />
        </AuthProvider>
      </Router>
    </PersistQueryClientProvider>
  </HelmetProvider>
)
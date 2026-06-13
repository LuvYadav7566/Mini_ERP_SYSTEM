import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import StockLedger from './pages/StockLedger';
import Purchase from './pages/Purchase';
import BoM from './pages/BoM';
import Manufacturing from './pages/Manufacturing';
import Sales from './pages/Sales';

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-darkBg flex items-center justify-center text-cyan-400 font-mono tracking-wider">
        VALIDATING SESSION...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <SocketProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route 
                path="/" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/products" 
                element={
                  <ProtectedRoute>
                    <Products />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/inventory" 
                element={
                  <ProtectedRoute>
                    <StockLedger />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/purchase" 
                element={<Navigate to="/" replace />}
              />
              <Route 
                path="/bom" 
                element={<Navigate to="/" replace />}
              />
              <Route 
                path="/manufacturing" 
                element={<Navigate to="/" replace />}
              />
              <Route 
                path="/sales" 
                element={
                  <ProtectedRoute>
                    <Sales />
                  </ProtectedRoute>
                } 
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </SocketProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;

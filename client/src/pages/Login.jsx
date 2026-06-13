import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, User, AlertCircle, Sparkles } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (userRole) => {
    setUsername(userRole);
    setPassword('password123');
    setError('');
    setLoading(true);
    try {
      await login(userRole, 'password123');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Quick login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-darkBg bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-950/35 via-darkBg to-darkBg px-4 relative overflow-hidden">
      {/* Decorative neon spots */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none"></div>

      <div className="max-w-md w-full glass-panel-glow rounded-3xl p-8 border border-slate-800 shadow-[0_0_50px_rgba(0,242,254,0.05)] z-10">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent tracking-tight">
            Shiv Furniture Works
          </h2>
          <p className="text-slate-400 text-sm mt-2 font-medium">Enterprise Resource Planning Portal</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
            <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Username</label>
            <div className="relative">
              <User size={18} className="absolute left-4 top-3.5 text-slate-500" />
              <input
                type="text"
                required
                className="w-full glass-input pl-12"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div className="relative">
            <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-3.5 text-slate-500" />
              <input
                type="password"
                required
                className="w-full glass-input pl-12"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full glass-btn-primary py-3 font-bold mt-4"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800/80">
          <div className="flex items-center gap-1 text-slate-400 text-xs font-semibold mb-3 justify-center">
            <Sparkles size={14} className="text-yellow-400" />
            <span>Quick Login Presets (password: password123)</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {['admin', 'sales', 'purchase', 'manufacturing', 'inventory', 'owner'].map((role) => (
              <button
                key={role}
                onClick={() => handleQuickLogin(role)}
                className="px-3 py-2.5 text-xs rounded-xl bg-slate-800/40 border border-slate-800/60 hover:bg-cyan-500/10 hover:border-cyan-500/25 transition-all text-slate-300 capitalize font-medium"
              >
                {role}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, AlertCircle, CheckCircle2, Lock, Sparkles, User } from 'lucide-react';

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
    if (['admin', 'purchase', 'manufacturing', 'owner'].includes(userRole.toLowerCase())) {
      return;
    }
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
    <div className="min-h-screen w-screen overflow-hidden bg-[#f5f9ff] text-slate-900">
      <div className="relative flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="absolute left-[-8rem] top-[-8rem] h-80 w-80 rounded-full bg-sky-300/30 blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-8rem] right-[-6rem] h-96 w-96 rounded-full bg-blue-200/70 blur-3xl pointer-events-none" />

        <div className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-[0_30px_80px_rgba(37,99,235,0.14)] lg:grid-cols-[1.1fr_0.9fr]">
          <div className="hidden flex-col justify-between bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 p-10 text-white lg:flex">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur-sm">
                <Sparkles size={16} />
                ERP access for your team
              </div>
              <h1 className="mt-8 max-w-md text-4xl font-semibold leading-tight tracking-tight">
                Simple, clear login for Shiv Furniture Works.
              </h1>
              <p className="mt-4 max-w-md text-sm leading-6 text-blue-50/90">
                A clean entry point for your daily operations with quick access for every role.
              </p>
            </div>

            <div className="space-y-3 rounded-[1.5rem] border border-white/15 bg-white/10 p-6 backdrop-blur-sm">
              <div className="flex items-center gap-3 text-sm text-blue-50">
                <CheckCircle2 size={18} />
                Fast role-based access
              </div>
              <div className="flex items-center gap-3 text-sm text-blue-50">
                <CheckCircle2 size={18} />
                Clean dashboard experience
              </div>
              <div className="flex items-center gap-3 text-sm text-blue-50">
                <CheckCircle2 size={18} />
                Blue and white modern style
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 lg:p-10">
            <div className="mb-8 text-center lg:text-left">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 lg:mx-0">
                <ArrowRight size={22} className="-rotate-45" />
              </div>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-900">Shiv Furniture Works</h2>
              <p className="mt-2 text-sm text-slate-500">Enterprise Resource Planning Portal</p>
            </div>

            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Username</label>
                <div className="relative">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" />
                  <input
                    type="text"
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" />
                  <input
                    type="password"
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
                {!loading && <ArrowRight size={18} />}
              </button>
            </form>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-4 flex items-center justify-center gap-2 text-sm font-medium text-slate-600">
                <Sparkles size={16} className="text-blue-500" />
                Quick login presets use password: password123
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {['admin', 'sales', 'purchase', 'manufacturing', 'inventory', 'owner'].map((role) => {
                  const isDisabled = ['admin', 'purchase', 'manufacturing', 'owner'].includes(role);
                  return (
                    <button
                      key={role}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => handleQuickLogin(role)}
                      className={`rounded-xl border px-3 py-2.5 text-sm font-medium capitalize transition ${
                        isDisabled
                          ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-50'
                          : 'border-blue-100 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700'
                      }`}
                    >
                      {role}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
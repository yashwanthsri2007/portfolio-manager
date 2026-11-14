// src/components/auth/LoginPage.tsx
// Full authentication UI: Login, Signup, Forgot Password
// Uses real Firebase Auth via AuthContext. Falls back gracefully if unconfigured.

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Lock, Mail, ArrowRight, Eye, EyeOff, User, AlertCircle,
  CheckCircle, RefreshCw, Sparkles, ChevronLeft
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

type AuthMode = 'login' | 'signup' | 'forgot';

export const LoginPage: React.FC = () => {
  const { login, loginWithGoogle, signup, sendPasswordReset, authError, clearAuthError, firebaseReady, isLoading } = useAuth();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [localError, setLocalError] = useState('');

  const error = authError || localError;

  const clearErrors = () => {
    clearAuthError();
    setLocalError('');
    setSuccessMsg('');
  };

  const handleModeChange = (m: AuthMode) => {
    setMode(m);
    clearErrors();
    setPassword('');
    setConfirmPassword('');
  };

  // ── Submit handler ──────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    if (mode === 'signup') {
      if (!displayName.trim()) { setLocalError('Please enter your name.'); return; }
      if (password.length < 6) { setLocalError('Password must be at least 6 characters.'); return; }
      if (password !== confirmPassword) { setLocalError('Passwords do not match.'); return; }
    }

    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else if (mode === 'signup') {
        await signup(email, password, displayName || 'Yashwanth');
      } else if (mode === 'forgot') {
        await sendPasswordReset(email);
        setSuccessMsg('Password reset email sent! Check your inbox.');
      }
    } catch {
      // Error already set by AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Google Sign-In ──────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    clearErrors();
    setIsSubmitting(true);
    try {
      await loginWithGoogle();
    } catch {
      // Error already set
    } finally {
      setIsSubmitting(false);
    }
  };

  const modeTitle: Record<AuthMode, string> = {
    login: 'Welcome Back',
    signup: 'Create Your Account',
    forgot: 'Reset Password',
  };

  const modeSubtitle: Record<AuthMode, string> = {
    login: 'Sign in to your Portfolio Manager.',
    signup: 'Set up your personal investment dashboard.',
    forgot: 'Enter your email to receive a reset link.',
  };

  return (
    <div className="min-h-screen w-full bg-[#0B0F17] flex items-center justify-center p-4 md:p-8 relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute top-1/4 left-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse pointer-events-none" />
      <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl animate-pulse pointer-events-none" />

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center z-10">
        {/* Left — Brand Showcase */}
        <div className="space-y-6 text-left hidden lg:block">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.4)]">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-wider bg-gradient-to-r from-cyan-400 via-white to-violet-300 bg-clip-text text-transparent">
                PORTFOLIO MANAGER
              </h1>
              <p className="text-xs font-mono text-cyan-400/80 uppercase tracking-widest">
                PERSONAL WEALTH COMMAND
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold text-gray-100 leading-tight">
              Your complete financial command center.
            </h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              Track multi-asset portfolios, Indian stocks, mutual fund NAVs, gold & silver, 
              real-time market data, and get AI-driven portfolio insights.
            </p>
          </div>

          <div className="space-y-3">
            {[
              '✓ Real-time market data via Finnhub',
              '✓ Angel One SmartAPI holdings sync',
              '✓ AI-powered portfolio advisor',
              '✓ Weekly & monthly investment ledger',
              '✓ Secure per-user data isolation',
            ].map((feat) => (
              <div key={feat} className="flex items-center gap-2 text-sm text-gray-300">
                <span className="text-emerald-400 font-bold">{feat.slice(0, 1)}</span>
                <span>{feat.slice(2)}</span>
              </div>
            ))}
          </div>

          {/* Preview chart */}
          <div className="rounded-2xl border border-cyan-500/20 bg-gray-900/60 backdrop-blur p-4 shadow-xl">
            <div className="flex items-center justify-between text-xs font-mono text-gray-400 mb-3">
              <span>PORTFOLIO NET WORTH</span>
              <span className="text-emerald-400 font-bold">LIVE TRACKING</span>
            </div>
            <div className="h-20 flex items-end justify-between gap-1.5 px-1">
              {[38, 52, 45, 68, 60, 82, 75, 90, 86, 100].map((val, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full rounded-t bg-gradient-to-t from-cyan-500/30 to-cyan-400 transition-all"
                    style={{ height: `${val}%` }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — Auth Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="rounded-3xl border border-cyan-500/30 bg-gray-900/80 backdrop-blur-xl p-8 shadow-[0_0_50px_rgba(6,182,212,0.15)]"
          >
            {/* Back button (forgot / signup → login) */}
            {mode !== 'login' && (
              <button
                onClick={() => handleModeChange('login')}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-cyan-400 mb-4 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Back to Sign In
              </button>
            )}

            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-100">{modeTitle[mode]}</h3>
              <p className="text-xs text-gray-400 mt-1">{modeSubtitle[mode]}</p>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-500/40 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-red-300">{error}</p>
              </div>
            )}

            {/* Success Banner */}
            {successMsg && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-300">{successMsg}</p>
              </div>
            )}

            {/* Firebase not configured warning */}
            {!firebaseReady && (
              <div className="mb-4 p-3 rounded-xl bg-amber-950/40 border border-amber-500/40">
                <p className="text-xs text-amber-300">
                  <strong>⚠ Firebase not configured.</strong> Running in local mode — your data is stored only in this browser. 
                  Add Firebase credentials to <code>.env</code> for real authentication and cloud sync.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Display Name (signup only) */}
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1.5 uppercase">Your Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={e => { setDisplayName(e.target.value); clearErrors(); }}
                      placeholder="Yashwanth"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-900/60 border border-gray-700/60 text-gray-100 text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1.5 uppercase">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => { setEmail(e.target.value); clearErrors(); }}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-900/60 border border-gray-700/60 text-gray-100 text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                  />
                </div>
              </div>

              {/* Password (not for forgot) */}
              {mode !== 'forgot' && (
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1.5 uppercase">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={e => { setPassword(e.target.value); clearErrors(); }}
                      placeholder="••••••••••••"
                      minLength={6}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-gray-900/60 border border-gray-700/60 text-gray-100 text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(p => !p)}
                      className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-300"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Confirm Password (signup only) */}
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1.5 uppercase">Confirm Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
                    <input
                      type={showConfirmPass ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={e => { setConfirmPassword(e.target.value); clearErrors(); }}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-gray-900/60 border border-gray-700/60 text-gray-100 text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(p => !p)}
                      className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-300"
                    >
                      {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Forgot password link (login only) */}
              {mode === 'login' && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleModeChange('forgot')}
                    className="text-xs text-cyan-400 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 disabled:opacity-50 text-white font-bold text-sm shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>
                      {mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Email'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Divider + Google (login / signup only) */}
            {mode !== 'forgot' && (
              <div className="mt-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-800" />
                  <span className="text-xs text-gray-500 font-mono">OR</span>
                  <div className="flex-1 h-px bg-gray-800" />
                </div>

                <button
                  onClick={handleGoogle}
                  disabled={isSubmitting || !firebaseReady}
                  title={!firebaseReady ? 'Configure Firebase to enable Google Sign-In' : ''}
                  className="w-full py-2.5 rounded-xl bg-gray-800/60 hover:bg-gray-800 text-gray-300 border border-gray-700 text-xs font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z" />
                    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                    <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 14.8s.7 5.1 1.9 7.5l3.7-2.9z" />
                    <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z" />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <button
                  onClick={() => login('local@portfoliomanager.io', 'localmode')}
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold text-xs transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Continue in Local Mode (no account needed)</span>
                </button>
              </div>
            )}

            {/* Mode toggle footer */}
            <div className="mt-5 text-center text-xs text-gray-400">
              {mode === 'login' ? (
                <>
                  Don't have an account?{' '}
                  <button onClick={() => handleModeChange('signup')} className="text-cyan-400 font-bold hover:underline">
                    Create Account
                  </button>
                </>
              ) : mode === 'signup' ? (
                <>
                  Already have an account?{' '}
                  <button onClick={() => handleModeChange('login')} className="text-cyan-400 font-bold hover:underline">
                    Sign In
                  </button>
                </>
              ) : null}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

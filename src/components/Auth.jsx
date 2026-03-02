import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path
      d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
      fill="#4285F4"
    />
    <path
      d="M9.003 18c2.43 0 4.467-.806 5.956-2.18l-2.909-2.26c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9.003 18z"
      fill="#34A853"
    />
    <path
      d="M3.964 10.712A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.33z"
      fill="#FBBC05"
    />
    <path
      d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.428 0 9.002 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29c.708-2.127 2.692-3.71 5.036-3.71z"
      fill="#EA4335"
    />
  </svg>
);

export function AuthScreen({ theme }) {
  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [googleHovered, setGoogleHovered] = useState(false);

  // On mount, replace current history entry so we always have a clean base state
  useEffect(() => {
    window.history.replaceState({ authMode: 'signin' }, '', window.location.href);

    const handlePopState = (e) => {
      const historyMode = e.state?.authMode;
      if (historyMode) {
        setMode(historyMode);
        setError('');
        setMessage('');
      } else {
        // No auth state left in history — go back to signin
        setMode('signin');
        setError('');
        setMessage('');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // When mode changes to a non-default state, push a history entry
  const navigateTo = (newMode) => {
    window.history.pushState({ authMode: newMode }, '', window.location.pathname);
    setMode(newMode);
    setError('');
    setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    const trimmedEmail = email.trim();

    try {
      if (mode === 'signup') {
        if (!trimmedEmail || !password || !confirmPassword) {
          setError('Please fill in all fields.');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }
        const { error } = await signUp(trimmedEmail, password);
        if (error) {
          setError(error.message);
        } else {
          setMessage('Check your email for a confirmation link!');
        }
      } else if (mode === 'signin') {
        if (!trimmedEmail || !password) {
          setError('Please enter both email and password.');
          setLoading(false);
          return;
        }
        const { error } = await signIn(trimmedEmail, password);
        if (error) {
          setError(error.message);
        }
      } else if (mode === 'reset') {
        if (!trimmedEmail) {
          setError('Please enter your email address.');
          setLoading(false);
          return;
        }
        const { error } = await resetPassword(trimmedEmail);
        if (error) {
          setError(error.message);
        } else {
          setMessage('Check your email for a password reset link!');
        }
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setError(error.message);
        setLoading(false);
      }
      // On success, Supabase redirects out and back. Loading stays true.
    } catch {
      setError('Failed to sign in with Google');
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '14px 16px',
    fontSize: 15,
    border: `1px solid ${theme.border}`,
    borderRadius: 12,
    background: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    color: theme.text,
    outline: 'none',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    boxSizing: 'border-box',
  };

  const buttonStyle = {
    width: '100%',
    padding: '14px 20px',
    fontSize: 15,
    fontWeight: 700,
    border: 'none',
    borderRadius: 12,
    cursor: loading ? 'not-allowed' : 'pointer',
    transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    boxShadow: `0 4px 12px ${theme.accent}33`,
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1],
        staggerChildren: 0.1
      }
    },
    exit: { opacity: 0, scale: 0.98, transition: { duration: 0.2 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 }
  };

  const formVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.2 } }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: theme.bg,
        padding: 24,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Dynamic Background Accents */}
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          rotate: [0, 5, 0],
          opacity: [0.1, 0.15, 0.1]
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: 'absolute',
          top: '-10%',
          right: '-10%',
          width: '50%',
          height: '50%',
          background: `radial-gradient(circle, ${theme.accent} 0%, transparent 70%)`,
          filter: 'blur(100px)',
          zIndex: 0,
          pointerEvents: 'none'
        }}
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{
          width: '100%',
          maxWidth: 420,
          background: theme.isDark
            ? 'rgba(18, 18, 18, 0.75)'
            : 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          borderRadius: 28,
          padding: 40,
          border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
          boxShadow: theme.isDark
            ? '0 32px 64px -12px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.05)'
            : '0 32px 64px -12px rgba(0,0,0,0.12), inset 0 1px 1px rgba(255,255,255,0.8)',
          zIndex: 1,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            style={{
              width: 64,
              height: 64,
              background: `linear-gradient(135deg, ${theme.accent}, #FF6B5E)`,
              borderRadius: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: `0 12px 28px ${theme.accent}44`,
              position: 'relative'
            }}
          >
            <motion.div
              animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.2, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
              style={{
                position: 'absolute',
                inset: -4,
                borderRadius: 22,
                border: `2px solid ${theme.accent}44`,
                zIndex: -1
              }}
            />
            <span style={{ fontSize: 32 }}>⚡</span>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: theme.text,
              margin: 0,
              letterSpacing: '-0.02em'
            }}
          >
            {mode === 'signin'
              ? 'Welcome back'
              : mode === 'signup'
                ? 'Create account'
                : 'Reset password'}
          </motion.h1>
          <motion.p
            variants={itemVariants}
            style={{
              fontSize: 15,
              color: theme.textMid,
              margin: '10px 0 0',
              lineHeight: 1.5
            }}
          >
            {mode === 'signin'
              ? 'Find your focus and reclaim your rhythm.'
              : mode === 'signup'
                ? 'Start your productivity journey today.'
                : 'Enter your email to receive a reset link.'}
          </motion.p>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            variants={formVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                style={{
                  padding: '14px 18px',
                  background: `${theme.danger}12`,
                  border: `1px solid ${theme.danger}25`,
                  borderRadius: 14,
                  color: theme.danger,
                  fontSize: 14,
                  fontWeight: 500,
                  marginBottom: 24,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: theme.danger }} />
                {error}
              </motion.div>
            )}

            {message && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                style={{
                  padding: '14px 18px',
                  background: `${theme.success}12`,
                  border: `1px solid ${theme.success}25`,
                  borderRadius: 14,
                  color: theme.success,
                  fontSize: 14,
                  fontWeight: 500,
                  marginBottom: 24,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: theme.success }} />
                {message}
              </motion.div>
            )}

            <div onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(e) }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ position: 'relative' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 13,
                      fontWeight: 600,
                      color: theme.textMid,
                      marginBottom: 8,
                      marginLeft: 4
                    }}
                  >
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    required
                    style={inputStyle}
                    onFocus={(e) => {
                      e.target.style.borderColor = theme.accent;
                      e.target.style.boxShadow = `0 0 0 4px ${theme.accent}15`;
                      e.target.style.background = theme.surface;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = theme.border;
                      e.target.style.boxShadow = 'none';
                      e.target.style.background = theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';
                    }}
                  />
                </div>

                {mode !== 'reset' && (
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: 13,
                        fontWeight: 600,
                        color: theme.textMid,
                        marginBottom: 8,
                        marginLeft: 4
                      }}
                    >
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      style={inputStyle}
                      onFocus={(e) => {
                        e.target.style.borderColor = theme.accent;
                        e.target.style.boxShadow = `0 0 0 4px ${theme.accent}15`;
                        e.target.style.background = theme.surface;
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = theme.border;
                        e.target.style.boxShadow = 'none';
                        e.target.style.background = theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';
                      }}
                    />
                  </div>
                )}

                {mode === 'signup' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <label
                      style={{
                        display: 'block',
                        fontSize: 13,
                        fontWeight: 600,
                        color: theme.textMid,
                        marginBottom: 8,
                        marginLeft: 4
                      }}
                    >
                      Confirm password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      style={inputStyle}
                      onFocus={(e) => {
                        e.target.style.borderColor = theme.accent;
                        e.target.style.boxShadow = `0 0 0 4px ${theme.accent}15`;
                        e.target.style.background = theme.surface;
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = theme.border;
                        e.target.style.boxShadow = 'none';
                        e.target.style.background = theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';
                      }}
                    />
                  </motion.div>
                )}

                <motion.button
                  whileHover={{ scale: 1.01, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  style={{
                    ...buttonStyle,
                    background: loading ? theme.textDim : theme.accent,
                    color: '#fff',
                    marginTop: 8,
                  }}
                >
                  {loading
                    ? 'Processing...'
                    : mode === 'signin'
                      ? 'Sign In'
                      : mode === 'signup'
                        ? 'Create Account'
                        : 'Send Reset Link'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {mode !== 'reset' && (
          <motion.div variants={itemVariants}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                margin: '28px 0',
              }}
            >
              <div style={{ flex: 1, height: 1, background: theme.border, opacity: 0.5 }} />
              <span style={{ fontSize: 13, color: theme.textDim, fontWeight: 500 }}>or continue with</span>
              <div style={{ flex: 1, height: 1, background: theme.border, opacity: 0.5 }} />
            </div>

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={handleGoogleSignIn}
              onMouseEnter={() => setGoogleHovered(true)}
              onMouseLeave={() => setGoogleHovered(false)}
              disabled={loading}
              style={{
                ...buttonStyle,
                background: googleHovered
                  ? (theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)')
                  : 'transparent',
                color: theme.text,
                border: `1.5px solid ${googleHovered
                  ? (theme.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)')
                  : theme.border}`,
                boxShadow: 'none',
                transform: googleHovered ? 'scale(1.01)' : 'scale(1)'
              }}
            >
              <GoogleIcon />
              Google
            </motion.button>
          </motion.div>
        )}

        <motion.div
          variants={itemVariants}
          style={{
            marginTop: 32,
            textAlign: 'center',
            fontSize: 14,
            color: theme.textMid,
            fontWeight: 500
          }}
        >
          {mode === 'signin' ? (
            <>
              New to Todora?{' '}
              <button
                type="button"
                onClick={() => navigateTo('signup')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: theme.accent,
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '0 4px',
                }}
              >
                Sign up
              </button>
              <div style={{ marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => navigateTo('reset')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: theme.textDim,
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: 13,
                    fontWeight: 500,
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.color = theme.textMid}
                  onMouseLeave={(e) => e.target.style.color = theme.textDim}
                >
                  Forgot your password?
                </button>
              </div>
            </>
          ) : mode === 'signup' ? (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => navigateTo('signin')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: theme.accent,
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '0 4px',
                }}
              >
                Sign in
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => navigateTo('signin')}
              style={{
                background: 'none',
                border: 'none',
                color: theme.accent,
                fontWeight: 700,
                cursor: 'pointer',
                padding: '0 4px',
              }}
            >
              Back to sign in
            </button>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}

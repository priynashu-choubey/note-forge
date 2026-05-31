import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal() {
  const { login, register, setShowAuth } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowAuth(false)}>
      <div className="modal">
        <h2>{mode === 'login' ? 'Welcome back' : 'Create account'}</h2>
        <p>{mode === 'login' ? 'Sign in to access your notes' : 'Start your NoteForge journey'}</p>

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="form-group">
              <label htmlFor="auth-name">Name</label>
              <input
                id="auth-name"
                type="text"
                className="input"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              className="input"
              placeholder="Min 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="form-footer">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : (mode === 'login' ? 'Sign In' : 'Create Account')}
            </button>

            <div className="form-switch">
              {mode === 'login' ? (
                <>Don&apos;t have an account? <a onClick={() => { setMode('register'); setError(''); }}>Sign up</a></>
              ) : (
                <>Already have an account? <a onClick={() => { setMode('login'); setError(''); }}>Sign in</a></>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

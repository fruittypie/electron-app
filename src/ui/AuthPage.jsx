import React, { useState } from 'react';

const AuthPage = ({ onAuthSuccess }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleForm = () => {
    setIsRegistering(prev => !prev);
    setError('');
    setPassword('');
    setEmail('');
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let result;
      if (isRegistering) {
        result = await window.authAPI.register({ email, password });
      } else {
        result = await window.authAPI.login({ email, password });
      }
      if (result.ok) {
        window.authAPI.notifyAuthSuccess(result.token);
        onAuthSuccess?.(result.token);
      } else {
        setError(result.message || 'Invalid credentials or registration failed.');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-sm p-8 bg-white dark:bg-gray-800 rounded-xl shadow-md">
        <h1 className="text-2xl font-semibold text-center text-gray-800 dark:text-white mb-6">
          {isRegistering ? 'Create Account' : 'Welcome Back'}
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <fieldset disabled={loading} aria-busy={loading} className="space-y-4">
            {/* ✅ Show email input for both login and register */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="Enter email"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={isRegistering ? 'new-password' : 'current-password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="Enter password"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </fieldset>

          {error && (
            <p role="alert" aria-live="polite" className="text-sm text-red-500 text-center">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 ${isRegistering ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'} text-white font-medium rounded-md transition focus:ring-2 focus:outline-none`}
          >
            {loading ? 'Please wait...' : isRegistering ? 'Register' : 'Login'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          {isRegistering ? (
            <>
              Already have an account?{' '}
              <button type="button" onClick={toggleForm} className="text-indigo-600 hover:underline">
                Login
              </button>
            </>
          ) : (
            <>
              Don’t have an account?{' '}
              <button type="button" onClick={toggleForm} className="text-green-600 hover:underline">
                Register
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default AuthPage;

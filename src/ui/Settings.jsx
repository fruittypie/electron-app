import React, { useState, useEffect } from 'react';

export default function Settings({ settings, onSave, onBack }) {
  // Local form state initialized from props
  const [form, setForm] = useState({
    headless: settings?.headless ?? true,
    username: settings?.username ?? '',
    password: settings?.password ?? '',
    intervalSec: settings?.intervalSec ?? 60,
    notifyInApp: settings?.notifyInApp ?? false,
    notifyDiscord: settings?.notifyDiscord ?? false,
    autoOrder: settings?.autoOrder ?? false,
    minPrice: settings?.minPrice ?? 0,
    keywords: Array.isArray(settings?.keywords)
      ? settings.keywords.join(', ')
      : '',
  });

  const [errors, setErrors] = useState({});
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sync local form when settings prop changes
  useEffect(() => {
    setForm({
      headless: settings.headless,
      username: settings.username,
      password: settings.password,
      intervalSec: settings.intervalSec,
      notifyInApp: settings.notifyInApp,
      notifyDiscord: settings.notifyDiscord,
      autoOrder: settings.autoOrder,
      minPrice: settings.minPrice,
      keywords: Array.isArray(settings.keywords)
        ? settings.keywords.join(', ')
        : typeof settings.keywords === 'string'
        ? settings.keywords
        : '',
    });
    setErrors({});
    setSaveError(null);
    setSaveSuccess(false);
  }, [settings]);

  const validate = () => {
    const errs = {};
    if (!form.username.trim()) errs.username = 'Username is required';
    if (!form.password.trim()) errs.password = 'Password is required';
    if (form.intervalSec <= 5) errs.intervalSec = 'Interval must be > 5 seconds';
    if (form.autoOrder && form.minPrice < 0) errs.minPrice = 'Min price cannot be negative';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaveError(null);
    if (!validate()) return;
    setIsSaving(true);
    try {
      await onSave({
        ...form,
        keywords: form.keywords
          .split(',')
          .map(k => k.trim())
          .filter(Boolean),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Back button */}
      <button
        onClick={onBack}
        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition"
      >
        ← Back
      </button>

      {/* Scraper Mode */}
      <section className="bg-white dark:bg-gray-800 p-6 rounded shadow">
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-800 dark:text-gray-100">Headless Mode</span>
          <label className="inline-flex items-center space-x-2">
            <input
              type="checkbox"
              checked={form.headless}
              onChange={e => handleChange('headless', e.target.checked)}
              className="h-5 w-5 text-indigo-600 rounded"
            />
            <span className="text-gray-700 dark:text-gray-300 text-sm">
              {form.headless ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        </div>
      </section>

      {/* Credentials */}
      <section className="bg-white dark:bg-gray-800 p-6 rounded shadow">
        <h2 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-4">Login</h2>
        <div className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Username"
              value={form.username}
              onChange={e => handleChange('username', e.target.value)}
              className={`w-full px-4 py-2 border rounded bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:outline-none $ {errors.username ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-indigo-500'}`}
            />
            {errors.username && (
              <p className="text-red-500 text-sm mt-1">{errors.username}</p>
            )}
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={e => handleChange('password', e.target.value)}
              className={`w-full px-4 py-2 border rounded bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:outline-none $ {errors.password ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-indigo-500'}`}
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password}</p>
            )}
          </div>
        </div>
      </section>

      {/* Interval & Notifications */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white dark:bg-gray-800 p-6 rounded shadow">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Refresh Interval (sec)
          </label>
          <input
            type="number"
            min="1"
            value={form.intervalSec}
            onChange={e => handleChange('intervalSec', parseInt(e.target.value, 10))}
            className={`w-32 px-4 py-2 border rounded bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:outline-none $ {errors.intervalSec ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-indigo-500'}`}
          />
          {errors.intervalSec && (
            <p className="text-red-500 text-sm mt-1">{errors.intervalSec}</p>
          )}
        </div>
        <div>
          <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notifications</span>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={form.notifyInApp}
              onChange={e => handleChange('notifyInApp', e.target.checked)}
              className="h-4 w-4 text-indigo-600 rounded border-gray-300 dark:border-gray-600 focus:ring-indigo-500"
            />
            <span className="text-gray-700 dark:text-gray-300">In-App</span>
          </label>
          <label className="flex items-center space-x-2 mt-2">
            <input
              type="checkbox"
              checked={form.notifyDiscord}
              onChange={e => handleChange('notifyDiscord', e.target.checked)}
              className="h-4 w-4 text-indigo-600 rounded border-gray-300 dark:border-gray-600 focus:ring-indigo-500"
            />
            <span className="text-gray-700 dark:text-gray-300">Discord</span>
          </label>
        </div>
      </section>

      {/* Auto-Order */}
      <section className="bg-white dark:bg-gray-800 p-6 rounded shadow">
        <div className="flex items-center justify-between mb-4">
          <span className="font-medium text-gray-800 dark:text-gray-100">Auto-Order</span>
          <label className="inline-flex items-center space-x-2">
            <input
              type="checkbox"
              checked={form.autoOrder}
              onChange={e => handleChange('autoOrder', e.target.checked)}
              className="h-5 w-5 text-indigo-600 rounded"
            />
          </label>
        </div>
        {form.autoOrder && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Minimum Price ($)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.minPrice}
              onChange={e => handleChange('minPrice', parseFloat(e.target.value))}
              className={`w-32 px-4 py-2 border rounded bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:outline-none $ {errors.minPrice ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-indigo-500'}`}
            />
            {errors.minPrice && (
              <p className="text-red-500 text-sm mt-1">{errors.minPrice}</p>
            )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Auto-Order Keywords (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. shampoo, Olapex"
                  value={form.keywords}
                  onChange={e => handleChange('keywords', e.target.value)}
                  className="w-full px-4 py-2 border rounded bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:outline-none border-gray-300 dark:border-gray-600 focus:ring-indigo-500"
                />
            </div>
          </div>
        )}
      </section>

      {/* Save & Feedback */}
      <div className="text-center space-y-4">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`px-6 py-3 rounded font-semibold text-white ${
            isSaving
              ? 'bg-indigo-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {isSaving ? 'Saving…' : 'Save'}
        </button>
        {saveSuccess && (
          <div className="text-green-600">Settings saved!</div>
        )}
        {saveError && (
          <div className="text-red-600">{saveError}</div>
        )}
      </div>
    </div>
  );
}

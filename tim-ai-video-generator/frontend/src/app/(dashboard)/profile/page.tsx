'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/context/auth-context';
import { updateProfile, changePassword } from '@/lib/api/auth';
import type { SignLanguage, SpokenLanguage } from '@/lib/api/types';
import { InputGroup, PasswordInput } from '@/components/ui/inputs';

const SPOKEN_LANGUAGES: SpokenLanguage[] = ['de', 'en', 'es', 'fr', 'ar'];
const SIGN_LANGUAGES: SignLanguage[] = ['DGS', 'ASL', 'BSL', 'LSF', 'LIS', 'LSE', 'NGT', 'OGS', 'SSL'];

export default function ProfilePage() {
  const { user, accessToken, setUserData } = useAuth();
  const [profileForm, setProfileForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    username: user?.username || '',
    email: user?.email || '',
    preferred_language: user?.preferred_language || 'de',
    sign_language: user?.sign_language || 'DGS',
  });
  const [initialProfile, setInitialProfile] = useState(profileForm);
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const handleProfileInput = (field: keyof typeof profileForm) => (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const value = event.target.value;
    setProfileForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePasswordInput = (field: keyof typeof passwordForm) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
  };

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    const nextProfile = {
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      username: user?.username || '',
      email: user?.email || '',
      preferred_language: user?.preferred_language || 'de',
      sign_language: user?.sign_language || 'DGS',
    };
    setProfileForm(nextProfile);
    setInitialProfile(nextProfile);
  }, [user?.first_name, user?.last_name, user?.username, user?.email, user?.preferred_language, user?.sign_language]);

  const isProfileDirty = useMemo(() => JSON.stringify(profileForm) !== JSON.stringify(initialProfile), [profileForm, initialProfile]);

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;

    setIsSavingProfile(true);
    try {
      const updated = await updateProfile(accessToken, profileForm);
      setUserData(updated);
      setInitialProfile({
        first_name: updated.first_name || '',
        last_name: updated.last_name || '',
        username: updated.username || '',
        email: updated.email || '',
        preferred_language: (updated.preferred_language as SpokenLanguage) || 'de',
        sign_language: (updated.sign_language as SignLanguage) || 'DGS',
      });
      toast.success('Profile updated');
    } catch (error) {
      console.error(error);
      toast.error((error as { message?: string })?.message || 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError('New password and confirmation do not match');
      return;
    }
    if (passwordForm.new_password.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      return;
    }
    if (passwordForm.new_password === passwordForm.current_password) {
      setPasswordError('New password must differ from current password');
      return;
    }

    setPasswordError(null);

    setIsChangingPassword(true);
    try {
      await changePassword(accessToken, passwordForm.current_password, passwordForm.new_password);
      toast.success('Password changed');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      console.error(error);
      toast.error((error as { message?: string })?.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-wide text-gray-500">Account</p>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">Profile</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-2xl">
          Manage your personal details, preferred languages, and password.
        </p>
        <p className={`text-xs font-semibold ${isProfileDirty ? 'text-primary-500' : 'text-emerald-500'}`}>
          {isProfileDirty ? 'Unsaved changes' : 'All changes saved'}
        </p>
      </header>

      <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-dark-primary p-6 space-y-6 max-w-3xl">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Personal info</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">These details appear across the dashboard.</p>
        </div>
        <form onSubmit={handleProfileSubmit} className="space-y-4" aria-busy={isSavingProfile}>
          <div className="grid gap-4 sm:grid-cols-2">
            <InputGroup
              label="First name"
              placeholder="First name"
              value={profileForm.first_name}
              onChange={handleProfileInput('first_name')}
            />
            <InputGroup
              label="Last name"
              placeholder="Last name"
              value={profileForm.last_name}
              onChange={handleProfileInput('last_name')}
            />
          </div>
          <InputGroup
            label="Username"
            placeholder="username"
            value={profileForm.username}
            onChange={handleProfileInput('username')}
          />
          <InputGroup
            type="email"
            label="Email"
            placeholder="email@example.com"
            value={profileForm.email}
            onChange={handleProfileInput('email')}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Preferred spoken language
              <select
                className="mt-2 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-4 py-2 text-sm"
                value={profileForm.preferred_language}
                onChange={(event) =>
                  setProfileForm((prev) => ({ ...prev, preferred_language: event.target.value as SpokenLanguage }))
                }
              >
                {SPOKEN_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Preferred sign language
              <select
                className="mt-2 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-4 py-2 text-sm"
                value={profileForm.sign_language}
                onChange={(event) =>
                  setProfileForm((prev) => ({ ...prev, sign_language: event.target.value as SignLanguage }))
                }
              >
                {SIGN_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            type="submit"
            disabled={isSavingProfile || !isProfileDirty}
            className="px-6 py-3 rounded-full bg-primary-500 text-white text-sm font-semibold disabled:opacity-40"
          >
            {isSavingProfile ? 'Saving…' : isProfileDirty ? 'Save changes' : 'Nothing to save'}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-dark-primary p-6 space-y-6 max-w-3xl">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Password</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Update your password to keep your account secure.</p>
        </div>
        <form onSubmit={handlePasswordSubmit} className="space-y-4" aria-busy={isChangingPassword}>
          <PasswordInput
            label="Current password"
            placeholder="••••••••"
            value={passwordForm.current_password}
            onChange={handlePasswordInput('current_password')}
          />
          <PasswordInput
            label="New password"
            placeholder="••••••••"
            value={passwordForm.new_password}
            onChange={handlePasswordInput('new_password')}
          />
          <PasswordInput
            label="Confirm new password"
            placeholder="••••••••"
            value={passwordForm.confirm_password}
            onChange={handlePasswordInput('confirm_password')}
          />
          {passwordError && <p className="text-xs text-red-500">{passwordError}</p>}
          <button
            type="submit"
            disabled={isChangingPassword}
            className="px-6 py-3 rounded-full border border-gray-300 dark:border-gray-700 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60"
          >
            {isChangingPassword ? 'Changing…' : 'Change password'}
          </button>
        </form>
      </section>
    </div>
  );
}

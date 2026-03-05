'use client';

import { Checkbox } from '@/components/ui/inputs/checkbox';
import { Input, InputGroup } from '@/components/ui/inputs';
import { Label } from '@/components/ui/label';
import { EyeCloseIcon, EyeIcon } from '@/icons/icons';
import { authValidation } from '@/lib/zod/auth.schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { useAuth } from '@/context/auth-context';
import type { SignLanguage, SpokenLanguage } from '@/lib/api/types';

type Inputs = z.infer<typeof authValidation.register>;

export default function SignupForm() {
  const form = useForm<Inputs>({
    resolver: zodResolver(authValidation.register),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      preferredLanguage: 'de',
      signLanguage: 'DGS',
    },
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [isShowPassword, setIsShowPassword] = useState(false);
  const { register: registerUser, isLoading } = useAuth();
  const router = useRouter();

  const handleShowPassword = () => {
    setIsShowPassword(!isShowPassword);
  };

  const spokenOptions = useMemo<SpokenLanguage[]>(() => ['de', 'en', 'es', 'fr', 'ar'], []);
  const signOptions = useMemo<SignLanguage[]>(() => ['DGS', 'ASL', 'BSL', 'LSF', 'LIS', 'LSE', 'NGT', 'OGS', 'SSL'], []);

  async function onSubmit(data: Inputs) {
    try {
      await registerUser({
        email: data.email,
        password: data.password,
        username: `${data.firstName}${data.lastName}`.replace(/\s+/g, '').toLowerCase(),
        preferred_language: data.preferredLanguage,
        sign_language: data.signLanguage,
      });
      toast.success('Account created successfully');
      router.push('/dashboard');
    } catch (error) {
      const message =
        (error as { message?: string })?.message || 'Unable to sign up. Please try again.';
      toast.error(message);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Controller
          control={form.control}
          name="firstName"
          render={({ field, fieldState }) => (
            <InputGroup
              label="First name"
              placeholder="Your first name"
              disabled={isLoading}
              {...field}
              error={fieldState.error?.message}
            />
          )}
        />

        <Controller
          control={form.control}
          name="lastName"
          render={({ field, fieldState }) => (
            <InputGroup
              label="Last name"
              placeholder="Your last name"
              disabled={isLoading}
              {...field}
              error={fieldState.error?.message}
            />
          )}
        />

        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <InputGroup
              type="email"
              label="Email address"
              placeholder="Your email address"
              groupClassName="col-span-full"
              disabled={isLoading}
              {...field}
              error={fieldState.error?.message}
            />
          )}
        />

        <div className="col-span-full">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              type={isShowPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              id="password"
              disabled={isLoading}
              {...form.register('password')}
            />

            <button
              type="button"
              title={isShowPassword ? 'Hide password' : 'Show password'}
              aria-label={isShowPassword ? 'Hide password' : 'Show password'}
              onClick={handleShowPassword}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-600"
            >
              {isShowPassword ? <EyeIcon /> : <EyeCloseIcon />}
            </button>
          </div>

          {form.formState.errors.password && (
            <p className="text-red-500 text-sm mt-1.5">
              {form.formState.errors.password.message}
            </p>
          )}
        </div>

        <Checkbox
          label="Keep me logged in"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          name="remember_me"
          className="col-span-full"
        />

        <div className="grid gap-5 sm:grid-cols-2 col-span-full">
          <div>
            <Label className="text-sm text-gray-600 dark:text-gray-300">Preferred spoken language</Label>
            <select
              className="mt-2 w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-transparent px-4 py-2 text-sm"
              disabled={isLoading}
              {...form.register('preferredLanguage')}
            >
              {spokenOptions.map((lang) => (
                <option key={lang} value={lang}>
                  {lang.toUpperCase()}
                </option>
              ))}
            </select>
            {form.formState.errors.preferredLanguage && (
              <p className="text-red-500 text-sm mt-1.5">
                {form.formState.errors.preferredLanguage.message}
              </p>
            )}
          </div>

          <div>
            <Label className="text-sm text-gray-600 dark:text-gray-300">Preferred sign language</Label>
            <select
              className="mt-2 w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-transparent px-4 py-2 text-sm"
              disabled={isLoading}
              {...form.register('signLanguage')}
            >
              {signOptions.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
            {form.formState.errors.signLanguage && (
              <p className="text-red-500 text-sm mt-1.5">
                {form.formState.errors.signLanguage.message}
              </p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="bg-primary-500 hover:bg-primary-600 transition py-3 px-6 w-full font-medium text-white text-sm rounded-full col-span-full disabled:opacity-75"
        >
          {isLoading ? 'Signing up...' : 'Sign Up'}
        </button>
      </div>
    </form>
  );
}

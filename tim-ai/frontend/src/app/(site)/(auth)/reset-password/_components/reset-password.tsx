'use client';

import { PasswordInput } from '@/components/ui/inputs';
import { authValidation } from '@/lib/zod/auth.schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { resetPassword } from '@/lib/api/auth';

type Inputs = z.infer<typeof authValidation.resetPassword>;

type PropsType = {
  resetToken: string;
};

export default function ResetPasswordForm({ resetToken }: PropsType) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<Inputs>({
    resolver: zodResolver(authValidation.resetPassword),
    defaultValues: {
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  async function onSubmit(data: Inputs) {
    setIsLoading(true);

    try {
      await resetPassword(resetToken, data.newPassword);
      toast.success('Password updated. You can sign in now.');
      setIsSuccess(true);
      form.reset();
    } catch (error) {
      const message = (error as { message?: string })?.message || 'Unable to reset password right now.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <div className="text-center mb-8">
        <h3 className="text-gray-800 font-bold text-3xl mb-2 dark:text-white/90">
          Change Password
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Make sure to create a strong password to mark your projects.
        </p>
      </div>

      {isSuccess && (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
          Password reset successfully. You can close this tab and sign in with your new password.
        </div>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid gap-5">
          <Controller
            control={form.control}
            name="newPassword"
            render={({ field, fieldState }) => (
              <PasswordInput
                label="New Password"
                placeholder="Enter your new password"
                required
                error={fieldState.error?.message}
                disabled={isLoading}
                {...field}
              />
            )}
          />

          <Controller
            control={form.control}
            name="confirmNewPassword"
            render={({ field, fieldState }) => (
              <PasswordInput
                label="Confirm New Password"
                placeholder="Confirm your new password"
                required
                error={fieldState.error?.message}
                disabled={isLoading}
                {...field}
              />
            )}
          />

          <button
            className="bg-primary-500 hover:bg-primary-600 transition py-3 px-6 w-full font-medium text-white text-sm rounded-full"
            disabled={isLoading}
          >
            {isLoading ? 'Submitting...' : 'Reset Password'}
          </button>
        </div>
      </form>
    </>
  );
}

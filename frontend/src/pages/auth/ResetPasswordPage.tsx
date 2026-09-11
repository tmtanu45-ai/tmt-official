import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { 
  AlertCircle, 
  CheckCircle
} from 'lucide-react';

const resetSchema = z.object({
  password: z.string().min(12, 'Password must be at least 12 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type ResetForm = z.infer<typeof resetSchema>;

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
  });

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token');
    }
  }, [token]);

  const onSubmit = async (data: ResetForm) => {
    if (!token) return;
    setError(null);
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password: data.password });
      setSuccess(true);
      reset();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-abyss-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md gradient-border">
        <div className="mb-6">
          <Link to="/login" className="inline-flex items-center gap-2 text-ghost-gray hover:text-ghost-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back to Login
          </Link>
        </div>

        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h1 className="font-display text-2xl font-bold gradient-text mb-2">Password Reset</h1>
            <p className="text-ghost-gray mb-6">Your password has been successfully updated.</p>
            <Link to="/login" className="btn-primary inline-flex">
              Sign In
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <h1 className="font-display text-2xl font-bold gradient-text">Reset Password</h1>
              <p className="text-ghost-gray mt-2">Enter your new password</p>
            </div>

            {!token && (
              <div className="text-center text-red-400 mb-6">
                <p className="mb-2">Invalid or missing reset token</p>
                <Link to="/forgot-password" className="text-neon-cyan hover:text-neon-violet">
                  Request new link
                </Link>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3 text-red-400">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <Input
                label="New Password"
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                placeholder="••••••••"
                helperText="Minimum 12 characters"
                disabled={loading}
              />
              {errors.password && (
                <p className="text-sm text-red-400">{errors.password.message}</p>
              )}

              <Input
                label="Confirm Password"
                type={showPassword ? 'text' : 'password'}
                {...register('confirmPassword')}
                placeholder="••••••••"
                disabled={loading}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-400">{errors.confirmPassword.message}</p>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showPassword"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="w-4 h-4 rounded border-glass-border bg-abyss-navy text-neon-cyan focus:ring-neon-cyan"
                />
                <label htmlFor="showPassword" className="text-sm text-ghost-gray cursor-pointer">
                  Show password
                </label>
              </div>

              <Button type="submit" className="w-full" size="lg" loading={loading}>
                Reset Password
              </Button>
            </form>

            <p className="text-center text-ghost-gray mt-6 text-sm">
              Remember your password?{' '}
              <Link to="/login" className="text-neon-cyan hover:text-neon-violet font-medium">
                Sign in
              </Link>
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
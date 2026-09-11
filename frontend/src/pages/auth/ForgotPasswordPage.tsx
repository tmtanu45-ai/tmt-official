import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { 
  AlertCircle, 
  CheckCircle 
} from 'lucide-react';

const forgotSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type ForgotForm = z.infer<typeof forgotSchema>;

export function ForgotPasswordPage() {
  const [step, setStep] = useState<'request' | 'sent'>('request');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = async (data: ForgotForm) => {
    setError(null);
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: data.email });
      setStep('sent');
      reset();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to send reset link');
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
        <div className="text-center mb-8">
          <h1 className="font-display text-2xl font-bold gradient-text">Forgot Password</h1>
          <p className="text-ghost-gray mt-2">Enter your email to receive a reset link</p>
        </div>

        {step === 'request' ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3 text-red-400">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}
            <Input
              label="Email"
              type="email"
              {...register('email')}
              placeholder="you@example.com"
              autoComplete="email"
              disabled={loading}
            />
            {errors.email && (
              <p className="text-sm text-red-400">{errors.email.message}</p>
            )}
            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Send Reset Link
            </Button>
          </form>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="font-display text-xl font-bold mb-2">Check Your Email</h2>
            <p className="text-ghost-gray mb-6">
              We've sent a password reset link to your email address. 
              The link will expire in 1 hour.
            </p>
            <Link to="/login" className="btn-primary inline-flex">
              Back to Login
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}
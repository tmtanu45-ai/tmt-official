import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { 
  AlertCircle,
  Trophy,
} from 'lucide-react';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(12, 'Password must be at least 12 characters'),
  confirmPassword: z.string(),
  username: z.string().min(3, 'Username must be at least 3 characters').max(20).regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores and hyphens'),
  display_name: z.string().min(1, 'Display name is required').max(50),
  ff_uid: z.string().regex(/^\d{8,12}$/, 'Free Fire UID must be 8-12 digits'),
  in_game_name: z.string().min(1, 'In-game name is required').max(30),
  date_of_birth: z.string().refine((date) => {
    const dob = new Date(date);
    const age = (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    return age >= 13;
  }, 'You must be at least 13 years old'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    setError(null);
    setLoading(true);
    try {
      await api.post('/auth/register', {
        email: data.email,
        password: data.password,
        username: data.username,
        display_name: data.display_name,
        ff_uid: data.ff_uid,
        in_game_name: data.in_game_name,
        date_of_birth: data.date_of_birth,
      });
      navigate('/login?registered=true', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-abyss-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md gradient-border">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 mb-6">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-neon-cyan to-neon-violet flex items-center justify-center">
              <Trophy className="w-8 h-8 text-abyss-black" />
            </div>
            <span className="font-display font-bold text-2xl gradient-text">TMT</span>
          </Link>
          <h1 className="font-display text-2xl font-bold">Create Account</h1>
          <p className="text-ghost-gray mt-2">Join TMT OFFICIAL eSports practice matches</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3 text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Username"
              {...register('username')}
              placeholder="proplayer1"
              error={errors.username?.message}
              disabled={loading}
            />
            <Input
              label="Display Name"
              {...register('display_name')}
              placeholder="Pro Player"
              error={errors.display_name?.message}
              disabled={loading}
            />
          </div>

          <Input
            label="Email"
            type="email"
            {...register('email')}
            placeholder="you@example.com"
            error={errors.email?.message}
            disabled={loading}
          />

          <Input
            label="Password"
            type="password"
            {...register('password')}
            placeholder="••••••••"
            error={errors.password?.message}
            disabled={loading}
            helperText="Minimum 12 characters"
          />

          <Input
            label="Confirm Password"
            type="password"
            {...register('confirmPassword')}
            placeholder="••••••••"
            error={errors.confirmPassword?.message}
            disabled={loading}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Free Fire UID"
              {...register('ff_uid')}
              placeholder="12345678"
              error={errors.ff_uid?.message}
              disabled={loading}
            />
            <Input
              label="In-Game Name"
              {...register('in_game_name')}
              placeholder="ProPlayerFF"
              error={errors.in_game_name?.message}
              disabled={loading}
            />
          </div>

          <Input
            label="Date of Birth"
            type="date"
            {...register('date_of_birth')}
            error={errors.date_of_birth?.message}
            disabled={loading}
            helperText="You must be 13+ to register"
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="terms"
              required
              className="w-4 h-4 rounded border-glass-border bg-abyss-navy text-neon-cyan focus:ring-neon-cyan"
            />
            <label htmlFor="terms" className="text-sm text-ghost-gray">
              I agree to the{' '}
              <Link to="/terms" className="text-neon-cyan hover:text-neon-violet">Terms of Service</Link>{' '}
              and{' '}
              <Link to="/privacy" className="text-neon-cyan hover:text-neon-violet">Privacy Policy</Link>
            </label>
          </div>

          <Button type="submit" className="w-full" size="lg" loading={loading}>
            Create Account
          </Button>
        </form>

        <p className="text-center text-ghost-gray mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-neon-cyan hover:text-neon-violet font-medium">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
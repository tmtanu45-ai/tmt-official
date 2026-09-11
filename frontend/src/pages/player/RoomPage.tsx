import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { 
  Key, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Copy, 
  Check
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useState } from 'react';

type RoomState = 'NOT_REGISTERED' | 'REGISTERED' | 'WAITING_FOR_CHECKIN' | 'WAITING_FOR_RELEASE' | 'AVAILABLE' | 'EXPIRED' | 'CANCELLED';

interface RoomData {
  match: {
    id: string;
    title: string;
    scheduled_at: string;
    credential_release_at: string;
    credential_expires_at: string;
    status: string;
  };
  registration: { id: string; status: string } | null;
  checkin: { status: string } | null;
  credential: {
    state: RoomState;
    room_id: string | null;
    password: string | null;
    expires_at: string | null;
    countdown_seconds: number | null;
  };
}

const stateConfig: Record<RoomState, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'; icon: React.ReactNode }> = {
  NOT_REGISTERED: { label: 'Not Registered', variant: 'neutral', icon: <AlertCircle className="w-4 h-4" /> },
  REGISTERED: { label: 'Registered', variant: 'info', icon: <CheckCircle className="w-4 h-4" /> },
  WAITING_FOR_CHECKIN: { label: 'Waiting for Check-in', variant: 'warning', icon: <Clock className="w-4 h-4" /> },
  WAITING_FOR_RELEASE: { label: 'Waiting for Release', variant: 'warning', icon: <Clock className="w-4 h-4" /> },
  AVAILABLE: { label: 'Available', variant: 'success', icon: <Key className="w-4 h-4" /> },
  EXPIRED: { label: 'Expired', variant: 'danger', icon: <AlertCircle className="w-4 h-4" /> },
  CANCELLED: { label: 'Cancelled', variant: 'danger', icon: <AlertCircle className="w-4 h-4" /> },
};

export function RoomPage() {
  const { id } = useParams();
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState<'room' | 'password' | null>(null);

  const { data: room, isLoading, error } = useQuery({
    queryKey: ['room', id],
    queryFn: async () => {
      const { data } = await api.get(`/matches/${id}/room`);
      return data as RoomData;
    },
    enabled: !!id,
    refetchInterval: (query) => {
      if (query.state.data?.credential?.state === 'WAITING_FOR_RELEASE') {
        return 5000;
      }
      return false;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-abyss-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-neon-cyan border-t-transparent"></div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-abyss-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center py-12">
          <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
          <h2 className="font-display text-xl font-bold mb-2">Unable to Load Room</h2>
          <p className="text-ghost-gray mb-4">Unable to load room information.</p>
          <Link to="/matches" className="btn-primary inline-flex">
            Back to Matches
          </Link>
        </Card>
      </div>
    );
  }

  const { credential, match } = room;
  const stateInfo = stateConfig[credential.state];
  const expiresAt = credential.expires_at ? new Date(credential.expires_at) : null;
  const releasedAt = match.credential_release_at ? new Date(match.credential_release_at) : null;

  const handleCopy = async (text: string, type: 'room' | 'password') => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen bg-abyss-black p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="gradient-border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="font-display text-2xl font-bold">Room Credentials</h1>
            <Badge variant={stateInfo.variant} className="flex items-center gap-1">
              {stateInfo.icon}
              {stateInfo.label}
            </Badge>
          </div>

          <p className="text-ghost-gray mb-4">{match.title}</p>
          <p className="text-sm text-ghost-gray mb-6">Scheduled: {format(new Date(match.scheduled_at), 'MMM d, yyyy HH:mm')}</p>

          {credential.state === 'AVAILABLE' && (
            <div className="space-y-4">
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <p className="text-red-400 text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  DO NOT SHARE. Sharing credentials may result in disqualification and account suspension.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="label">Room ID</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-abyss-navy rounded-lg px-4 py-3 font-mono text-lg">
                      {credential.room_id}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(credential.room_id!, 'room')}
                    >
                      {copied === 'room' ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="label">Password</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-abyss-navy rounded-lg px-4 py-3 font-mono text-lg">
                      {showPassword ? credential.password : '••••••••'}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(credential.password!, 'password')}
                    >
                      {copied === 'password' ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {expiresAt && (
                <p className="text-xs text-ghost-gray">
                  Expires: {format(expiresAt, 'MMM d, yyyy HH:mm')} 
                  ({formatDistanceToNow(expiresAt, { addSuffix: true })})
                </p>
              )}
            </div>
          )}

          {credential.state === 'WAITING_FOR_RELEASE' && releasedAt && (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 mx-auto text-neon-cyan mb-4 animate-pulse" />
              <h3 className="text-lg font-medium mb-2">Waiting for Credential Release</h3>
              <p className="text-ghost-gray mb-4">
                Room credentials will be released at {format(releasedAt, 'HH:mm')}.
              </p>
              {credential.countdown_seconds && credential.countdown_seconds > 0 && (
                <div className="text-3xl font-mono font-bold text-neon-cyan tabular-nums">
                  {formatCountdown(credential.countdown_seconds)}
                </div>
              )}
            </div>
          )}

          {credential.state === 'WAITING_FOR_CHECKIN' && (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 mx-auto text-neon-gold mb-4" />
              <h3 className="text-lg font-medium mb-2">Waiting for Check-in</h3>
              <p className="text-ghost-gray mb-4">
                Complete check-in to unlock room credentials.
              </p>
              <Link to={`/matches/${match.id}/checkin`} className="btn-primary inline-flex items-center gap-2">
                <Key className="w-4 h-4" />
                Go to Check-in
              </Link>
            </div>
          )}

          {['NOT_REGISTERED', 'CANCELLED'].includes(credential.state) && (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 mx-auto text-ghost-gray mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">
                {stateConfig[credential.state]?.label || 'Not Available'}
              </h3>
              <p className="text-ghost-gray mb-4">
                {credential.state === 'NOT_REGISTERED' 
                  ? 'Register for this match to access room credentials.'
                  : 'This match has been cancelled.'}
              </p>
              {credential.state === 'NOT_REGISTERED' && (
                <Link to={`/matches/${match.id}`} className="btn-primary inline-flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Register Now
                </Link>
              )}
            </div>
          )}

          {credential.state === 'EXPIRED' && (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">Credentials Expired</h3>
              <p className="text-ghost-gray mb-4">
                The credential access window has expired.
              </p>
              {expiresAt && (
                <p className="text-sm text-ghost-gray">
                  Expired: {format(expiresAt, 'MMM d, yyyy HH:mm')}
                </p>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function formatCountdown(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
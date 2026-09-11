import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Gamepad2, 
  Clock, 
  Key,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react';
import { format } from 'date-fns';

interface Match {
  id: string;
  title: string;
  description: string | null;
  game_mode: string;
  map: string;
  team_size: string;
  max_teams: number | null;
  max_players: number | null;
  scheduled_at: string;
  registration_opens_at: string;
  registration_closes_at: string;
  checkin_opens_at: string | null;
  checkin_closes_at: string | null;
  credential_release_at: string | null;
  credential_expires_at: string | null;
  status: string;
  registration_count: number;
  created_at: string;
}

interface Registration {
  id: string;
  status: string;
  registered_at: string;
  matches: Match;
  checkins: { status: string; checked_in_at: string | null } | null;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' }> = {
  DRAFT: { label: 'Draft', variant: 'neutral' },
  OPEN: { label: 'Open', variant: 'success' },
  FULL: { label: 'Full', variant: 'warning' },
  CLOSED: { label: 'Closed', variant: 'info' },
  LIVE: { label: 'Live', variant: 'danger' },
  COMPLETED: { label: 'Completed', variant: 'neutral' },
  CANCELLED: { label: 'Cancelled', variant: 'danger' },
  EXPIRED: { label: 'Expired', variant: 'neutral' },
};

const checkinConfig: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'; icon: React.ReactNode }> = {
  NOT_OPEN: { label: 'Not Open', variant: 'neutral', icon: <Clock className="w-4 h-4" /> },
  OPEN: { label: 'Open', variant: 'warning', icon: <AlertCircle className="w-4 h-4" /> },
  CHECKED_IN: { label: 'Checked In', variant: 'success', icon: <CheckCircle className="w-4 h-4" /> },
  MISSED: { label: 'Missed', variant: 'danger', icon: <X className="w-4 h-4" /> },
  CANCELLED: { label: 'Cancelled', variant: 'neutral', icon: <X className="w-4 h-4" /> },
};

export function MatchDetailPage() {
  const { id } = useParams();
  
  const { data: match, isLoading: matchLoading } = useQuery({
    queryKey: ['match', id],
    queryFn: async () => {
      const { data } = await api.get(`/matches/${id}`);
      return data as Match;
    },
    enabled: !!id,
  });

  const { data: registration } = useQuery({
    queryKey: ['myRegistration', id],
    queryFn: async () => {
      const { data } = await api.get(`/registrations/me`);
      const reg = data.data.find((r: Registration) => r.matches.id === id);
      return reg || null;
    },
    enabled: !!id,
  });

  if (matchLoading) {
    return (
      <div className="min-h-screen bg-abyss-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-neon-cyan border-t-transparent"></div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-abyss-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center py-12">
          <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
          <h2 className="font-display text-xl font-bold mb-2">Match Not Found</h2>
          <p className="text-ghost-gray mb-4">The match you're looking for doesn't exist.</p>
          <Link to="/matches" className="btn-primary inline-flex">
            Browse Matches
          </Link>
        </Card>
      </div>
    );
  }

  const statusInfo = statusConfig[match.status] || { label: match.status, variant: 'neutral' };
  const now = new Date();
  const scheduledAt = new Date(match.scheduled_at);
  const timeUntilStart = scheduledAt.getTime() - now.getTime();

  const checkinStatus = registration?.checkins?.status || 'NOT_REGISTERED';
  const checkinInfo = checkinConfig[checkinStatus] || { label: checkinStatus, variant: 'neutral', icon: null };

  const canRegister = match.status === 'OPEN' && !registration && timeUntilStart > 0;
  const canCancel = registration && registration.status === 'CONFIRMED' && timeUntilStart > 0;
  const isRegistered = registration?.status === 'CONFIRMED';

  return (
    <div className="min-h-screen bg-abyss-black p-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link to="/matches" className="inline-flex items-center gap-2 text-ghost-gray hover:text-ghost-white">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to Matches
        </Link>
        
        <Card className="gradient-border">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="font-display text-2xl font-bold">{match.title}</h1>
              <Badge variant={statusInfo.variant} className="mt-2">{statusInfo.label}</Badge>
            </div>
          </div>
          {match.description && <p className="text-ghost-gray mb-6">{match.description}</p>}
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-neon-cyan" />
              <span>{match.game_mode}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-neon-violet" />
              <span>{match.map}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-neon-gold" />
              <span>{match.team_size}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-ghost-gray" />
              <span>{format(new Date(match.scheduled_at), 'MMM d, yyyy \'at\' HH:mm')}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6 p-4 bg-abyss-navy/50 rounded-lg">
            <div>
              <p className="text-xs text-ghost-gray">Registrations</p>
              <p className="font-medium">{match.registration_count}/{match.max_players || '∞'}</p>
            </div>
            <div>
              <p className="text-xs text-ghost-gray">Status</p>
              <p className="font-medium capitalize">{match.status.toLowerCase()}</p>
            </div>
          </div>

          <div className="space-y-2 text-sm text-ghost-gray mb-6">
            {match.checkin_opens_at && match.checkin_closes_at && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Check-in: {format(new Date(match.checkin_opens_at), 'HH:mm')} - {format(new Date(match.checkin_closes_at), 'HH:mm')}</span>
              </div>
            )}
            {match.credential_release_at && (
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4" />
                <span>Credentials: {format(new Date(match.credential_release_at), 'HH:mm')}</span>
              </div>
            )}
          </div>

          {/* Registration Section */}
          <div className="pt-4 border-t border-glass-border/50 space-y-4">
            {isRegistered && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant={checkinInfo.variant} className="flex items-center gap-1">
                      {checkinInfo.icon}
                      {checkinInfo.label}
                    </Badge>
                  </div>
                </div>
                
                {checkinStatus === 'OPEN' && (
                  <div className="p-3 bg-neon-cyan/10 border border-neon-cyan/30 rounded-lg">
                    <p className="text-sm text-neon-cyan flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Check-in is now open! <Link to={`/matches/${match.id}/checkin`} className="underline">Check in now</Link>
                    </p>
                  </div>
                )}
                
                {checkinStatus === 'CHECKED_IN' && match.credential_release_at && (
                  <div className="space-y-2">
                    <p className="text-sm text-ghost-gray">
                      Credentials release at: {format(new Date(match.credential_release_at), 'HH:mm')}
                    </p>
                    <Link to={`/matches/${match.id}/room`} className="btn-primary inline-flex items-center gap-2">
                      <Key className="w-4 h-4" />
                      View Room
                    </Link>
                  </div>
                )}
                
                <Link to={`/matches/${match.id}/room`} className="btn-secondary inline-flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Room Details
                </Link>
              </div>
            )}

            {!isRegistered && canRegister && (
              <Button className="w-full" size="lg" onClick={handleRegister}>
                Register for Match
              </Button>
            )}

            {isRegistered && canCancel && (
              <Button className="w-full" size="lg" variant="danger" onClick={handleCancel}>
                Cancel Registration
              </Button>
            )}

            {!canRegister && !isRegistered && (
              <div className="text-center text-ghost-gray py-4">
                {match.status !== 'OPEN' ? (
                  <p>Registration is not open for this match.</p>
                ) : (
                  <p>Registration has closed or match has started.</p>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );

  function handleRegister() {
    // Implement register logic
  }

  function handleCancel() {
    // Implement cancel logic
  }
}
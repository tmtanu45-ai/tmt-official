import { Link } from 'react-router-dom';
import { 
  MapPin, 
  Users, 
  Clock, 
  AlertCircle,
  Key,
  Gamepad2,
} from 'lucide-react';
import { format } from 'date-fns';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

interface MatchCardProps {
  match: {
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
  };
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

export function MatchCard({ match }: MatchCardProps) {
  const scheduledAt = new Date(match.scheduled_at);
  const now = new Date();
  const timeUntil = scheduledAt.getTime() - now.getTime();
  const isSoon = timeUntil > 0 && timeUntil < 24 * 60 * 60 * 1000;
  const isLive = match.status === 'LIVE';

  const statusInfo = statusConfig[match.status] || { label: match.status, variant: 'neutral' };
  const capacityText = match.max_players 
    ? `${match.registration_count}/${match.max_players}` 
    : `${match.registration_count} registered`;

  return (
    <Card className="gradient-border hover:border-neon-cyan/50 transition-all duration-300 group flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge variant={statusInfo.variant}>
            {statusInfo.label}
          </Badge>
          {isSoon && (
            <Badge variant="warning" className="animate-pulse">
              <AlertCircle className="w-3 h-3 mr-1" />
              Soon
            </Badge>
          )}
          {isLive && (
            <Badge variant="danger" className="animate-pulse">
              <span className="relative flex items-center">
                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse mr-1" />
                Live
              </span>
            </Badge>
          )}
        </div>
        <span className="text-xs text-ghost-gray">
          {format(scheduledAt, 'MMM d, yyyy')}
        </span>
      </div>

      {/* Title & Description */}
      <h3 className="font-display text-lg font-bold mb-2 group-hover:text-neon-cyan transition-colors">
        {match.title}
      </h3>
      {match.description && (
        <p className="text-sm text-ghost-gray mb-3 line-clamp-2">{match.description}</p>
      )}

      {/* Meta Info */}
      <div className="flex flex-wrap gap-3 text-sm text-ghost-gray mb-4">
        <span className="flex items-center gap-1">
          <Gamepad2 className="w-4 h-4" /> {match.game_mode}
        </span>
        <span className="flex items-center gap-1">
          <MapPin className="w-4 h-4" /> {match.map}
        </span>
        <span className="flex items-center gap-1">
          <Users className="w-4 h-4" /> {match.team_size}
        </span>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-abyss-navy/50 rounded-lg">
        <div>
          <p className="text-xs text-ghost-gray">Registrations</p>
          <p className="font-medium">{capacityText}</p>
        </div>
        <div>
          <p className="text-xs text-ghost-gray">Schedule</p>
          <p className="font-medium text-sm">{format(new Date(match.scheduled_at), 'HH:mm')}</p>
        </div>
      </div>

      {/* Check-in & Credential Times */}
      <div className="space-y-2 text-xs text-ghost-gray mb-4">
        {match.checkin_opens_at && (
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3" />
            <span>Check-in: {format(new Date(match.checkin_opens_at), 'HH:mm')} - {format(new Date(match.checkin_closes_at!), 'HH:mm')}</span>
          </div>
        )}
        {match.credential_release_at && (
          <div className="flex items-center gap-2">
            <Key className="w-3 h-3" />
            <span>Credentials: {format(new Date(match.credential_release_at), 'HH:mm')}</span>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="mt-auto pt-4 border-t border-glass-border/50 flex items-center justify-between">
        <span className="text-sm text-ghost-gray">
          {match.registration_count} registered
        </span>
        <Link to={`/matches/${match.id}`} className="btn-primary text-sm">
          View Details
        </Link>
      </div>
    </Card>
  );
}
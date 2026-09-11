import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { 
  Calendar, 
  CheckSquare, 
  Key, 
  Trophy, 
  
  
  ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { Card } from '../../components/ui/Card';


import { Link } from 'react-router-dom';

interface Match {
  id: string;
  title: string;
  game_mode: string;
  map: string;
  team_size: string;
  scheduled_at: string;
  status: string;
  registration_count: number;
  checkin_opens_at: string | null;
  checkin_closes_at: string | null;
  credential_release_at: string | null;
  credential_expires_at: string | null;
}

interface Registration {
  id: string;
  status: string;
  registered_at: string;
  matches: Match;
  checkins: { status: string; checked_in_at: string | null } | null;
}

interface Stats {
  matches_played: number;
  wins: number;
  kills: number;
  deaths: number;
  kd_ratio: number;
  avg_placement: number;
  win_rate: number;
}

export function DashboardPage() {
  const { data: registrations } = useQuery({
    queryKey: ['myRegistrations'],
    queryFn: async () => {
      const { data } = await api.get('/registrations/me?limit=5');
      return data.data as Registration[];
    },
  });

  const { data: upcomingMatches } = useQuery({
    queryKey: ['upcomingMatches'],
    queryFn: async () => {
      const { data } = await api.get('/matches?status=OPEN&limit=3');
      return data.data as Match[];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['playerStats'],
    queryFn: async () => {
      const { data } = await api.get('/profile/me');
      return data.stats as Stats;
    },
  });

  return (
    <div className="space-y-6 animate-in">
      {/* Welcome Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold gradient-text">Welcome back</h1>
          <p className="text-ghost-gray mt-1">Here's what's happening with your matches</p>
        </div>
        <Link to="/matches" className="btn-primary">
          <Calendar className="w-4 h-4 mr-2" />
          Browse Matches
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Matches Played" 
          value={stats?.matches_played || 0} 
          icon={Trophy} 
          color="neon-cyan" 
        />
        <StatCard 
          title="Win Rate" 
          value={`${(stats?.win_rate || 0).toFixed(1)}%`} 
          icon={Trophy} 
          color="neon-violet" 
        />
        <StatCard 
          title="K/D Ratio" 
          value={stats?.kd_ratio?.toFixed(2) || '0.00'} 
          icon={Trophy} 
          color="neon-gold" 
        />
        <StatCard 
          title="Avg Placement" 
          value={`#${(stats?.avg_placement || 0).toFixed(1)}`} 
          icon={Trophy} 
          color="ghost-gray" 
        />
      </div>

      {/* Upcoming Matches Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">Upcoming Matches</h2>
          <Link to="/matches" className="text-sm text-neon-cyan hover:text-neon-violet flex items-center gap-1">
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        
        {upcomingMatches && upcomingMatches.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingMatches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <Calendar className="w-12 h-12 mx-auto text-ghost-gray mb-4" />
            <h3 className="text-lg font-medium mb-2">No upcoming matches</h3>
            <p className="text-ghost-gray mb-4">Check back soon for new practice matches</p>
            <Link to="/matches" className="btn-primary inline-block">
              Browse Matches
            </Link>
          </Card>
        )}
      </section>

      {/* My Registrations Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">My Registrations</h2>
          <Link to="/profile" className="text-sm text-neon-cyan hover:text-neon-violet flex items-center gap-1">
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {registrations && registrations.length > 0 ? (
          <div className="space-y-3">
            {registrations.slice(0, 3).map((reg) => (
              <RegistrationCard key={reg.id} registration={reg} />
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <CheckSquare className="w-12 h-12 mx-auto text-ghost-gray mb-4" />
            <h3 className="text-lg font-medium mb-2">No active registrations</h3>
            <p className="text-ghost-gray mb-4">Register for a match to get started</p>
            <Link to="/matches" className="btn-primary inline-block">
              Browse Matches
            </Link>
          </Card>
        )}
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="font-display text-xl font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <ActionCard
            title="Browse Matches"
            description="Find upcoming practice matches"
            icon={Calendar}
            href="/matches"
            color="neon-cyan"
          />
          <ActionCard
            title="My Profile"
            description="Update your info and stats"
            icon={Trophy}
            href="/profile"
            color="neon-violet"
          />
          <ActionCard
            title="Notifications"
            description="Check alerts and messages"
            icon={CheckSquare}
            href="/notifications"
            color="neon-gold"
          />
          <ActionCard
            title="Room Credentials"
            description="Access match rooms when available"
            icon={Key}
            href="/matches"
            color="neon-cyan"
          />
        </div>
      </section>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: { 
  title: string; 
  value: string | number; 
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-ghost-gray mb-1">{title}</p>
          <p className="font-display text-3xl font-bold gradient-text">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-lg bg-${color}/20 flex items-center justify-center`}>
          <Icon className="w-6 h-6 [color:var(--color-${color})]" />
        </div>
      </div>
    </Card>
  );
}

function MatchCard({ match }: { match: Match }) {
  const scheduledAt = new Date(match.scheduled_at);
  const isSoon = scheduledAt.getTime() - Date.now() < 24 * 60 * 60 * 1000;

  return (
    <Card className="gradient-border hover:border-neon-cyan/50 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <span className={`badge ${isSoon ? 'badge-warning' : 'badge-info'}`}>
          {match.status}
        </span>
        <span className="text-xs text-ghost-gray">
          {format(scheduledAt, 'MMM d, yyyy')}
        </span>
      </div>
      <h3 className="font-display text-lg font-bold mb-2">{match.title}</h3>
      <div className="flex flex-wrap gap-2 text-sm text-ghost-gray mb-4">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-neon-cyan" /> {match.game_mode}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-neon-violet" /> {match.map}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-neon-gold" /> {match.team_size}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-ghost-gray">
          {match.registration_count} registered
        </span>
        <Link to={`/matches/${match.id}`} className="btn-secondary text-sm">
          View Details
        </Link>
      </div>
    </Card>
  );
}

function RegistrationCard({ registration }: { registration: Registration }) {
  const { matches, checkins } = registration;
  const scheduledAt = new Date(matches.scheduled_at);
  const checkinStatus = checkins?.status || 'NOT_OPEN';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CHECKED_IN': return 'badge-success';
      case 'OPEN': return 'badge-warning';
      case 'MISSED': return 'badge-danger';
      case 'AVAILABLE': return 'badge-info';
      case 'EXPIRED': return 'badge-neutral';
      default: return 'badge-neutral';
    }
  };

  return (
    <Card className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-2">
          <h3 className="font-display text-lg font-bold truncate">{matches.title}</h3>
          <span className={`badge ${getStatusColor(checkinStatus)}`}>
            {checkinStatus.replace('_', ' ')}
          </span>
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-ghost-gray">
          <span>{format(scheduledAt, 'MMM d, yyyy \'at\' HH:mm')}</span>
          <span>{matches.game_mode} • {matches.map} • {matches.team_size}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:ml-4">
        <Link to={`/matches/${matches.id}/room`} className="btn-primary text-sm">
          <Key className="w-4 h-4 mr-1" />
          Room
        </Link>
        <Link to={`/matches/${matches.id}`} className="btn-secondary text-sm">
          Details
        </Link>
      </div>
    </Card>
  );
}

function ActionCard({ title, description, icon: Icon, href, color }: { 
  title: string; 
  description: string; 
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  color: string;
}) {
  return (
    <Link to={href} className="card-glass gradient-border hover:border-neon-cyan/50 transition-all duration-300 group">
      <div className={`w-12 h-12 rounded-lg bg-${color}/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
        <Icon className="w-6 h-6 [color:var(--color-${color})]" />
      </div>
      <h3 className="font-display text-lg font-bold mb-1">{title}</h3>
      <p className="text-sm text-ghost-gray">{description}</p>
    </Link>
  );
}
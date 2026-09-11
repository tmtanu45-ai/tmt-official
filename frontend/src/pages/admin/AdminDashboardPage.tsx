import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { 
  Users, 
  Calendar, 
  CheckSquare, 
  Key, 
  Shield, 
  TrendingUp, 
  TrendingDown
} from 'lucide-react';

interface DashboardMetrics {
  registrations_today: number;
  registrations_this_week: number;
  active_matches: number;
  upcoming_matches: number;
  checkin_rate_24h: number;
  credential_access_rate_24h: number;
  security_events_24h: number;
  banned_players: number;
  charts: {
    registrations_7d: { date: string; count: number }[];
    checkins_7d: { date: string; rate: number }[];
    security_events_7d: { date: string; count: number }[];
  };
}

export function AdminDashboardPage() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['adminDashboardMetrics'],
    queryFn: async () => {
      const { data } = await api.get('/admin/dashboard/metrics');
      return data as DashboardMetrics;
    },
  });

  if (isLoading) {
    return <div className="min-h-screen bg-abyss-black flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-4 border-neon-cyan border-t-transparent"></div></div>;
  }

  if (!metrics) {
    return (
      <div className="min-h-screen bg-abyss-black p-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-display text-3xl font-bold gradient-text mb-6">Admin Dashboard</h1>
          <div className="text-center py-12 text-ghost-gray">Unable to load dashboard metrics</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-abyss-black p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="font-display text-3xl font-bold gradient-text">Admin Dashboard</h1>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard 
            title="Registrations Today" 
            value={metrics.registrations_today.toLocaleString()} 
            icon={Users} 
            color="neon-cyan" 
            trend="+12%" 
            up={true} 
          />
          <MetricCard 
            title="Active Matches" 
            value={metrics.active_matches} 
            icon={Calendar} 
            color="neon-violet" 
            trend="+2" 
            up={true} 
          />
          <MetricCard 
            title="Check-in Rate (24h)" 
            value={`${metrics.checkin_rate_24h}%`} 
            icon={CheckSquare} 
            color="neon-gold" 
            trend="+1.2%" 
            up={true} 
          />
          <MetricCard 
            title="Security Events (24h)" 
            value={metrics.security_events_24h} 
            icon={Shield} 
            color="red" 
            trend="-1" 
            up={false} 
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="font-display text-lg font-bold mb-4">Registrations (7 days)</h3>
            <div className="h-64 flex items-end justify-between gap-2 px-2 pb-2">
              {metrics.charts.registrations_7d.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-end">
                  <div 
                    className="w-full bg-neon-cyan/50 rounded-t transition-all hover:bg-neon-cyan"
                    style={{ height: `${Math.max(5, (d.count / 1500) * 100)}%` }}
                  />
                  <span className="text-xs text-ghost-gray mt-1">{d.date}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="font-display text-lg font-bold mb-4">Check-in Rate (7 days)</h3>
            <div className="h-64 flex items-end justify-between gap-2 px-2 pb-2">
              {metrics.charts.checkins_7d.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-end">
                  <div 
                    className="w-full bg-neon-violet/50 rounded-t transition-all hover:bg-neon-violet"
                    style={{ height: `${Math.max(5, (d.rate / 100) * 100)}%` }}
                  />
                  <span className="text-xs text-ghost-gray mt-1">{d.date}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="font-display text-lg font-bold mb-4">Security Events (7 days)</h3>
            <div className="h-64 flex items-end justify-between gap-2 px-2 pb-2">
              {metrics.charts.security_events_7d.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-end">
                  <div 
                    className="w-full bg-red-500/50 rounded-t transition-all hover:bg-red-500"
                    style={{ height: `${Math.max(5, (d.count / 20) * 100)}%` }}
                  />
                  <span className="text-xs text-ghost-gray mt-1">{d.date}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="font-display text-lg font-bold mb-4">Quick Stats</h3>
            <div className="grid grid-cols-2 gap-4">
              <QuickStat title="Registrations This Week" value={metrics.registrations_this_week.toLocaleString()} icon={Users} color="neon-cyan" />
              <QuickStat title="Upcoming Matches" value={metrics.upcoming_matches} icon={Calendar} color="neon-violet" />
              <QuickStat title="Credential Access Rate" value={`${metrics.credential_access_rate_24h}%`} icon={Key} color="neon-gold" />
              <QuickStat title="Banned Players" value={metrics.banned_players} icon={Shield} color="red" />
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <h3 className="font-display text-lg font-bold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <ActionCard title="Create Match" description="Set up new practice match" icon={Calendar} color="neon-cyan" href="/admin/matches" />
            <ActionCard title="Manage Players" description="View and moderate players" icon={Users} color="neon-violet" href="/admin/players" />
            <ActionCard title="Release Credentials" description="Manage room credentials" icon={Key} color="neon-gold" href="/admin/credentials" />
            <ActionCard title="Security Monitor" description="View security events" icon={Shield} color="red" href="/admin/security" />
          </div>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, color, trend, up }: any) {
  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-ghost-gray mb-1">{title}</p>
          <p className="font-display text-3xl font-bold gradient-text">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-lg bg-${color}/20 flex items-center justify-center`}>
          {Icon && <Icon className="w-6 h-6 [color:var(--color-${color})]" />}
        </div>
      </div>
      <div className="absolute bottom-4 right-4 text-xs font-medium text-green-400">
        {up ? <TrendingUp className="w-3 h-3 inline" /> : <TrendingDown className="w-3 h-3 inline" />}
        {trend}
      </div>
    </Card>
  );
}

function QuickStat({ title, value, icon: Icon, color }: any) {
  return (
    <div className="p-4 bg-abyss-navy/50 rounded-lg border border-glass-border/50">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-ghost-gray mb-1">{title}</p>
          <p className="font-display text-xl font-bold gradient-text">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg bg-${color}/20 flex items-center justify-center`}>
          {Icon && <Icon className="w-5 h-5 [color:var(--color-${color})]" />}
        </div>
      </div>
    </div>
  );
}

function ActionCard({ title, description, icon: Icon, color, href }: any) {
  return (
    <a href={href} className="card-glass gradient-border hover:border-neon-cyan/50 transition-all group">
      <div className={`w-12 h-12 rounded-lg bg-${color}/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
        {Icon && <Icon className="w-6 h-6 [color:var(--color-${color})]" />}
      </div>
      <h3 className="font-display text-lg font-bold mb-1">{title}</h3>
      <p className="text-sm text-ghost-gray">{description}</p>
    </a>
  );
}
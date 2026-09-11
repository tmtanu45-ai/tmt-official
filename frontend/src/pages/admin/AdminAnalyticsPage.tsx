import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { 
  Users, 
  CheckSquare, 
  Trophy, 
  Shield, 
  TrendingUp, 
  TrendingDown
} from 'lucide-react';

interface AdminAnalyticsResponse {
  registrations: { total: number; week: number; trend: string; up: boolean };
  checkins: { rate: number; week: number; trend: string; up: boolean };
  completions: { total: number; week: number; trend: string; up: boolean };
  security: { events: number; week: number; trend: string; up: boolean };
  charts: {
    registrations_7d: { date: string; count: number }[];
    checkins_7d: { date: string; rate: number }[];
    security_7d: { date: string; count: number }[];
  };
  top_matches: {
    id: string;
    title: string;
    registrations: number;
    checkin_rate: number;
  }[];
}

export function AdminAnalyticsPage() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['adminAnalytics'],
    queryFn: async () => {
      const { data } = await api.get('/admin/analytics');
      return data as AdminAnalyticsResponse;
    },
  });

  if (isLoading) {
    return <div className="min-h-screen bg-abyss-black flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-4 border-neon-cyan border-t-transparent"></div></div>;
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-abyss-black p-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-display text-3xl font-bold gradient-text mb-6">Analytics Dashboard</h1>
          <div className="text-center py-12 text-ghost-gray">Unable to load analytics</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-abyss-black p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="font-display text-3xl font-bold gradient-text">Analytics Dashboard</h1>

        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard 
            title="Registrations (Week)" 
            value={analytics.registrations.week.toLocaleString()} 
            icon={Users} 
            color="neon-cyan" 
            trend={analytics.registrations.trend} 
            up={analytics.registrations.up} 
          />
          <MetricCard 
            title="Check-in Rate (Week)" 
            value={`${analytics.checkins.week}%`} 
            icon={CheckSquare} 
            color="neon-violet" 
            trend={analytics.checkins.trend} 
            up={analytics.checkins.up} 
          />
          <MetricCard 
            title="Match Completions" 
            value={analytics.completions.week} 
            icon={Trophy} 
            color="neon-gold" 
            trend={analytics.completions.trend} 
            up={analytics.completions.up} 
          />
          <MetricCard 
            title="Security Events" 
            value={analytics.security.week} 
            icon={Shield} 
            color="red" 
            trend={analytics.security.trend} 
            up={analytics.security.up} 
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="font-display text-lg font-bold mb-4">Registrations (7 days)</h3>
            <div className="h-64 flex items-end justify-between gap-2 px-2 pb-2">
              {analytics.charts.registrations_7d.map((d, i) => (
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
              {analytics.charts.checkins_7d.map((d, i) => (
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
              {analytics.charts.security_7d.map((d, i) => (
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
            <h3 className="font-display text-lg font-bold mb-4">Top Matches by Registrations</h3>
            <div className="space-y-3">
              {analytics.top_matches.map((match, i) => (
                <div key={match.id} className="flex items-center justify-between p-3 bg-abyss-navy/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-neon-cyan/20 flex items-center justify-center font-bold text-neon-cyan">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-medium">{match.title}</p>
                      <p className="text-sm text-ghost-gray">{match.registrations} registrations</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-neon-cyan">{match.checkin_rate}%</p>
                    <p className="text-xs text-ghost-gray">Check-in Rate</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
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
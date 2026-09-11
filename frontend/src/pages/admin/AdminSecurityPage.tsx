import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { 
  Shield, 
  AlertCircle, 
  User, 
  Wifi, 
  Cpu, 
  Search, 
  Clock,
  AlertTriangle
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useState } from 'react';

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  user_id: string | null;
  user_email: string | null;
  ip_address: string;
  user_agent: string | null;
  description: string;
  metadata: Record<string, unknown> | null;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

const severityConfig = {
  LOW: { label: 'Low', variant: 'info' as const, color: 'neon-cyan' },
  MEDIUM: { label: 'Medium', variant: 'warning' as const, color: 'neon-gold' },
  HIGH: { label: 'High', variant: 'danger' as const, color: 'red' },
  CRITICAL: { label: 'Critical', variant: 'danger' as const, color: 'red' },
};

const typeIcons: Record<string, React.ReactNode> = {
  FAILED_LOGIN: <AlertCircle className="w-4 h-4" />,
  RATE_LIMIT_EXCEEDED: <Cpu className="w-4 h-4" />,
  SUSPICIOUS_ACTIVITY: <Shield className="w-4 h-4" />,
  PRIVILEGE_ESCALATION_ATTEMPT: <User className="w-4 h-4" />,
  CREDENTIAL_ACCESS_DENIED: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2-2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2-2v6a2 2 0 002 2h10a2 2 0 00-2-2H6a2 2 0 00-2-2v6a2 2 0 002 2h10z" /></svg>,
  UNUSUAL_REGISTRATION_PATTERN: <User className="w-4 h-4" />,
  MULTIPLE_ACCOUNTS_SAME_IP: <Wifi className="w-4 h-4" />,
};

async function fetchSecurityEvents(page: number, filter: string, severityFilter: string) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: '50',
    ...(filter && filter !== 'all' && { resolved: filter === 'unresolved' ? 'false' : 'true' }),
    ...(severityFilter && { severity: severityFilter }),
  });
  const { data } = await api.get(`/admin/security/events?${params}`);
  return data as { data: SecurityEvent[]; pagination: any };
}

export function AdminSecurityPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<'all' | 'unresolved'>('unresolved');
  const [severityFilter, setSeverityFilter] = useState('');

  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['adminSecurityEvents', page, filter, severityFilter],
    queryFn: () => fetchSecurityEvents(page, filter, severityFilter),
  });

  const resolveMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/admin/security/events/${id}/resolve`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminSecurityEvents'] }),
  });

  if (isLoading && page === 1) {
    return <div className="min-h-screen bg-abyss-black flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-4 border-neon-cyan border-t-transparent"></div></div>;
  }

  const events = eventsData?.data || [];
  const pagination = eventsData?.pagination;

  const stats = {
    total: events.length,
    unresolved: events.filter(e => !e.resolved).length,
    critical: events.filter(e => e.severity === 'CRITICAL').length,
    last24h: events.filter(e => new Date(e.created_at) > new Date(Date.now() - 86400000)).length,
  };

  return (
    <div className="min-h-screen bg-abyss-black p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold gradient-text">Security Events</h1>
            <p className="text-ghost-gray">Monitor and resolve security incidents</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Events" value={stats.total} icon={Shield} color="neon-cyan" />
          <StatCard title="Unresolved" value={stats.unresolved} icon={AlertCircle} color="neon-gold" />
          <StatCard title="Critical" value={stats.critical} icon={AlertTriangle} color="red" />
          <StatCard title="Last 24h" value={stats.last24h} icon={Clock} color="neon-violet" />
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ghost-gray" />
              <input
                type="text"
                placeholder="Search IP, user, type..."
                className="input-field pl-10"
              />
            </div>
            <select
              value={filter}
              onChange={(e) => { setFilter(e.target.value as 'all' | 'unresolved'); setPage(1); }}
              className="input-field py-2 px-3 max-w-xs"
            >
              <option value="unresolved">Unresolved Only</option>
              <option value="all">All Events</option>
            </select>
            <select
              value={severityFilter}
              onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
              className="input-field py-2 px-3 max-w-xs"
            >
              <option value="">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </Card>

        {/* Events Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-abyss-navy border-b border-glass-border">
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">Time</th>
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">Severity</th>
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">User / IP</th>
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">Description</th>
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass-border/50">
                {events.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-ghost-gray">No security events found</td></tr>
                ) : (
                  events.map((event) => {
                    return (
                      <tr key={event.id} className="hover:bg-white/5">
                        <td className="px-4 py-3">
                          <p className="font-mono text-sm">{format(new Date(event.created_at), 'MMM d, HH:mm:ss')}</p>
                          <p className="text-xs text-ghost-gray">{formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {typeIcons[event.event_type] || <Shield className="w-4 h-4" />}
                            <span className="font-mono text-sm">{event.event_type.replace(/_/g, ' ')}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={severityConfig[event.severity as keyof typeof severityConfig]?.variant || 'neutral'} className="text-capitalize">{event.severity}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-mono text-sm">{event.ip_address}</p>
                          <p className="text-xs text-ghost-gray">{event.user_email || 'Unknown'}</p>
                        </td>
                        <td className="px-4 py-3 text-ghost-gray">{event.description}</td>
                        <td className="px-4 py-3">
                          <Badge variant={event.resolved ? 'success' : 'warning'}>
                            {event.resolved ? 'Resolved' : 'Unresolved'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {!event.resolved && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-green-400 hover:bg-green-500/10"
                              onClick={() => resolveMutation.mutate(event.id)}
                              disabled={resolveMutation.isPending}
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                              Resolve
                            </Button>
                          )}
                          {event.resolved && (
                            <span className="text-xs text-ghost-gray">By {event.resolved_by}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Pagination */}
        {pagination && pagination.total_pages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
            <span className="px-4 text-ghost-gray">Page {page} of {pagination.total_pages}</span>
            <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.min(pagination.total_pages, p + 1))} disabled={page === pagination.total_pages}>Next</Button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
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
    </Card>
  );
}


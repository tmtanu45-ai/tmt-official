import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { 
  Search, 
  Clock, 
  User, 
  Database, 
  Shield,
  Key,
  Lock,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useState } from 'react';

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  admin_id: string | null;
  admin_email: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

const actionIcons: Record<string, React.ReactNode> = {
  'match.create': <Database className="w-4 h-4" />,
  'match.update': <Database className="w-4 h-4" />,
  'match.status_change': <Database className="w-4 h-4" />,
  'match.cancel': <Database className="w-4 h-4" />,
  'credential.release': <Key className="w-4 h-4" />,
  'credential.expire': <Lock className="w-4 h-4" />,
  'credential.revoke': <Shield className="w-4 h-4" />,
  'player.suspend': <User className="w-4 h-4" />,
  'player.ban': <Shield className="w-4 h-4" />,
  'player.unsuspend': <User className="w-4 h-4" />,
  'registration.cancel': <User className="w-4 h-4" />,
  'checkin.force': <Clock className="w-4 h-4" />,
  'admin.invite': <User className="w-4 h-4" />,
  'admin.update': <Shield className="w-4 h-4" />,
};

export function AdminAuditLogsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const { data: logsData, isLoading } = useQuery({
    queryKey: ['adminAuditLogs', page, search, actionFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(search && { search }),
        ...(actionFilter && { action: actionFilter }),
      });
      const { data } = await api.get(`/admin/audit-logs?${params}`);
      return data as { data: AuditLog[]; pagination: any };
    },
  });

  if (isLoading && page === 1) {
    return <div className="min-h-screen bg-abyss-black flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-4 border-neon-cyan border-t-transparent"></div></div>;
  }

  const logs = logsData?.data || [];
  const pagination = logsData?.pagination;

  return (
    <div className="min-h-screen bg-abyss-black p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold gradient-text">Audit Logs</h1>
            <p className="text-ghost-gray">Track all administrative actions</p>
          </div>
          <Button variant="secondary">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Export CSV
          </Button>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ghost-gray" />
              <input
                type="text"
                placeholder="Search action, entity, admin..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="input-field pl-10"
              />
            </div>
            <select
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
              className="input-field py-2 px-3 max-w-xs"
            >
              <option value="">All Actions</option>
              <option value="match.create">Match Created</option>
              <option value="match.update">Match Updated</option>
              <option value="match.status_change">Status Changed</option>
              <option value="match.cancel">Match Cancelled</option>
              <option value="credential.release">Credential Released</option>
              <option value="credential.expire">Credential Expired</option>
              <option value="player.ban">Player Banned</option>
              <option value="registration.cancel">Registration Cancelled</option>
              <option value="checkin.force">Force Check-in</option>
              <option value="admin.invite">Admin Invited</option>
            </select>
          </div>
        </Card>

        {/* Audit Logs Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-abyss-navy border-b border-glass-border">
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">Time</th>
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">Action</th>
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">Entity</th>
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">Admin</th>
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass-border/50">
                {logs.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-ghost-gray">No audit logs found</td></tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/5">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-mono text-sm">{format(new Date(log.created_at), 'MMM d, HH:mm:ss')}</p>
                          <p className="text-xs text-ghost-gray">{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {actionIcons[log.action] || <Shield className="w-4 h-4" />}
                          <span className="font-mono text-sm">{log.action}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{log.entity_type}</p>
                        <p className="text-sm text-ghost-gray font-mono">{log.entity_id?.slice(0, 8)}...</p>
                      </td>
                      <td className="px-4 py-3 text-ghost-gray">{log.admin_email || 'System'}</td>
                      <td className="px-4 py-3">
                        <pre className="text-xs text-ghost-gray bg-abyss-navy p-2 rounded max-h-20 overflow-auto whitespace-pre-wrap">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  ))
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
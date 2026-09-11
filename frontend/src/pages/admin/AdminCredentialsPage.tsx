import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { 
  Key, 
  Lock, 
  AlertCircle, 
  Eye
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useState } from 'react';

interface Credential {
  id: string;
  match_id: string;
  match_title: string;
  scheduled_at: string;
  status: 'LOCKED' | 'AVAILABLE' | 'EXPIRED';
  released_at: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

const statusConfig = {
  LOCKED: { label: 'Locked', variant: 'neutral' as const, icon: <Lock className="w-3 h-3" /> },
  AVAILABLE: { label: 'Available', variant: 'success' as const, icon: <Key className="w-3 h-3" /> },
  EXPIRED: { label: 'Expired', variant: 'danger' as const, icon: <AlertCircle className="w-3 h-3" /> },
};

export function AdminCredentialsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const { data: credsData, isLoading } = useQuery({
    queryKey: ['adminCredentials', page, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(statusFilter && { status: statusFilter }),
      });
      const { data } = await api.get(`/admin/credentials?${params}`);
      return data as { data: Credential[]; pagination: any };
    },
  });

  const releaseMutation = useMutation({
    mutationFn: async (matchId: string) => {
      await api.post(`/admin/credentials/${matchId}/release`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminCredentials'] }),
  });

  const expireMutation = useMutation({
    mutationFn: async (matchId: string) => {
      await api.post(`/admin/credentials/${matchId}/expire`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminCredentials'] }),
  });

  if (isLoading && page === 1) {
    return <div className="min-h-screen bg-abyss-black flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-4 border-neon-cyan border-t-transparent"></div></div>;
  }

  const credentials = credsData?.data || [];
  const pagination = credsData?.pagination;

  return (
    <div className="min-h-screen bg-abyss-black p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold gradient-text">Room Credentials</h1>
            <p className="text-ghost-gray">Manage and monitor room credential release</p>
          </div>
        </div>

        <Card className="p-4">
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="input-field py-2 px-3 max-w-xs">
            <option value="">All Statuses</option>
            <option value="LOCKED">Locked</option>
            <option value="AVAILABLE">Available</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </Card>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-abyss-navy border-b border-glass-border">
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">Match</th>
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">Scheduled</th>
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">Released</th>
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">Expires</th>
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass-border/50">
                {credentials.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-ghost-gray">No credentials found</td></tr>
                ) : (
                  credentials.map((cred) => {
                    const info = statusConfig[cred.status as keyof typeof statusConfig] || { label: cred.status, variant: 'neutral', icon: null };
                    const releasedAt = cred.released_at ? new Date(cred.released_at) : null;
                    const expiresAt = new Date(cred.expires_at);
                    const isExpired = expiresAt < new Date();
                    
                    return (
                      <tr key={cred.match_id} className="hover:bg-white/5">
                        <td className="px-4 py-3">
                          <p className="font-medium">{cred.match_title}</p>
                          <p className="text-sm text-ghost-gray font-mono">{cred.match_id.slice(0, 8)}...</p>
                        </td>
                        <td className="px-4 py-3">{format(new Date(cred.scheduled_at), 'MMM d, yyyy HH:mm')}</td>
                        <td className="px-4 py-3">
                          <Badge variant={info.variant as 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'} className="flex items-center gap-1">
                            {info.icon}
                            {info.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {cred.status === 'LOCKED' && releasedAt ? (
                            <span className="text-ghost-gray">In {formatDistanceToNow(new Date(cred.released_at!), { addSuffix: true })}</span>
                          ) : cred.status === 'AVAILABLE' && releasedAt ? (
                            <span className="text-neon-cyan">{format(releasedAt, 'HH:mm')}</span>
                          ) : (
                            <span className="text-ghost-gray">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={isExpired ? 'text-red-400' : 'text-ghost-gray'}>
                            {format(new Date(cred.expires_at), 'HH:mm')} ({formatDistanceToNow(new Date(cred.expires_at), { addSuffix: true })})
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {cred.status === 'LOCKED' && (
                              <Button variant="ghost" size="sm" className="text-neon-cyan hover:bg-neon-cyan/10" onClick={() => releaseMutation.mutate(cred.match_id)} disabled={releaseMutation.isPending}>
                                <Key className="w-4 h-4 mr-1" /> Release Now
                              </Button>
                            )}
                            {cred.status === 'AVAILABLE' && (
                              <Button variant="ghost" size="sm" className="text-red-400 hover:bg-red-500/10" onClick={() => expireMutation.mutate(cred.match_id)} disabled={expireMutation.isPending}>
                                <Lock className="w-4 h-4 mr-1" /> Expire Now
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => {}}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
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

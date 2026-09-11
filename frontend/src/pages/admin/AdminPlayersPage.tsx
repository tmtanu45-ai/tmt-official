import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { 
  Search, 
  Ban, 
  UserCheck, 
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';

interface Player {
  id: string;
  username: string;
  display_name: string;
  ff_uid: string;
  email: string;
  account_status: 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'DELETED';
  created_at: string;
}

const statusConfig = {
  ACTIVE: { label: 'Active', variant: 'success' as const },
  SUSPENDED: { label: 'Suspended', variant: 'warning' as const },
  BANNED: { label: 'Banned', variant: 'danger' as const },
  DELETED: { label: 'Deleted', variant: 'neutral' as const },
};

export function AdminPlayersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data: playersData, isLoading } = useQuery({
    queryKey: ['adminPlayers', page, search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
      });
      const { data } = await api.get(`/admin/players?${params}`);
      return data as { data: Player[]; pagination: any };
    },
  });

  const suspendMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/admin/players/${id}/suspend`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminPlayers'] }),
  });

  const banMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/admin/players/${id}/ban`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminPlayers'] }),
  });

  const unsuspendMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/admin/players/${id}/unsuspend`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminPlayers'] }),
  });

  if (isLoading && page === 1) {
    return <div className="min-h-screen bg-abyss-black flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-4 border-neon-cyan border-t-transparent"></div></div>;
  }

  const players = playersData?.data || [];
  const pagination = playersData?.pagination;

  return (
    <div className="min-h-screen bg-abyss-black p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold gradient-text">Player Management</h1>
            <p className="text-ghost-gray">View, suspend, or ban players</p>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ghost-gray" />
              <input
                type="text"
                placeholder="Search username, display name, or UID..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="input-field pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="input-field py-2 px-3 max-w-xs"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="BANNED">Banned</option>
            </select>
          </div>
        </Card>

        {/* Players Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-abyss-navy border-b border-glass-border">
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">Player</th>
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">FF UID</th>
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">Joined</th>
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass-border/50">
                {players.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-ghost-gray">No players found</td></tr>
                ) : (
                  players.map((player) => {
                    const info = statusConfig[player.account_status as keyof typeof statusConfig] || { label: player.account_status, variant: 'neutral' as const };
                    return (
                      <tr key={player.id} className="hover:bg-white/5">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">{player.display_name || 'N/A'}</p>
                            <p className="text-sm text-ghost-gray">@{player.username}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-ghost-gray">{player.ff_uid || 'N/A'}</td>
                        <td className="px-4 py-3 text-ghost-gray">{player.email}</td>
                        <td className="px-4 py-3"><Badge variant={info.variant}>{info.label}</Badge></td>
                        <td className="px-4 py-3 text-ghost-gray">{format(new Date(player.created_at), 'MMM d, yyyy')}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {player.account_status === 'ACTIVE' && (
                              <>
                                <Button variant="ghost" size="sm" className="text-yellow-400 hover:bg-yellow-500/10" onClick={() => suspendMutation.mutate(player.id)} disabled={suspendMutation.isPending}>
                                  <Ban className="w-4 h-4 mr-1" /> Suspend
                                </Button>
                                <Button variant="ghost" size="sm" className="text-red-400 hover:bg-red-500/10" onClick={() => { if (confirm('Ban this player?')) banMutation.mutate(player.id); }} disabled={banMutation.isPending}>
                                  <AlertCircle className="w-4 h-4 mr-1" /> Ban
                                </Button>
                              </>
                            )}
                            {player.account_status === 'SUSPENDED' && (
                              <Button variant="ghost" size="sm" className="text-green-400 hover:bg-green-500/10" onClick={() => unsuspendMutation.mutate(player.id)} disabled={unsuspendMutation.isPending}>
                                <UserCheck className="w-4 h-4 mr-1" /> Unsuspend
                              </Button>
                            )}
                            {player.account_status === 'BANNED' && (
                              <Button variant="ghost" size="sm" className="text-green-400 hover:bg-green-500/10" onClick={() => unsuspendMutation.mutate(player.id)} disabled={unsuspendMutation.isPending}>
                                <CheckCircle className="w-4 h-4 mr-1" /> Unban
                              </Button>
                            )}
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
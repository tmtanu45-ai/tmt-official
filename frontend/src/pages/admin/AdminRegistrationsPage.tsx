import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { 
  Search, 
  CheckCircle, 
  X, 
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';

interface Registration {
  id: string;
  match_id: string;
  match_title: string;
  player_id: string;
  player_username: string;
  player_display_name: string;
  ff_uid: string;
  status: 'CONFIRMED' | 'CANCELLED' | 'WAITLISTED';
  checkin_status: 'NOT_OPEN' | 'OPEN' | 'CHECKED_IN' | 'MISSED' | 'CANCELLED';
  registered_at: string;
  checked_in_at: string | null;
}

const statusConfig = {
  CONFIRMED: { label: 'Confirmed', variant: 'success' as const },
  CANCELLED: { label: 'Cancelled', variant: 'danger' as const },
  WAITLISTED: { label: 'Waitlisted', variant: 'warning' as const },
};

const checkinConfig = {
  NOT_OPEN: { label: 'Not Open', variant: 'neutral' as const },
  OPEN: { label: 'Open', variant: 'warning' as const },
  CHECKED_IN: { label: 'Checked In', variant: 'success' as const },
  MISSED: { label: 'Missed', variant: 'danger' as const },
  CANCELLED: { label: 'Cancelled', variant: 'neutral' as const },
};

export function AdminRegistrationsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [checkinFilter, setCheckinFilter] = useState('');

  const { data: regsData, isLoading } = useQuery({
    queryKey: ['adminRegistrations', page, search, statusFilter, checkinFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
        ...(checkinFilter && { checkin_status: checkinFilter }),
      });
      const { data } = await api.get(`/admin/registrations?${params}`);
      return data as { data: Registration[]; pagination: any };
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/admin/registrations/${id}/cancel`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminRegistrations'] }),
  });

  const forceCheckinMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/admin/registrations/${id}/force-checkin`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminRegistrations'] }),
  });

  if (isLoading && page === 1) {
    return <div className="min-h-screen bg-abyss-black flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-4 border-neon-cyan border-t-transparent"></div></div>;
  }

  const registrations = regsData?.data || [];
  const pagination = regsData?.pagination;

  return (
    <div className="min-h-screen bg-abyss-black p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="font-display text-3xl font-bold gradient-text">Registration Management</h1>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ghost-gray" />
              <input
                type="text"
                placeholder="Search player, match, UID..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="input-field pl-10"
              />
            </div>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="input-field py-2 px-3 max-w-xs">
              <option value="">All Statuses</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="WAITLISTED">Waitlisted</option>
            </select>
            <select value={checkinFilter} onChange={(e) => { setCheckinFilter(e.target.value); setPage(1); }} className="input-field py-2 px-3 max-w-xs">
              <option value="">All Check-ins</option>
              <option value="CHECKED_IN">Checked In</option>
              <option value="OPEN">Open</option>
              <option value="MISSED">Missed</option>
              <option value="NOT_OPEN">Not Open</option>
            </select>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-abyss-navy border-b border-glass-border">
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">Match</th>
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">Player</th>
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">FF UID</th>
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">Reg. Status</th>
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">Check-in</th>
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">Registered</th>
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass-border/50">
                {registrations.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-ghost-gray">No registrations found</td></tr>
                ) : (
                  registrations.map((reg) => {
                    const statusInf = statusConfig[reg.status as keyof typeof statusConfig] || { label: reg.status, variant: 'neutral' as const };
                    const checkinInf = checkinConfig[reg.checkin_status as keyof typeof checkinConfig] || { label: reg.checkin_status, variant: 'neutral' as const };
                    return (
                      <tr key={reg.id} className="hover:bg-white/5">
                        <td className="px-4 py-3 font-medium">{reg.match_title}</td>
                        <td className="px-4 py-3">{reg.player_display_name || reg.player_username}</td>
                        <td className="px-4 py-3 font-mono text-ghost-gray">{reg.ff_uid}</td>
                        <td className="px-4 py-3"><Badge variant={statusInf.variant}>{statusInf.label}</Badge></td>
                        <td className="px-4 py-3"><Badge variant={checkinInf.variant}>{checkinInf.label}</Badge></td>
                        <td className="px-4 py-3 text-ghost-gray">{format(new Date(reg.registered_at), 'MMM d, HH:mm')}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                            {reg.status === 'CONFIRMED' && reg.checkin_status !== 'CHECKED_IN' && (
                              <Button variant="ghost" size="sm" className="text-green-400 hover:bg-green-500/10" onClick={() => forceCheckinMutation.mutate(reg.id)} disabled={forceCheckinMutation.isPending}>
                                <CheckCircle className="w-4 h-4 mr-1" /> Force Check-in
                              </Button>
                            )}
                            {reg.status === 'CONFIRMED' && (
                              <Button variant="ghost" size="sm" className="text-red-400 hover:bg-red-500/10" onClick={() => { if (confirm('Cancel this registration?')) cancelMutation.mutate(reg.id); }} disabled={cancelMutation.isPending}>
                                <X className="w-4 h-4 mr-1" /> Cancel
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


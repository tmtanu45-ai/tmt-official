import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';

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
  created_at: string;
  updated_at: string;
}

const statusConfig = {
  DRAFT: { label: 'Draft', variant: 'neutral' },
  OPEN: { label: 'Open', variant: 'success' },
  FULL: { label: 'Full', variant: 'warning' },
  CLOSED: { label: 'Closed', variant: 'info' },
  LIVE: { label: 'Live', variant: 'danger' },
  COMPLETED: { label: 'Completed', variant: 'neutral' },
  CANCELLED: { label: 'Cancelled', variant: 'danger' },
  EXPIRED: { label: 'Expired', variant: 'neutral' },
};

const gameModeOptions = ['CLASSIC', 'RANKED', 'CUSTOM'] as const;
const mapOptions = ['BERMUDA', 'PURGATORY', 'KALAHARI', 'ALPINE', 'NEOX'] as const;
const teamSizeOptions = ['SOLO', 'DUO', 'SQUAD'] as const;

export function AdminMatchesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);

  const { data: matchesData, isLoading } = useQuery({
    queryKey: ['adminMatches', page, search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
      });
      const { data: matchesResponse } = await api.get(`/admin/matches?${params}`);
      return matchesResponse as { data: Match[]; pagination: any };
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Match>) => {
      const { data: createResponse } = await api.post('/admin/matches', data);
      return createResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminMatches'] });
      setShowCreate(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Match> & { id: string }) => {
      const { id, ...rest } = data;
      const { data: updateResponse } = await api.patch(`/admin/matches/${id}`, rest);
      return updateResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminMatches'] });
      setEditingMatch(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/matches/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminMatches'] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await api.post(`/admin/matches/${id}/status`, { status, confirm: status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminMatches'] });
    },
  });

  if (isLoading && page === 1) {
    return <div className="min-h-screen bg-abyss-black flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-4 border-neon-cyan border-t-transparent"></div></div>;
  }

  const matches = matchesData?.data || [];
  const pagination = matchesData?.pagination;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    const numericFields = ['max_teams', 'max_players'];
    numericFields.forEach(field => {
      if (data[field]) data[field] = parseInt(data[field] as string, 10).toString();
    });
    if (editingMatch) {
      updateMutation.mutate({ id: editingMatch.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const renderMatches = () => {
    if (matches.length === 0) {
      return (
        <tr>
          <td colSpan={9} className="px-4 py-12 text-center text-ghost-gray">
            No matches found
          </td>
        </tr>
      );
    }

    return matches.map((match) => {
      const info = statusConfig[match.status as keyof typeof statusConfig] || { label: match.status, variant: 'neutral' };
      return (
        <tr key={match.id} className="hover:bg-white/5">
          <td className="px-4 py-3">
            <div>
              <p className="font-medium">{match.title}</p>
              <p className="text-sm text-ghost-gray font-mono">{match.id.slice(0, 8)}...</p>
            </div>
          </td>
          <td className="px-4 py-3"><Badge variant="info">{match.game_mode}</Badge></td>
          <td className="px-4 py-3">{match.map}</td>
          <td className="px-4 py-3">{match.team_size}</td>
          <td className="px-4 py-3">{format(new Date(match.scheduled_at), 'MMM d, HH:mm')}</td>
          <td className="px-4 py-3 text-ghost-gray text-sm">{format(new Date(match.registration_opens_at), 'MMM d, HH:mm')}</td>
          <td className="px-4 py-3"><Badge variant={info.variant as 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'}>{info.label}</Badge></td>
          <td className="px-4 py-3">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => statusMutation.mutate({ id: match.id, status: 'OPEN' })} disabled={match.status !== 'DRAFT'}>Open</Button>
              <Button variant="ghost" size="sm" onClick={() => statusMutation.mutate({ id: match.id, status: 'CLOSED' })} disabled={match.status !== 'OPEN' && match.status !== 'FULL'}>Close</Button>
              <Button variant="ghost" size="sm" onClick={() => statusMutation.mutate({ id: match.id, status: 'LIVE' })} disabled={match.status !== 'CLOSED'}>Live</Button>
              <Button variant="ghost" size="sm" onClick={() => statusMutation.mutate({ id: match.id, status: 'COMPLETED' })} disabled={match.status !== 'LIVE'}>Complete</Button>
              <Button variant="ghost" size="sm" className="text-red-400 hover:bg-red-500/10" onClick={() => statusMutation.mutate({ id: match.id, status: 'CANCELLED' })} disabled={['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(match.status)}>Cancel</Button>
            </div>
          </td>
          <td className="px-4 py-3">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditingMatch(match)}><Eye className="w-4 h-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => setEditingMatch(match)}><Edit className="w-4 h-4" /></Button>
              <Button variant="ghost" size="sm" className="text-red-400 hover:bg-red-500/10" onClick={() => { if (confirm('Delete this match?')) deleteMutation.mutate(match.id); }}><Trash2 className="w-4 h-4" /></Button>
            </div>
          </td>
        </tr>
      );
    });
  };

  return (
    <div className="min-h-screen bg-abyss-black p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold gradient-text">Match Management</h1>
            <p className="text-ghost-gray">Create, edit, and manage practice matches</p>
          </div>
          <Button onClick={() => { setEditingMatch(null); setShowCreate(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Create Match
          </Button>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ghost-gray" />
              <input
                type="text"
                placeholder="Search matches..."
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
              <option value="DRAFT">Draft</option>
              <option value="OPEN">Open</option>
              <option value="FULL">Full</option>
              <option value="CLOSED">Closed</option>
              <option value="LIVE">Live</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="EXPIRED">Expired</option>
            </select>
            <Button variant="secondary" onClick={() => { setSearch(''); setStatusFilter(''); setPage(1); }}>
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          </div>
        </Card>

        {/* Matches Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-abyss-navy border-b border-glass-border">
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">Match</th>
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">Mode</th>
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">Map</th>
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">Team</th>
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">Scheduled</th>
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">Reg Opens</th>
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">Regs</th>
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass-border/50">
                {renderMatches()}
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

        {/* Create/Edit Modal */}
        {(showCreate || editingMatch) && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto gradient-border">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl font-bold">{editingMatch ? 'Edit Match' : 'Create Match'}</h2>
                <Button variant="ghost" size="sm" onClick={() => { setShowCreate(false); setEditingMatch(null); }}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Title" name="title" defaultValue={editingMatch?.title || ''} required />
                <label className="label">Description</label>
                <textarea
                  name="description"
                  defaultValue={editingMatch?.description || ''}
                  rows={3}
                  className="input-field resize-none"
                />
                
                <div className="grid grid-cols-3 gap-4">
                  <select name="game_mode" defaultValue={editingMatch?.game_mode || 'CLASSIC'} className="input-field" required>
                    {gameModeOptions.map(mode => <option key={mode} value={mode}>{mode}</option>)}
                  </select>
                  <select name="map" defaultValue={editingMatch?.map || 'BERMUDA'} className="input-field" required>
                    {mapOptions.map(map => <option key={map} value={map}>{map}</option>)}
                  </select>
                  <select name="team_size" defaultValue={editingMatch?.team_size || 'SQUAD'} className="input-field" required>
                    {teamSizeOptions.map(size => <option key={size} value={size}>{size}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input label="Max Teams" type="number" name="max_teams" defaultValue={editingMatch?.max_teams || ''} />
                  <Input label="Max Players" type="number" name="max_players" defaultValue={editingMatch?.max_players || ''} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input label="Scheduled At" type="datetime-local" name="scheduled_at" defaultValue={editingMatch?.scheduled_at ? new Date(editingMatch.scheduled_at).toISOString().slice(0, 16) : ''} required />
                  <Input label="Registration Opens" type="datetime-local" name="registration_opens_at" defaultValue={editingMatch?.registration_opens_at ? new Date(editingMatch.registration_opens_at).toISOString().slice(0, 16) : ''} required />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input label="Registration Closes" type="datetime-local" name="registration_closes_at" defaultValue={editingMatch?.registration_closes_at ? new Date(editingMatch.registration_closes_at).toISOString().slice(0, 16) : ''} required />
                  <Input label="Check-in Opens" type="datetime-local" name="checkin_opens_at" defaultValue={editingMatch?.checkin_opens_at ? new Date(editingMatch.checkin_opens_at).toISOString().slice(0, 16) : ''} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input label="Check-in Closes" type="datetime-local" name="checkin_closes_at" defaultValue={editingMatch?.checkin_closes_at ? new Date(editingMatch.checkin_closes_at).toISOString().slice(0, 16) : ''} />
                  <Input label="Credential Release" type="datetime-local" name="credential_release_at" defaultValue={editingMatch?.credential_release_at ? new Date(editingMatch.credential_release_at).toISOString().slice(0, 16) : ''} required />
                </div>

                <Input label="Credential Expires" type="datetime-local" name="credential_expires_at" defaultValue={editingMatch?.credential_expires_at ? new Date(editingMatch.credential_expires_at).toISOString().slice(0, 16) : ''} required />

                {editingMatch && (
                  <div className="flex items-center justify-between pt-4 border-t border-glass-border/50">
                    <div className="flex items-center gap-2">
                      <select 
                        defaultValue={editingMatch.status} 
                        onChange={(e) => statusMutation.mutate({ id: editingMatch.id, status: e.target.value })}
                        className="input-field py-2 px-3 max-w-xs"
                      >
                        <option value="DRAFT">Draft</option>
                        <option value="OPEN">Open</option>
                        <option value="FULL">Full</option>
                        <option value="CLOSED">Closed</option>
                        <option value="LIVE">Live</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="CANCELLED">Cancelled</option>
                        <option value="EXPIRED">Expired</option>
                      </select>
                    </div>
                    <Button type="button" variant="danger" onClick={() => { if (confirm('Delete this match?')) { deleteMutation.mutate(editingMatch.id); setEditingMatch(null); } }}>
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-glass-border/50">
                  <Button type="submit" className="flex-1" loading={createMutation.isPending || updateMutation.isPending}>
                    {editingMatch ? 'Update' : 'Create'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => { setShowCreate(false); setEditingMatch(null); }}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}


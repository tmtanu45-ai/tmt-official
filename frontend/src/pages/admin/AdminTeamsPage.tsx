import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { 
  Search, 
  Users, 
  Plus, 
  Edit,
  Trash2,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';

interface Team {
  id: string;
  match_id: string;
  match_title: string;
  name: string;
  captain_id: string;
  captain_username: string;
  captain_display_name: string;
  members_count: number;
  max_members: number;
  created_at: string;
}

export function AdminTeamsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [viewMembers, setViewMembers] = useState<Team | null>(null);

  const { data: teamsData, isLoading } = useQuery({
    queryKey: ['adminTeams', page, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
      });
      const { data: teamsResponse } = await api.get(`/admin/teams?${params}`);
      return teamsResponse as { data: Team[]; pagination: any };
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Team>) => {
      const { data: createResponse } = await api.post('/admin/teams', data);
      return createResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminTeams'] });
      setShowCreate(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/teams/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminTeams'] }),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    if (editingTeam) {
      // updateMutation would need to be implemented
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading && page === 1) {
    return <div className="min-h-screen bg-abyss-black flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-4 border-neon-cyan border-t-transparent"></div></div>;
  }

  const teams = teamsData?.data || [];
  const pagination = teamsData?.pagination;

  return (
    <div className="min-h-screen bg-abyss-black p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold gradient-text">Team Management</h1>
            <p className="text-ghost-gray">View and manage team registrations</p>
          </div>
          <Button onClick={() => { setEditingTeam(null); setShowCreate(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Create Team
          </Button>
        </div>

        <Card className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ghost-gray" />
              <input
                type="text"
                placeholder="Search team name or captain..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="input-field pl-10"
              />
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-abyss-navy border-b border-glass-border">
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">Team</th>
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">Match</th>
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">Captain</th>
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">Members</th>
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">Created</th>
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass-border/50">
                {teams.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-ghost-gray">No teams found</td></tr>
                ) : (
                  teams.map((team) => (
                    <tr key={team.id} className="hover:bg-white/5">
                      <td className="px-4 py-3 font-medium">{team.name}</td>
                      <td className="px-4 py-3">{team.match_title}</td>
                      <td className="px-4 py-3">{team.captain_display_name || team.captain_username}</td>
                      <td className="px-4 py-3">{team.members_count}/{team.max_members}</td>
                      <td className="px-4 py-3 text-ghost-gray">{format(new Date(team.created_at), 'MMM d, yyyy')}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setViewMembers(team)}>
                            <Users className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setEditingTeam(team)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-400 hover:bg-red-500/10" onClick={() => { if (confirm('Delete this team?')) deleteMutation.mutate(team.id); }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
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

        {/* Create/Edit Modal */}
        {(showCreate || editingTeam) && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto gradient-border">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl font-bold">{editingTeam ? 'Edit Team' : 'Create Team'}</h2>
                <Button variant="ghost" size="sm" onClick={() => { setShowCreate(false); setEditingTeam(null); }}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Team Name" name="name" defaultValue={editingTeam?.name || ''} required />
                <Input label="Match ID" name="match_id" defaultValue={editingTeam?.match_id || ''} required />
                <Input label="Captain ID" name="captain_id" defaultValue={editingTeam?.captain_id || ''} required />
                <Input label="Max Members" type="number" name="max_members" defaultValue={editingTeam?.max_members || 4} required />
                <div className="flex gap-3 pt-4 border-t border-glass-border/50">
                  <Button type="submit" className="flex-1" loading={createMutation.isPending}>
                    {editingTeam ? 'Update' : 'Create'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => { setShowCreate(false); setEditingTeam(null); }}>Cancel</Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* View Members Modal */}
        {viewMembers && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto gradient-border">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl font-bold">{viewMembers.name} - Members</h2>
                <Button variant="ghost" size="sm" onClick={() => setViewMembers(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="text-center text-ghost-gray py-8">
                Member management - integrate with team members API
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
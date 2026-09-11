import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Search, 
  Edit,
  Trash2,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';

interface AdminUser {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  email: string;
  role: 'PLAYER' | 'MODERATOR' | 'ADMIN' | 'SUPER_ADMIN';
  permissions: Record<string, unknown>;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

const roleConfig = {
  SUPER_ADMIN: { label: 'Super Admin', variant: 'danger' as const, icon: <Shield className="w-3 h-3" /> },
  ADMIN: { label: 'Admin', variant: 'warning' as const, icon: <Shield className="w-3 h-3" /> },
  MODERATOR: { label: 'Moderator', variant: 'info' as const, icon: <Shield className="w-3 h-3" /> },
  PLAYER: { label: 'Player', variant: 'neutral' as const, icon: <Users className="w-3 h-3" /> },
};

export function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'MODERATOR' | 'ADMIN'>('MODERATOR');
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['adminUsers', page, search, roleFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
        ...(roleFilter && { role: roleFilter }),
      });
      const { data: usersResponse } = await api.get(`/admin/users?${params}`);
      return usersResponse as { data: AdminUser[]; pagination: any };
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: { email: string; role: string }) => {
      const { data: inviteResponse } = await api.post('/admin/users/invite', data);
      return inviteResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      setShowInvite(false);
      setInviteEmail('');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; role: string; permissions: Record<string, unknown> }) => {
      const { id, ...rest } = data;
      const { data: updateResponse } = await api.patch(`/admin/users/${id}`, rest);
      return updateResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      setEditingUser(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    },
  });

  if (isLoading && page === 1) {
    return <div className="min-h-screen bg-abyss-black flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-4 border-neon-cyan border-t-transparent"></div></div>;
  }

  const users = usersData?.data || [];
  const pagination = usersData?.pagination;

  return (
    <div className="min-h-screen bg-abyss-black p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold gradient-text">Admin Users</h1>
            <p className="text-ghost-gray">Manage administrator accounts and roles</p>
          </div>
          <Button onClick={() => setShowInvite(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Admin
          </Button>
        </div>

        {/* Invite Modal */}
        {showInvite && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md gradient-border">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-bold">Invite Admin</h2>
                <Button variant="ghost" size="sm" onClick={() => { setShowInvite(false); setInviteEmail(''); }}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); inviteMutation.mutate({ email: inviteEmail, role: inviteRole }); }} className="space-y-4">
                <Input 
                  label="Email" 
                  type="email" 
                  value={inviteEmail} 
                  onChange={(e) => setInviteEmail(e.target.value)} 
                  placeholder="admin@example.com" 
                  required 
                />
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as 'MODERATOR' | 'ADMIN')} className="input-field" required>
                  <option value="MODERATOR">Moderator</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <div className="flex gap-3">
                  <Button type="submit" className="flex-1" loading={inviteMutation.isPending}>
                    Send Invite
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => { setShowInvite(false); setInviteEmail(''); }}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* Edit Modal */}
        {editingUser && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md gradient-border">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-bold">Edit Admin</h2>
                <Button variant="ghost" size="sm" onClick={() => setEditingUser(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); if (editingUser) { const formData = new FormData(e.target as HTMLFormElement); const role = formData.get('role'); updateMutation.mutate({ id: editingUser.id, role: role as string, permissions: editingUser.permissions }); setEditingUser(null); } }} className="space-y-4">
                <p className="text-sm text-ghost-gray">Editing: {editingUser.display_name || editingUser.username || editingUser.email}</p>
                <select 
                  name="role" 
                  defaultValue={editingUser.role} 
                  className="input-field"
                  required
                >
                  <option value="MODERATOR">Moderator</option>
                  <option value="ADMIN">Admin</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
                <div className="flex gap-3">
                  <Button type="submit" className="flex-1">Update Role</Button>
                  <Button type="button" variant="secondary" onClick={() => setEditingUser(null)}>Cancel</Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ghost-gray" />
              <input
                type="text"
                placeholder="Search username, email..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="input-field pl-10"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              className="input-field py-2 px-3 max-w-xs"
            >
              <option value="">All Roles</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="ADMIN">Admin</option>
              <option value="MODERATOR">Moderator</option>
              <option value="PLAYER">Player</option>
            </select>
          </div>
        </Card>

        {/* Admins Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-abyss-navy border-b border-glass-border">
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">User</th>
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">Role</th>
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">Last Login</th>
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">Created</th>
                  <th className="px-4 py-3 text-left font-medium text-ghost-gray">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass-border/50">
                {users.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-ghost-gray">No admin users found</td></tr>
                ) : (
                  users.map((user) => {
                    const info = roleConfig[user.role as keyof typeof roleConfig] || { label: user.role, variant: 'neutral' as const, icon: null };
                    return (
                      <tr key={user.id} className="hover:bg-white/5">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">{user.display_name || user.username || 'N/A'}</p>
                            <p className="text-sm text-ghost-gray">@{user.username || 'N/A'}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-ghost-gray">{user.email}</td>
                        <td className="px-4 py-3">
                          <Badge variant={info.variant} className="flex items-center gap-1">
                            {info.icon}
                            {info.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-ghost-gray">
                          {user.last_login ? format(new Date(user.last_login), 'MMM d, HH:mm') : 'Never'}
                        </td>
                        <td className="px-4 py-3 text-ghost-gray">
                          {format(new Date(user.created_at), 'MMM d, yyyy')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setEditingUser(user)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            {user.role !== 'SUPER_ADMIN' && (
                              <Button variant="ghost" size="sm" className="text-red-400 hover:bg-red-500/10" onClick={() => { if (confirm('Remove this admin?')) deleteMutation.mutate(user.id); }} disabled={deleteMutation.isPending}>
                                <Trash2 className="w-4 h-4" />
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


import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { 
  Trophy, 
  Target, 
  Edit2, 
  Save, 
  X, 
  Camera
} from 'lucide-react';
import { useState } from 'react';

interface Profile {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  ff_uid: string | null;
  in_game_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  account_status: 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'DELETED';
  profile_completion_pct: number;
  stats?: {
    matches_played: number;
    wins: number;
    kills: number;
    deaths: number;
    kd_ratio: number;
    avg_placement: number;
    win_rate: number;
  };
  created_at: string;
  updated_at: string;
}

export function ProfilePage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data } = await api.get('/profile/me');
      return data as Profile;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Profile>) => {
      const { data: response } = await api.patch('/profile/me', data);
      return response as Profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setEditing(false);
    },
  });

  const avatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/profile/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-abyss-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-neon-cyan border-t-transparent"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-abyss-black flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center py-12">
          <p className="text-ghost-gray">Profile not found</p>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    updateMutation.mutate(data);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        alert('Only JPEG, PNG, and WebP images are allowed');
        return;
      }
      setUploading(true);
      avatarMutation.mutate(file, {
        onSettled: () => setUploading(false),
      });
    }
  };

  return (
    <div className="min-h-screen bg-abyss-black p-4">
      <div className="max-w-3xl mx-auto space-y-6 animate-in">
        {/* Profile Header */}
        <Card className="gradient-border">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-neon-cyan to-neon-violet flex items-center justify-center text-abyss-black font-bold text-3xl overflow-hidden">
                {profile.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt={profile.display_name || profile.username || 'Avatar'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (profile.display_name?.[0] || profile.username?.[0] || 'U').toUpperCase()
                )}
              </div>
              {editing && (
                <label className="absolute bottom-0 right-0 cursor-pointer">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleAvatarUpload}
                    className="sr-only"
                    disabled={uploading}
                  />
                  <Button variant="ghost" size="sm" className="bg-abyss-black" disabled={uploading}>
                    <Camera className="w-4 h-4" />
                  </Button>
                </label>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="font-display text-2xl font-bold">
                  {editing ? (
                    <Input
                      name="display_name"
                      defaultValue={profile.display_name || ''}
                      className="bg-transparent w-auto"
                    />
                  ) : (
                    profile.display_name || 'Unnamed Player'
                  )}
                </h1>
                <Badge variant="success">{profile.account_status}</Badge>
              </div>
              <p className="text-ghost-gray">@{profile.username}</p>
              <p className="text-sm text-ghost-gray mt-1">
                FF UID: {profile.ff_uid || 'Not set'} | In-Game: {profile.in_game_name || 'Not set'}
              </p>
              <div className="flex items-center gap-2 mt-3">
                <div className="flex-1 w-full bg-abyss-navy rounded-lg h-4">
                  <div 
                    className="bg-gradient-to-r from-neon-cyan to-neon-violet h-full rounded-lg transition-all"
                    style={{ width: `${profile.profile_completion_pct}%` }}
                  />
                </div>
                <span className="text-sm text-ghost-gray">{profile.profile_completion_pct}% complete</span>
              </div>
            </div>
            <div className="flex gap-2">
              {editing ? (
                <>
                  <Button type="submit" form="profile-form" loading={updateMutation.isPending}>
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </>
              ) : (
                <Button variant={editing ? 'primary' : 'secondary'} onClick={() => setEditing(true)}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  {editing ? 'Save' : 'Edit Profile'}
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="Matches Played" 
            value={profile.stats?.matches_played || 0} 
            icon={Trophy} 
            color="neon-cyan" 
          />
          <StatCard 
            title="Wins" 
            value={profile.stats?.wins || 0} 
            icon={Trophy} 
            color="neon-violet" 
          />
          <StatCard 
            title="K/D Ratio" 
            value={profile.stats?.kd_ratio?.toFixed(2) || '0.00'} 
            icon={Target} 
            color="neon-gold" 
          />
          <StatCard 
            title="Avg Placement" 
            value={`#${profile.stats?.avg_placement?.toFixed(1) || '0.0'}`} 
            icon={Target} 
            color="ghost-gray" 
          />
        </div>

        {/* Details & Edit Form */}
        <Card>
          <h2 className="font-display text-xl font-bold mb-4">Profile Details</h2>
          
          <form id="profile-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="Username" 
                name="username" 
                defaultValue={profile.username || ''} 
                disabled={!editing || !profile.username} 
                helperText={!editing ? 'Cannot change username after creation' : ''}
              />
              <Input 
                label="Display Name" 
                name="display_name" 
                defaultValue={profile.display_name || ''} 
                disabled={!editing} 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="Free Fire UID" 
                name="ff_uid" 
                defaultValue={profile.ff_uid || ''} 
                disabled={!editing} 
                helperText="8-12 digits"
              />
              <Input 
                label="In-Game Name" 
                name="in_game_name" 
                defaultValue={profile.in_game_name || ''} 
                disabled={!editing} 
              />
            </div>
<label className="label">Bio</label>
            <textarea
              name="bio"
              defaultValue={profile.bio || ''}
              disabled={!editing}
              rows={3}
              className="input-field resize-none"
            />
            {editing && (
              <div className="flex gap-3 pt-4 border-t border-glass-border/50">
                <Button type="submit" className="flex-1" loading={updateMutation.isPending}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
                <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            )}
          </form>
        </Card>

        {/* Account Info */}
        <Card>
          <h3 className="font-display text-lg font-bold mb-4">Account Information</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-ghost-gray">Account Status</span>
              <Badge variant="success">{profile.account_status}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-ghost-gray">Member Since</span>
              <span>{new Date(profile.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ghost-gray">Last Updated</span>
              <span>{new Date(profile.updated_at).toLocaleDateString()}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: { title: string; value: string | number; icon: React.ComponentType<{ className?: string }>; color: string }) {
  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-ghost-gray mb-1">{title}</p>
          <p className="font-display text-3xl font-bold gradient-text">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-lg bg-${color}/20 flex items-center justify-center`}>
          <Icon className="w-6 h-6 [color:var(--color-${color})]" />
        </div>
      </div>
    </Card>
  );
}
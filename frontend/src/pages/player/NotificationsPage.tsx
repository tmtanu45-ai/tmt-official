import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { 
  Bell, 
  Check, 
  Clock, 
  Shield, 
  Mail, 
  X, 
  Filter,
  CheckCircle,
  Key
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  match_id: string | null;
  read: boolean;
  read_at: string | null;
  created_at: string;
}

interface Preferences {
  in_app: boolean;
  email: boolean;
  push: boolean;
  registration_alerts: boolean;
  match_alerts: boolean;
  checkin_reminders: boolean;
  credential_alerts: boolean;
  security_alerts: boolean;
}

const typeIcons: Record<string, React.ReactNode> = {
  CREDENTIAL_RELEASED: <Key className="w-4 h-4" />,
  CHECKIN_OPEN: <Clock className="w-4 h-4" />,
  CHECKIN_REMINDER: <Clock className="w-4 h-4" />,
  CHECKIN_CONFIRMED: <Check className="w-4 h-4" />,
  CHECKIN_MISSED: <X className="w-4 h-4" />,
  REGISTRATION_CONFIRMED: <Mail className="w-4 h-4" />,
  MATCH_UPDATE: <Clock className="w-4 h-4" />,
  CREDENTIAL_EXPIRED: <X className="w-4 h-4" />,
  MATCH_CANCELLED: <X className="w-4 h-4" />,
  MATCH_COMPLETED: <Check className="w-4 h-4" />,
  SECURITY_ALERT: <Shield className="w-4 h-4" />,
  ACCOUNT_SUSPENDED: <Shield className="w-4 h-4" />,
  ACCOUNT_BANNED: <Shield className="w-4 h-4" />,
  ADMIN_MESSAGE: <Mail className="w-4 h-4" />,
};

const typeColors: Record<string, string> = {
  CREDENTIAL_RELEASED: 'neon-cyan',
  CHECKIN_OPEN: 'neon-gold',
  CHECKIN_REMINDER: 'neon-gold',
  CHECKIN_CONFIRMED: 'success',
  CHECKIN_MISSED: 'danger',
  REGISTRATION_CONFIRMED: 'info',
  MATCH_UPDATE: 'neon-violet',
  CREDENTIAL_EXPIRED: 'warning',
  MATCH_CANCELLED: 'danger',
  MATCH_COMPLETED: 'success',
  SECURITY_ALERT: 'red',
  ACCOUNT_SUSPENDED: 'red',
  ACCOUNT_BANNED: 'danger',
  ADMIN_MESSAGE: 'neon-violet',
};

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const [filter] = useState<'all' | 'unread'>('all');
  const [showPrefs, setShowPrefs] = useState(false);

  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await api.get('/notifications?limit=50');
      return data as { data: Notification[]; pagination: any; unread_count: number };
    },
  });

  const { data: prefs } = useQuery({
    queryKey: ['notificationPreferences'],
    queryFn: async () => {
      const { data } = await api.get('/notifications/preferences');
      return data as Preferences;
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.patch('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const updatePrefsMutation = useMutation({
    mutationFn: async (data: Partial<Preferences>) => {
      const { data: response } = await api.patch('/notifications/preferences', data);
      return response as Preferences;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] });
      setShowPrefs(false);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-abyss-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-neon-cyan border-t-transparent"></div>
      </div>
    );
  }

  const notifications = notificationsData?.data || [];
  const unreadCount = notificationsData?.unread_count || 0;

  const filtered = filter === 'unread' ? notifications.filter(n => !n.read) : notifications;

  const handlePreferenceChange = (key: keyof Preferences, value: boolean) => {
    updatePrefsMutation.mutate({ [key]: value });
  };

  return (
    <div className="min-h-screen bg-abyss-black p-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold gradient-text flex items-center gap-2">
              <Bell className="w-6 h-6" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="danger" className="ml-2">{unreadCount}</Badge>
              )}
            </h1>
            <p className="text-ghost-gray mt-1">Your alerts and updates</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setShowPrefs(true)}>
              <Filter className="w-4 h-4 mr-1" />
              Preferences
            </Button>
            {unreadCount > 0 && (
              <Button variant="secondary" size="sm" onClick={() => markAllReadMutation.mutate()} loading={markAllReadMutation.isPending}>
                Mark All Read
              </Button>
            )}
          </div>
        </div>

        {showPrefs && prefs && (
          <Card className="gradient-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold">Notification Preferences</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowPrefs(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <PreferenceToggle 
                label="In-App Notifications" 
                description="Show notifications in the app"
                value={prefs.in_app} 
                onChange={(v) => handlePreferenceChange('in_app', v)} 
              />
              <PreferenceToggle 
                label="Email Notifications" 
                description="Receive email notifications"
                value={prefs.email} 
                onChange={(v) => handlePreferenceChange('email', v)} 
              />
              <div className="border-t border-glass-border pt-4 space-y-3">
                <p className="text-sm text-ghost-gray">Notification Types</p>
                <PreferenceToggle 
                  label="Registration Alerts" 
                  value={prefs.registration_alerts} 
                  onChange={(v) => handlePreferenceChange('registration_alerts', v)} 
                />
                <PreferenceToggle 
                  label="Match Alerts" 
                  value={prefs.match_alerts} 
                  onChange={(v) => handlePreferenceChange('match_alerts', v)} 
                />
                <PreferenceToggle 
                  label="Check-in Reminders" 
                  value={prefs.checkin_reminders} 
                  onChange={(v) => handlePreferenceChange('checkin_reminders', v)} 
                />
                <PreferenceToggle 
                  label="Credential Alerts" 
                  value={prefs.credential_alerts} 
                  onChange={(v) => handlePreferenceChange('credential_alerts', v)} 
                />
                <PreferenceToggle 
                  label="Security Alerts" 
                  value={prefs.security_alerts} 
                  onChange={(v) => handlePreferenceChange('security_alerts', v)} 
                />
              </div>
            </div>
          </Card>
        )}

        {filtered.length === 0 ? (
          <Card className="text-center py-12">
            <Bell className="w-12 h-12 mx-auto text-ghost-gray mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">
              {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
            </h3>
            <p className="text-ghost-gray">
              {filter === 'unread' 
                ? 'No unread notifications' 
                : 'You\'ll see notifications here when you register for matches or when events occur'}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((notification) => (
              <NotificationItem 
                key={notification.id} 
                notification={notification} 
                onRead={markReadMutation.mutate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PreferenceToggle({ label, description, value, onChange }: { 
  label: string; 
  description?: string;
  value: boolean; 
  onChange: (v: boolean) => void; 
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium">{label}</p>
        {description && <p className="text-sm text-ghost-gray">{description}</p>}
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input 
          type="checkbox" 
          checked={value} 
          onChange={(e) => onChange(e.target.checked)} 
          className="sr-only peer" 
        />
        <div className="w-11 h-6 bg-glass-border peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-neon-cyan/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-glass-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neon-cyan"></div>
      </label>
    </div>
  );
}

function NotificationItem({ notification, onRead }: { notification: Notification; onRead: (id: string) => void }) {
  const Icon = typeIcons[notification.type] || <Bell className="w-4 h-4" />;
  const color = typeColors[notification.type] || 'ghost-gray';
  
  return (
    <Card className={`flex items-start gap-4 ${!notification.read ? 'bg-neon-cyan/5 border-neon-cyan/20' : ''}`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-${color}/20`}>
        {Icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium">{notification.title}</h3>
          {!notification.read && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 px-2 py-0"
              onClick={() => onRead(notification.id)}
            >
              <CheckCircle className="w-3 h-3" />
            </Button>
          )}
        </div>
        <p className="text-sm text-ghost-gray mt-1">{notification.message}</p>
        <p className="text-xs text-ghost-gray mt-2">{formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}</p>
      </div>
    </Card>
  );
}
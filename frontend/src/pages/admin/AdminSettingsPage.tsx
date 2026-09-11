import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { 
  Settings, 
  Save, 
  Bell, 
  Shield, 
  Globe, 
  Database 
} from 'lucide-react';

export function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    platform_name: 'TMT OFFICIAL eSports',
    platform_description: 'Free Fire practice-match platform',
    registration_enabled: true,
    max_teams_per_match: 100,
    max_players_per_match: 400,
    checkin_window_minutes: 30,
    credential_release_buffer_minutes: 15,
    email_notifications: true,
    maintenance_mode: false,
  });

  const handleChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-abyss-black p-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="font-display text-3xl font-bold gradient-text flex items-center gap-3">
          <Settings className="w-8 h-8" />
          Platform Settings
        </h1>

        {/* General Settings */}
        <Card>
          <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5" />
            General
          </h2>
          <div className="space-y-4">
            <Input label="Platform Name" value={settings.platform_name} onChange={(e) => handleChange('platform_name', e.target.value)} />
            <Input label="Description" value={settings.platform_description} onChange={(e) => handleChange('platform_description', e.target.value)} />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Registration Enabled</p>
                <p className="text-sm text-ghost-gray">Allow new player registrations</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={settings.registration_enabled} onChange={(e) => handleChange('registration_enabled', e.target.checked)} className="sr-only peer" />
                <div className="w-11 h-6 bg-glass-border peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-neon-cyan/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-glass-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neon-cyan"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Maintenance Mode</p>
                <p className="text-sm text-ghost-gray">Disable all player access (admins only)</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={settings.maintenance_mode} onChange={(e) => handleChange('maintenance_mode', e.target.checked)} className="sr-only peer" />
                <div className="w-11 h-6 bg-glass-border peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-neon-cyan/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-glass-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
              </label>
            </div>
          </div>
        </Card>

        {/* Match Limits */}
        <Card>
          <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
            <Database className="w-5 h-5" />
            Match Limits
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Max Teams per Match" type="number" value={settings.max_teams_per_match} onChange={(e) => handleChange('max_teams_per_match', parseInt(e.target.value))} />
            <Input label="Max Players per Match" type="number" value={settings.max_players_per_match} onChange={(e) => handleChange('max_players_per_match', parseInt(e.target.value))} />
            <Input label="Check-in Window (minutes)" type="number" value={settings.checkin_window_minutes} onChange={(e) => handleChange('checkin_window_minutes', parseInt(e.target.value))} />
            <Input label="Credential Release Buffer (minutes)" type="number" value={settings.credential_release_buffer_minutes} onChange={(e) => handleChange('credential_release_buffer_minutes', parseInt(e.target.value))} />
          </div>
        </Card>

        {/* Email Settings */}
        <Card>
          <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Email Notifications
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Email Notifications</p>
              <p className="text-sm text-ghost-gray">Send email notifications for match events</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={settings.email_notifications} onChange={(e) => handleChange('email_notifications', e.target.checked)} className="sr-only peer" />
              <div className="w-11 h-6 bg-glass-border peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-neon-cyan/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-glass-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neon-cyan"></div>
            </label>
          </div>
        </Card>

        {/* Security */}
        <Card className="border-red-500/30">
          <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2 text-red-400">
            <Shield className="w-5 h-5" />
            Security (Requires Super Admin)
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-red-500/10 rounded-lg border border-red-500/30">
              <div>
                <p className="font-medium">Rotate Encryption Keys</p>
                <p className="text-sm text-ghost-gray">Generate new encryption keys for room credentials (requires re-encryption of all credentials)</p>
              </div>
              <Button variant="danger">Rotate Keys</Button>
            </div>
            <div className="flex items-center justify-between p-4 bg-red-500/10 rounded-lg border border-red-500/30">
              <div>
                <p className="font-medium">Reset All Credentials</p>
                <p className="text-sm text-ghost-gray">Expire all active room credentials immediately</p>
              </div>
              <Button variant="danger">Expire All</Button>
            </div>
          </div>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button size="lg">
            <Save className="w-4 h-4 mr-2" />
            Save All Settings
          </Button>
        </div>
      </div>
    </div>
  );
}


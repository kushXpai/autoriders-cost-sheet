import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Mail, Plus, X, Save, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { getEmailSettings, setEmailSettings, generateId } from '@/lib/storage';
import type { EmailSettings as EmailSettingsType } from '@/types';

export default function EmailSettings() {
  const [settings, setSettings] = useState<EmailSettingsType>({
    id: generateId(),
    manager_emails: [],
    ceo_email: '',
    notifications_enabled: true,
    updated_at: new Date().toISOString(),
  });
  const [newManagerEmail, setNewManagerEmail] = useState('');

  useEffect(() => {
    const savedSettings = getEmailSettings();
    if (savedSettings) {
      setSettings(savedSettings);
    }
  }, []);

  const handleAddManagerEmail = () => {
    const email = newManagerEmail.trim().toLowerCase();
    if (!email) {
      toast.error('Please enter an email address');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (settings.manager_emails.includes(email)) {
      toast.error('This email is already added');
      return;
    }
    setSettings(prev => ({
      ...prev,
      manager_emails: [...prev.manager_emails, email],
    }));
    setNewManagerEmail('');
  };

  const handleRemoveManagerEmail = (email: string) => {
    setSettings(prev => ({
      ...prev,
      manager_emails: prev.manager_emails.filter(e => e !== email),
    }));
  };

  const handleSave = () => {
    if (settings.notifications_enabled) {
      if (settings.manager_emails.length === 0) {
        toast.error('Please add at least one manager email');
        return;
      }
      if (!settings.ceo_email) {
        toast.error('Please enter CEO email');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.ceo_email)) {
        toast.error('Please enter a valid CEO email address');
        return;
      }
    }

    const updatedSettings = {
      ...settings,
      updated_at: new Date().toISOString(),
    };
    setEmailSettings(updatedSettings);
    setSettings(updatedSettings);
    toast.success('Email settings saved successfully');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Email Notification Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure email addresses for approval workflow notifications
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Enable or disable email notifications for the approval workflow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notifications">Enable Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Send email alerts when cost sheets are submitted, approved, or rejected
              </p>
            </div>
            <Switch
              id="notifications"
              checked={settings.notifications_enabled}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, notifications_enabled: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Manager Emails
          </CardTitle>
          <CardDescription>
            Managers will receive notifications when cost sheets are submitted for approval
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="Enter manager email address"
              value={newManagerEmail}
              onChange={(e) => setNewManagerEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddManagerEmail();
                }
              }}
            />
            <Button onClick={handleAddManagerEmail} variant="outline">
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>

          {settings.manager_emails.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {settings.manager_emails.map((email) => (
                <Badge
                  key={email}
                  variant="secondary"
                  className="px-3 py-1.5 text-sm flex items-center gap-2"
                >
                  <Mail className="w-3 h-3" />
                  {email}
                  <button
                    onClick={() => handleRemoveManagerEmail(email)}
                    className="ml-1 hover:text-destructive transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No manager emails added yet</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            CEO Email
          </CardTitle>
          <CardDescription>
            CEO will receive notifications for all cost sheet status changes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="ceo-email">CEO Email Address</Label>
            <Input
              id="ceo-email"
              type="email"
              placeholder="ceo@company.com"
              value={settings.ceo_email}
              onChange={(e) => setSettings(prev => ({ ...prev, ceo_email: e.target.value.trim().toLowerCase() }))}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} size="lg">
          <Save className="w-4 h-4 mr-2" />
          Save Settings
        </Button>
      </div>
    </div>
  );
}
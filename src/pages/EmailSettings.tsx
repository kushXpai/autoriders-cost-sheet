import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Mail, Plus, X, Save, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/supabase/client';
import type { EmailSettings } from '@/types';

export default function EmailSettingsPage() {
  const [settings, setSettings] = useState<EmailSettings | null>(null);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [loading, setLoading] = useState(true);

  /* ---------------- FETCH ---------------- */
  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('email_settings')
      .select('*')
      .single();

    if (error) {
      toast.error('Failed to load email settings');
      console.error(error);
    } else {
      setSettings(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  /* ---------------- ADMIN EMAILS ---------------- */
  const addAdminEmail = () => {
    const email = newAdminEmail.trim().toLowerCase();

    if (!email) return toast.error('Enter an email');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return toast.error('Invalid email');

    if (settings?.admin_emails.includes(email))
      return toast.error('Email already added');

    setSettings(prev =>
      prev ? { ...prev, admin_emails: [...prev.admin_emails, email] } : prev
    );
    setNewAdminEmail('');
  };

  const removeAdminEmail = (email: string) => {
    setSettings(prev =>
      prev
        ? { ...prev, admin_emails: prev.admin_emails.filter(e => e !== email) }
        : prev
    );
  };

  /* ---------------- SAVE ---------------- */
  const saveSettings = async () => {
    if (!settings) return;

    if (settings.notifications_enabled) {
      if (settings.admin_emails.length === 0)
        return toast.error('Add at least one admin email');

      if (!settings.super_admin_email)
        return toast.error('Enter Super Admin email');
    }

    const { error } = await supabase
      .from('email_settings')
      .update({
        admin_emails: settings.admin_emails,
        super_admin_email: settings.super_admin_email,
        notifications_enabled: settings.notifications_enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', settings.id);

    if (error) {
      toast.error('Failed to save settings');
      console.error(error);
    } else {
      toast.success('Email settings saved');
    }
  };

  if (loading || !settings)
    return <div className="py-20 text-center text-muted-foreground">Loading email settings...</div>;

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-display font-bold">Email Notification Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure Admin & Super Admin notification emails
        </p>
      </div>

      {/* NOTIFICATIONS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <Label>Enable Notifications</Label>
            <p className="text-sm text-muted-foreground">
              Email alerts for cost sheet approvals
            </p>
          </div>
          <Switch
            checked={settings.notifications_enabled}
            onCheckedChange={(checked) =>
              setSettings(prev => prev ? { ...prev, notifications_enabled: checked } : prev)
            }
          />
        </CardContent>
      </Card>

      {/* ADMIN EMAILS */}
      <Card>
        <CardHeader>
          <CardTitle>Admin Emails</CardTitle>
          <CardDescription>
            Admins receive notifications on submissions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="admin@company.com"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addAdminEmail()}
            />
            <Button variant="outline" onClick={addAdminEmail}>
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {settings.admin_emails.map(email => (
              <Badge key={email} variant="secondary" className="flex items-center gap-2">
                <Mail className="w-3 h-3" />
                {email}
                <button onClick={() => removeAdminEmail(email)}>
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* SUPER ADMIN */}
      <Card>
        <CardHeader>
          <CardTitle>Super Admin Email</CardTitle>
          <CardDescription>
            Super Admin receives all approval notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Label>Super Admin Email</Label>
          <Input
            type="email"
            placeholder="superadmin@company.com"
            value={settings.super_admin_email}
            onChange={(e) =>
              setSettings(prev =>
                prev ? { ...prev, super_admin_email: e.target.value.toLowerCase() } : prev
              )
            }
          />
        </CardContent>
      </Card>

      {/* SAVE */}
      <div className="flex justify-end">
        <Button size="lg" onClick={saveSettings}>
          <Save className="w-4 h-4 mr-2" />
          Save Settings
        </Button>
      </div>

    </div>
  );
}
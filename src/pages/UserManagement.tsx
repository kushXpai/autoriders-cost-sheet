import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/supabase/client';
import type { User, UserRole } from '@/types';
import { Plus, Pencil, Users, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const USER_ROLES: UserRole[] = ['SUPERADMIN', 'ADMIN', 'STAFF'];

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'STAFF' as UserRole,
  });
  const [loading, setLoading] = useState(true);

  // Fetch users from Supabase
  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: true });
      if (error) {
        console.error(error);
        toast({ title: 'Failed to fetch users', variant: 'destructive' });
      } else {
        setUsers(data as User[]);
      }
      setLoading(false);
    }
    fetchUsers();
  }, []);

  const resetForm = () => {
    setFormData({ full_name: '', email: '', password: '', role: 'STAFF' });
    setEditingUser(null);
    setShowPassword(false);
  };

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        full_name: user.full_name,
        email: user.email,
        password: '', // leave blank
        role: user.role,
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingUser) {
        // Update metadata only (full_name, role)
        const { data, error } = await supabase
          .from('users')
          .update({
            full_name: formData.full_name,
            role: formData.role,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingUser.id)
          .select()
          .single();

        if (error) throw error;

        setUsers(users.map(u => u.id === editingUser.id ? data : u));
        toast({ title: 'User updated successfully' });

      } else {
        // Create Auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        });

        if (authError) throw authError;

        const userId = authData.user?.id;
        if (!userId) throw new Error('Failed to get user ID from Supabase Auth');

        // Insert metadata into users table
        const { data, error } = await supabase
          .from('users')
          .insert([{
            id: userId,
            full_name: formData.full_name,
            email: formData.email,
            role: formData.role,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }])
          .select()
          .single();

        if (error) throw error;

        setUsers([...users, data]);
        toast({ title: 'User added successfully' });
      }

      setDialogOpen(false);
      resetForm();
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Error saving user', description: err.message, variant: 'destructive' });
    }
  };


  const handleToggleActive = async (id: string) => {
    if (id === currentUser?.id) {
      toast({ title: 'Cannot deactivate your own account', variant: 'destructive' });
      return;
    }

    const userToUpdate = users.find(u => u.id === id);
    if (!userToUpdate) return;

    const newStatus = !userToUpdate.is_active;

    try {
      const { data, error } = await supabase
        .from('users')
        .update({ is_active: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setUsers(users.map(u => u.id === id ? data : u));
      toast({ title: 'User status updated' });
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Error updating status', description: err.message, variant: 'destructive' });
    }
  };

  if (loading) return <div className="text-center py-20 text-muted-foreground">Loading users...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground mt-1">Manage staff and admin users</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
              <DialogDescription>
                {editingUser ? 'Update user details' : 'Add a new user to the system'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@company.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">
                  Password {editingUser && <span className="text-muted-foreground">(leave blank to keep current)</span>}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingUser ? '••••••••' : 'Enter password'}
                    required={!editingUser}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: UserRole) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_ROLES.map(role => (
                      <SelectItem key={role} value={role}>{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">{editingUser ? 'Update User' : 'Add User'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Users</CardTitle>
          <CardDescription>{users.length} users in system</CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No users added yet</p>
              <p className="text-sm">Click "Add User" to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(u => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.full_name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <Badge variant={u.role === 'SUPERADMIN' ? 'default' : u.role === 'ADMIN' ? 'secondary' : 'outline'}>
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.is_active ? 'default' : 'secondary'}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(u)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleToggleActive(u.id)} disabled={u.id === currentUser?.id}>
                            {u.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

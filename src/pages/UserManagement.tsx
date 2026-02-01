// src/pages/UserManagement.tsx
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/supabase/client';
import type { User, UserRole } from '@/types';
import { Plus, Pencil, Users, Eye, EyeOff, UserCog } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const USER_ROLES: UserRole[] = ['SUPERADMIN', 'ADMIN', 'REGIONAL_MANAGER', 'MANAGER'];

const ROLE_LABELS: Record<UserRole, string> = {
  SUPERADMIN: 'SUPER ADMIN',
  ADMIN: 'ADMIN',
  REGIONAL_MANAGER: 'REGIONAL MANAGER',
  MANAGER: 'MANAGER',
};

const ROLE_COLORS: Record<UserRole, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  SUPERADMIN: 'default',
  ADMIN: 'secondary',
  REGIONAL_MANAGER: 'outline',
  MANAGER: 'outline',
};

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [regionalManagers, setRegionalManagers] = useState<User[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedRegionalManager, setSelectedRegionalManager] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'MANAGER' as UserRole,
    reports_to: null as string | null,
  });
  const [loading, setLoading] = useState(true);
  const [selectedManagerIds, setSelectedManagerIds] = useState<Set<string>>(new Set());

  // Fetch users from Supabase
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error(error);
      toast({ title: 'Failed to fetch users', variant: 'destructive' });
    } else {
      setUsers(data as User[]);
      setRegionalManagers(data.filter(u => u.role === 'REGIONAL_MANAGER') as User[]);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({ 
      full_name: '', 
      email: '', 
      password: '', 
      role: 'MANAGER',
      reports_to: null 
    });
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
        reports_to: user.reports_to,
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
        // Update password if provided
        if (formData.password.trim()) {
          const { error: passwordError } = await supabase.auth.admin.updateUserById(
            editingUser.id,
            { password: formData.password }
          );
          if (passwordError) throw passwordError;
        }

        // Update metadata (full_name, role, reports_to)
        const { data, error } = await supabase
          .from('users')
          .update({
            full_name: formData.full_name,
            role: formData.role,
            reports_to: formData.role === 'MANAGER' ? formData.reports_to : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingUser.id)
          .select()
          .single();

        if (error) throw error;

        setUsers(users.map(u => u.id === editingUser.id ? data : u));
        if (data.role === 'REGIONAL_MANAGER') {
          setRegionalManagers(regionalManagers.map(rm => rm.id === editingUser.id ? data : rm));
        }
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
            reports_to: formData.role === 'MANAGER' ? formData.reports_to : null,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }])
          .select()
          .single();

        if (error) throw error;

        setUsers([...users, data]);
        if (data.role === 'REGIONAL_MANAGER') {
          setRegionalManagers([...regionalManagers, data]);
        }
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

  // Open assignment dialog for a regional manager
  const handleOpenAssignmentDialog = (regionalManager: User) => {
    setSelectedRegionalManager(regionalManager);
    // Pre-select currently assigned managers
    const assignedIds = users
      .filter(u => u.role === 'MANAGER' && u.reports_to === regionalManager.id)
      .map(u => u.id);
    setSelectedManagerIds(new Set(assignedIds));
    setAssignmentDialogOpen(true);
  };

  // Toggle manager selection
  const toggleManagerSelection = (managerId: string) => {
    const newSet = new Set(selectedManagerIds);
    if (newSet.has(managerId)) {
      newSet.delete(managerId);
    } else {
      newSet.add(managerId);
    }
    setSelectedManagerIds(newSet);
  };

  // Save manager assignments
  const handleSaveAssignments = async () => {
    if (!selectedRegionalManager) return;

    try {
      // Get all managers
      const allManagers = users.filter(u => u.role === 'MANAGER');
      
      // Determine which managers to assign/unassign
      const managersToAssign = allManagers.filter(m => 
        selectedManagerIds.has(m.id) && m.reports_to !== selectedRegionalManager.id
      );
      const managersToUnassign = allManagers.filter(m => 
        !selectedManagerIds.has(m.id) && m.reports_to === selectedRegionalManager.id
      );

      // Assign managers
      for (const manager of managersToAssign) {
        const { error } = await supabase
          .from('users')
          .update({ 
            reports_to: selectedRegionalManager.id,
            updated_at: new Date().toISOString() 
          })
          .eq('id', manager.id);
        
        if (error) throw error;
      }

      // Unassign managers
      for (const manager of managersToUnassign) {
        const { error } = await supabase
          .from('users')
          .update({ 
            reports_to: null,
            updated_at: new Date().toISOString() 
          })
          .eq('id', manager.id);
        
        if (error) throw error;
      }

      toast({ 
        title: 'Assignments saved successfully',
        description: `${managersToAssign.length} assigned, ${managersToUnassign.length} unassigned`
      });

      setAssignmentDialogOpen(false);
      fetchUsers(); // Refresh the data
    } catch (err: any) {
      console.error(err);
      toast({ 
        title: 'Error saving assignments', 
        description: err.message, 
        variant: 'destructive' 
      });
    }
  };

  // Get managers assigned to a regional manager
  const getAssignedManagersCount = (regionalManagerId: string): number => {
    return users.filter(u => u.role === 'MANAGER' && u.reports_to === regionalManagerId).length;
  };

  // Get regional manager name by ID
  const getRegionalManagerName = (id: string | null): string => {
    if (!id) return 'Unassigned';
    const rm = users.find(u => u.id === id);
    return rm ? rm.full_name : 'Unknown';
  };

  if (loading) return <div className="text-center py-20 text-muted-foreground">Loading users...</div>;

  // Separate users by role
  const leadersAndRegionalManagers = users.filter(u => 
    u.role === 'SUPERADMIN' || u.role === 'ADMIN' || u.role === 'REGIONAL_MANAGER'
  );
  const managers = users.filter(u => u.role === 'MANAGER');

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
                  disabled={!!editingUser} // Email cannot be changed after creation
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
                  onValueChange={(value: UserRole) => {
                    setFormData({ 
                      ...formData, 
                      role: value,
                      // Reset reports_to if not a manager
                      reports_to: value === 'MANAGER' ? formData.reports_to : null
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_ROLES.map(role => (
                      <SelectItem key={role} value={role}>{ROLE_LABELS[role]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Show Regional Manager selection only if role is MANAGER */}
              {formData.role === 'MANAGER' && (
                <div className="space-y-2">
                  <Label htmlFor="reports_to">Reports To (Optional)</Label>
                  <Select
                    value={formData.reports_to || 'none'}
                    onValueChange={(value) => setFormData({ 
                      ...formData, 
                      reports_to: value === 'none' ? null : value 
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Regional Manager" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {regionalManagers.map(rm => (
                        <SelectItem key={rm.id} value={rm.id}>
                          {rm.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    You can also assign managers later from the "Assign Managers" option
                  </p>
                </div>
              )}

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

      {/* Assignment Dialog */}
      <Dialog open={assignmentDialogOpen} onOpenChange={setAssignmentDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              Assign Managers to: {selectedRegionalManager?.full_name}
            </DialogTitle>
            <DialogDescription>
              Select managers who should report to this regional manager
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-6 py-4 overflow-y-auto max-h-[50vh]">
            {/* Available Managers (Unassigned + Other assignments) */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">All Managers ({managers.length})</h3>
              <div className="space-y-2 border rounded-md p-3 bg-muted/20">
                {managers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No managers available</p>
                ) : (
                  managers.map(manager => (
                    <div key={manager.id} className="flex items-start space-x-3 p-2 hover:bg-muted/50 rounded">
                      <Checkbox
                        id={`manager-${manager.id}`}
                        checked={selectedManagerIds.has(manager.id)}
                        onCheckedChange={() => toggleManagerSelection(manager.id)}
                      />
                      <div className="flex-1">
                        <label
                          htmlFor={`manager-${manager.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {manager.full_name}
                        </label>
                        <p className="text-xs text-muted-foreground mt-1">
                          {manager.email}
                        </p>
                        {manager.reports_to && manager.reports_to !== selectedRegionalManager?.id && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            Currently: {getRegionalManagerName(manager.reports_to)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Currently Assigned Summary */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">
                Selected Managers ({selectedManagerIds.size})
              </h3>
              <div className="space-y-2 border rounded-md p-3 bg-primary/5">
                {selectedManagerIds.size === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No managers selected
                  </p>
                ) : (
                  Array.from(selectedManagerIds).map(managerId => {
                    const manager = managers.find(m => m.id === managerId);
                    if (!manager) return null;
                    return (
                      <div key={managerId} className="flex items-center justify-between p-2 bg-background rounded">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{manager.full_name}</p>
                          <p className="text-xs text-muted-foreground">{manager.email}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleManagerSelection(managerId)}
                          className="h-6 w-6 p-0"
                        >
                          ×
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAssignmentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAssignments}>
              Save Assignments
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tabbed Interface */}
      <Tabs defaultValue="leadership" className="space-y-4">
        <TabsList>
          <TabsTrigger value="leadership">Leadership & Regional Managers</TabsTrigger>
          <TabsTrigger value="managers">All Managers ({managers.length})</TabsTrigger>
        </TabsList>

        {/* Tab 1: Leadership & Regional Managers */}
        <TabsContent value="leadership" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Leadership & Regional Managers</CardTitle>
              <CardDescription>
                {leadersAndRegionalManagers.length} users with administrative or regional oversight
              </CardDescription>
            </CardHeader>
            <CardContent>
              {leadersAndRegionalManagers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No leadership users found</p>
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
                      {leadersAndRegionalManagers.map(u => {
                        const assignedCount = u.role === 'REGIONAL_MANAGER' 
                          ? getAssignedManagersCount(u.id) 
                          : 0;
                        
                        return (
                          <TableRow key={u.id}>
                            <TableCell className="font-medium">{u.full_name}</TableCell>
                            <TableCell>{u.email}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Badge variant={ROLE_COLORS[u.role]}>
                                  {ROLE_LABELS[u.role]}
                                </Badge>
                                {u.role === 'REGIONAL_MANAGER' && assignedCount > 0 && (
                                  <Badge variant="secondary" className="text-xs">
                                    {assignedCount} {assignedCount === 1 ? 'Manager' : 'Managers'}
                                  </Badge>
                                )}
                              </div>
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
                                {u.role === 'REGIONAL_MANAGER' && (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleOpenAssignmentDialog(u)}
                                  >
                                    <UserCog className="w-4 h-4 mr-1" />
                                    Assign Managers
                                  </Button>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleToggleActive(u.id)} 
                                  disabled={u.id === currentUser?.id}
                                >
                                  {u.is_active ? 'Deactivate' : 'Activate'}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: All Managers */}
        <TabsContent value="managers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">All Managers</CardTitle>
              <CardDescription>
                {managers.length} managers in system
              </CardDescription>
            </CardHeader>
            <CardContent>
              {managers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No managers added yet</p>
                  <p className="text-sm">Click "Add User" to get started</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Reports To</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {managers.map(u => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.full_name}</TableCell>
                          <TableCell>{u.email}</TableCell>
                          <TableCell>
                            {u.reports_to ? (
                              <Badge variant="outline">
                                {getRegionalManagerName(u.reports_to)}
                              </Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground">Unassigned</span>
                            )}
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
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleToggleActive(u.id)} 
                                disabled={u.id === currentUser?.id}
                              >
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
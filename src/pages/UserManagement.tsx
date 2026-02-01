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

  // Computed values for filtered lists
  const leadersAndRegionalManagers = users.filter(u => 
    ['SUPERADMIN', 'ADMIN', 'REGIONAL_MANAGER'].includes(u.role)
  );
  const managers = users.filter(u => u.role === 'MANAGER');

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

  // Function to update password via API route
  const updateUserPassword = async (userId: string, newPassword: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('No active session');
    }

    const response = await fetch('/api/update-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ userId, newPassword }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to update password');
    }

    return result;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingUser) {
        // Update password if provided using API route
        if (formData.password.trim()) {
          try {
            await updateUserPassword(editingUser.id, formData.password);
            toast({ title: 'Password updated successfully' });
          } catch (passwordError: any) {
            console.error('Password update failed:', passwordError);
            toast({ 
              title: 'Password update failed', 
              description: passwordError.message,
              variant: 'destructive' 
            });
            // Continue with other updates even if password fails
          }
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
        } else if (editingUser.role === 'REGIONAL_MANAGER' && data.role !== 'REGIONAL_MANAGER') {
          setRegionalManagers(regionalManagers.filter(rm => rm.id !== editingUser.id));
        }
        
        toast({ title: 'User updated successfully' });

      } else {
        // Create Auth user with admin API
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          throw new Error('No active session');
        }

        // Create user via API
        const createResponse = await fetch('/api/create-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            full_name: formData.full_name,
            role: formData.role,
            reports_to: formData.role === 'MANAGER' ? formData.reports_to : null,
          }),
        });

        const createResult = await createResponse.json();

        if (!createResponse.ok) {
          throw new Error(createResult.error || 'Failed to create user');
        }

        setUsers([...users, createResult.user]);
        if (createResult.user.role === 'REGIONAL_MANAGER') {
          setRegionalManagers([...regionalManagers, createResult.user]);
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

    const user = users.find(u => u.id === id);
    if (!user) return;

    const { data, error } = await supabase
      .from('users')
      .update({ 
        is_active: !user.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(error);
      toast({ title: 'Failed to toggle user status', variant: 'destructive' });
    } else {
      setUsers(users.map(u => u.id === id ? data : u));
      if (data.role === 'REGIONAL_MANAGER') {
        setRegionalManagers(regionalManagers.map(rm => rm.id === id ? data : rm));
      }
      toast({ title: `User ${data.is_active ? 'activated' : 'deactivated'} successfully` });
    }
  };

  const handleOpenAssignmentDialog = (regionalManager: User) => {
    setSelectedRegionalManager(regionalManager);
    // Find all managers reporting to this regional manager
    const assignedManagers = managers.filter(m => m.reports_to === regionalManager.id);
    setSelectedManagerIds(new Set(assignedManagers.map(m => m.id)));
    setAssignmentDialogOpen(true);
  };

  const toggleManagerSelection = (managerId: string) => {
    const newSet = new Set(selectedManagerIds);
    if (newSet.has(managerId)) {
      newSet.delete(managerId);
    } else {
      newSet.add(managerId);
    }
    setSelectedManagerIds(newSet);
  };

  const handleSaveAssignments = async () => {
    if (!selectedRegionalManager) return;

    try {
      // Get all managers currently assigned to this regional manager
      const currentlyAssigned = managers.filter(m => m.reports_to === selectedRegionalManager.id);
      
      // Managers to unassign (were assigned but no longer selected)
      const toUnassign = currentlyAssigned.filter(m => !selectedManagerIds.has(m.id));
      
      // Managers to assign (selected but not currently assigned)
      const toAssign = Array.from(selectedManagerIds).filter(id => {
        const manager = managers.find(m => m.id === id);
        return manager && manager.reports_to !== selectedRegionalManager.id;
      });

      // Unassign managers
      if (toUnassign.length > 0) {
        const { error: unassignError } = await supabase
          .from('users')
          .update({ 
            reports_to: null,
            updated_at: new Date().toISOString(),
          })
          .in('id', toUnassign.map(m => m.id));

        if (unassignError) throw unassignError;
      }

      // Assign managers
      if (toAssign.length > 0) {
        const { error: assignError } = await supabase
          .from('users')
          .update({ 
            reports_to: selectedRegionalManager.id,
            updated_at: new Date().toISOString(),
          })
          .in('id', toAssign);

        if (assignError) throw assignError;
      }

      // Refresh users list
      await fetchUsers();
      
      toast({ title: 'Manager assignments updated successfully' });
      setAssignmentDialogOpen(false);
      setSelectedRegionalManager(null);
      setSelectedManagerIds(new Set());
    } catch (error: any) {
      console.error('Assignment error:', error);
      toast({ 
        title: 'Failed to update assignments', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  };

  const getAssignedManagersCount = (regionalManagerId: string) => {
    return managers.filter(m => m.reports_to === regionalManagerId).length;
  };

  const getRegionalManagerName = (regionalManagerId: string | null) => {
    if (!regionalManagerId) return 'None';
    const rm = regionalManagers.find(r => r.id === regionalManagerId);
    return rm ? rm.full_name : 'Unknown';
  };

  return (
    <div className="px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage users, roles, and assignments</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
                <DialogDescription>
                  {editingUser ? 'Update user information' : 'Create a new user account'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 my-4">
                <div>
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={!!editingUser}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="password">
                    Password {editingUser && '(leave blank to keep current)'}
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required={!editingUser}
                      placeholder={editingUser ? 'Enter new password to change' : ''}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {USER_ROLES.map(role => (
                        <SelectItem key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.role === 'MANAGER' && (
                  <div>
                    <Label htmlFor="reports_to">Reports To (Regional Manager)</Label>
                    <Select
                      value={formData.reports_to || 'none'}
                      onValueChange={(value) => setFormData({ ...formData, reports_to: value === 'none' ? null : value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
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
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingUser ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Assignment Dialog */}
      <Dialog open={assignmentDialogOpen} onOpenChange={setAssignmentDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Assign Managers to {selectedRegionalManager?.full_name}</DialogTitle>
            <DialogDescription>
              Select which managers should report to this regional manager
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 my-4">
            {/* Left: Available Managers */}
            <div className="border rounded-lg p-4 space-y-2">
              <h3 className="font-semibold mb-3">Available Managers ({managers.length})</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {managers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No managers available
                  </p>
                ) : (
                  managers.map(manager => (
                    <div key={manager.id} className="flex items-start space-x-2 p-2 hover:bg-accent rounded">
                      <Checkbox
                        id={`manager-${manager.id}`}
                        checked={selectedManagerIds.has(manager.id)}
                        onCheckedChange={() => toggleManagerSelection(manager.id)}
                      />
                      <label
                        htmlFor={`manager-${manager.id}`}
                        className="flex-1 cursor-pointer"
                      >
                        <p className="text-sm font-medium">{manager.full_name}</p>
                        <p className="text-xs text-muted-foreground">{manager.email}</p>
                        {manager.reports_to && manager.reports_to !== selectedRegionalManager?.id && (
                          <p className="text-xs text-amber-600">
                            Currently assigned to {getRegionalManagerName(manager.reports_to)}
                          </p>
                        )}
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right: Selected Managers */}
            <div className="border rounded-lg p-4 space-y-2 bg-muted/30">
              <h3 className="font-semibold mb-3">
                Selected Managers ({selectedManagerIds.size})
              </h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
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
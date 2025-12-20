import { useState } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { getAdminCharges, setAdminCharges, generateId } from '@/lib/storage';
import type { AdminCharge } from '@/types';
import { Plus, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AdminCharges() {
  const { toast } = useToast();
  const [charges, setChargesState] = useState<AdminCharge[]>(getAdminCharges());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    admin_charge_percent: '',
    effective_from: new Date().toISOString().split('T')[0],
  });

  const activeCharge = charges.find(c => c.is_active);

  const resetForm = () => {
    setFormData({
      admin_charge_percent: '',
      effective_from: new Date().toISOString().split('T')[0],
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const chargeData: AdminCharge = {
      id: generateId(),
      admin_charge_percent: parseFloat(formData.admin_charge_percent) || 0,
      effective_from: formData.effective_from,
      is_active: true,
    };

    // Deactivate all other charges
    const updatedCharges = charges.map(c => ({ ...c, is_active: false }));
    updatedCharges.push(chargeData);
    
    setAdminCharges(updatedCharges);
    setChargesState(updatedCharges);
    setDialogOpen(false);
    resetForm();
    toast({ title: 'Admin charge added and activated' });
  };

  const handleToggleActive = (id: string) => {
    const updatedCharges = charges.map(c => ({
      ...c,
      is_active: c.id === id,
    }));
    setAdminCharges(updatedCharges);
    setChargesState(updatedCharges);
    toast({ title: 'Active admin charge updated' });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Admin Charges Master</h1>
          <p className="text-muted-foreground mt-1">Manage admin charge percentages</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add Charge
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Admin Charge</DialogTitle>
              <DialogDescription>
                Add a new admin charge percentage. It will be set as active automatically.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="charge">Admin Charge (%)</Label>
                <Input
                  id="charge"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.admin_charge_percent}
                  onChange={(e) => setFormData({ ...formData, admin_charge_percent: e.target.value })}
                  placeholder="10"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Effective From</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.effective_from}
                  onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
                  required
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Charge</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Current Active Charge */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            <CardTitle>Current Active Charge</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {activeCharge ? (
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-primary">
                {activeCharge.admin_charge_percent}%
              </span>
              <span className="text-muted-foreground">
                of subtotal • Since {new Date(activeCharge.effective_from).toLocaleDateString()}
              </span>
            </div>
          ) : (
            <p className="text-muted-foreground">No active admin charge set</p>
          )}
        </CardContent>
      </Card>

      {/* Charge History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Charge History</CardTitle>
          <CardDescription>All admin charges configured in the system</CardDescription>
        </CardHeader>
        <CardContent>
          {charges.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Settings className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No admin charges configured</p>
              <p className="text-sm">Add your first admin charge to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Admin Charge</TableHead>
                    <TableHead>Effective From</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Set Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...charges]
                    .sort((a, b) => new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime())
                    .map((charge) => (
                      <TableRow key={charge.id}>
                        <TableCell className="font-medium text-lg">
                          {charge.admin_charge_percent}%
                        </TableCell>
                        <TableCell>
                          {new Date(charge.effective_from).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={charge.is_active ? 'default' : 'secondary'}>
                            {charge.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Switch
                            checked={charge.is_active}
                            onCheckedChange={() => handleToggleActive(charge.id)}
                          />
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

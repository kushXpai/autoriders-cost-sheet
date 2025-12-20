import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Shield, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { getInsuranceRates, setInsuranceRates, generateId } from '@/lib/storage';
import type { InsuranceRate as InsuranceRateType } from '@/types';

export default function InsuranceRate() {
  const [rates, setRates] = useState<InsuranceRateType[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    insurance_rate_percent: 3.5,
    effective_from: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    setRates(getInsuranceRates());
  }, []);

  const handleSubmit = () => {
    if (formData.insurance_rate_percent <= 0 || formData.insurance_rate_percent > 100) {
      toast.error('Please enter a valid insurance rate (0-100%)');
      return;
    }
    if (!formData.effective_from) {
      toast.error('Please select an effective date');
      return;
    }

    // Deactivate all existing rates
    const updatedRates = rates.map(r => ({ ...r, is_active: false }));
    
    // Add new active rate
    const newRate: InsuranceRateType = {
      id: generateId(),
      insurance_rate_percent: formData.insurance_rate_percent,
      effective_from: formData.effective_from,
      is_active: true,
    };

    const finalRates = [...updatedRates, newRate];
    setInsuranceRates(finalRates);
    setRates(finalRates);
    setDialogOpen(false);
    setFormData({
      insurance_rate_percent: 3.5,
      effective_from: new Date().toISOString().split('T')[0],
    });
    toast.success('Insurance rate added successfully');
  };

  const handleDelete = (id: string) => {
    const rate = rates.find(r => r.id === id);
    if (rate?.is_active) {
      toast.error('Cannot delete active insurance rate');
      return;
    }
    const updatedRates = rates.filter(r => r.id !== id);
    setInsuranceRates(updatedRates);
    setRates(updatedRates);
    toast.success('Insurance rate deleted');
  };

  const handleSetActive = (id: string) => {
    const updatedRates = rates.map(r => ({
      ...r,
      is_active: r.id === id,
    }));
    setInsuranceRates(updatedRates);
    setRates(updatedRates);
    toast.success('Insurance rate activated');
  };

  const activeRate = rates.find(r => r.is_active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Insurance Rate</h1>
          <p className="text-muted-foreground mt-1">
            Manage insurance rate percentage for cost sheet calculations
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add New Rate
        </Button>
      </div>

      {/* Current Rate Card */}
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Current Insurance Rate
          </CardTitle>
          <CardDescription>
            This rate is used for all new cost sheet calculations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold text-primary">
              {activeRate?.insurance_rate_percent || 3.5}%
            </div>
            <div className="text-sm text-muted-foreground">
              {activeRate ? (
                <>Effective from {new Date(activeRate.effective_from).toLocaleDateString()}</>
              ) : (
                <>Default rate (no custom rate set)</>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Rate History</CardTitle>
          <CardDescription>All insurance rates configured in the system</CardDescription>
        </CardHeader>
        <CardContent>
          {rates.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No insurance rates configured. Using default 3.5%.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rate (%)</TableHead>
                  <TableHead>Effective From</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates
                  .sort((a, b) => new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime())
                  .map((rate) => (
                    <TableRow key={rate.id}>
                      <TableCell className="font-medium">{rate.insurance_rate_percent}%</TableCell>
                      <TableCell>{new Date(rate.effective_from).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {rate.is_active ? (
                          <Badge className="bg-success/10 text-success">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {!rate.is_active && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSetActive(rate.id)}
                              >
                                Set Active
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(rate.id)}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Insurance Rate</DialogTitle>
            <DialogDescription>
              This will become the active rate for all new cost sheets
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rate">Insurance Rate (%)</Label>
              <Input
                id="rate"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.insurance_rate_percent}
                onChange={(e) => setFormData(prev => ({ ...prev, insurance_rate_percent: parseFloat(e.target.value) || 0 }))}
              />
              <p className="text-xs text-muted-foreground">
                Insurance = Vehicle Cost × {formData.insurance_rate_percent}%
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="effective">Effective From</Label>
              <Input
                id="effective"
                type="date"
                value={formData.effective_from}
                onChange={(e) => setFormData(prev => ({ ...prev, effective_from: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>Add Rate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
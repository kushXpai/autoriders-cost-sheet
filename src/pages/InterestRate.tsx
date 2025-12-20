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
import { getInterestRates, setInterestRates, generateId } from '@/lib/storage';
import type { InterestRate } from '@/types';
import { Plus, Percent } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function InterestRatePage() {
  const { toast } = useToast();
  const [rates, setRatesState] = useState<InterestRate[]>(getInterestRates());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    interest_rate_percent: '',
    effective_from: new Date().toISOString().split('T')[0],
  });

  const activeRate = rates.find(r => r.is_active);

  const resetForm = () => {
    setFormData({
      interest_rate_percent: '',
      effective_from: new Date().toISOString().split('T')[0],
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const rateData: InterestRate = {
      id: generateId(),
      interest_rate_percent: parseFloat(formData.interest_rate_percent) || 0,
      effective_from: formData.effective_from,
      is_active: true,
    };

    // Deactivate all other rates
    const updatedRates = rates.map(r => ({ ...r, is_active: false }));
    updatedRates.push(rateData);
    
    setInterestRates(updatedRates);
    setRatesState(updatedRates);
    setDialogOpen(false);
    resetForm();
    toast({ title: 'Interest rate added and activated' });
  };

  const handleToggleActive = (id: string) => {
    const updatedRates = rates.map(r => ({
      ...r,
      is_active: r.id === id,
    }));
    setInterestRates(updatedRates);
    setRatesState(updatedRates);
    toast({ title: 'Active interest rate updated' });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Interest Rate Master</h1>
          <p className="text-muted-foreground mt-1">Manage interest rates for EMI calculations</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add Rate
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Interest Rate</DialogTitle>
              <DialogDescription>
                Add a new interest rate. It will be set as active automatically.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rate">Interest Rate (%)</Label>
                <Input
                  id="rate"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.interest_rate_percent}
                  onChange={(e) => setFormData({ ...formData, interest_rate_percent: e.target.value })}
                  placeholder="12"
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
                <Button type="submit">Add Rate</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Current Active Rate */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Percent className="w-5 h-5 text-primary" />
            <CardTitle>Current Active Rate</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {activeRate ? (
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-primary">
                {activeRate.interest_rate_percent}%
              </span>
              <span className="text-muted-foreground">
                per annum • Since {new Date(activeRate.effective_from).toLocaleDateString()}
              </span>
            </div>
          ) : (
            <p className="text-muted-foreground">No active interest rate set</p>
          )}
        </CardContent>
      </Card>

      {/* Rate History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Rate History</CardTitle>
          <CardDescription>All interest rates configured in the system</CardDescription>
        </CardHeader>
        <CardContent>
          {rates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Percent className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No interest rates configured</p>
              <p className="text-sm">Add your first interest rate to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Interest Rate</TableHead>
                    <TableHead>Effective From</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Set Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...rates]
                    .sort((a, b) => new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime())
                    .map((rate) => (
                      <TableRow key={rate.id}>
                        <TableCell className="font-medium text-lg">
                          {rate.interest_rate_percent}%
                        </TableCell>
                        <TableCell>
                          {new Date(rate.effective_from).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={rate.is_active ? 'default' : 'secondary'}>
                            {rate.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Switch
                            checked={rate.is_active}
                            onCheckedChange={() => handleToggleActive(rate.id)}
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

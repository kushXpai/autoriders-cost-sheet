import { useEffect, useState } from 'react';
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
import { Plus, Percent } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/supabase/client';
import type { InterestRate } from '@/types';

export default function InterestRatePage() {
  const { toast } = useToast();
  const [rates, setRates] = useState<InterestRate[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    interest_rate_percent: '',
    effective_from: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(true);

  const fetchRates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('interest_rates')
        .select('*')
        .order('effective_from', { ascending: false });

      if (error) throw error;
      setRates(data || []);
    } catch (err: any) {
      console.error('Error fetching rates:', err);
      toast({ title: 'Error fetching rates', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  const activeRate = rates.find(r => r.is_active);

  const resetForm = () => {
    setFormData({
      interest_rate_percent: '',
      effective_from: new Date().toISOString().split('T')[0],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Deactivate all other rates first
      await supabase
        .from('interest_rates')
        .update({ is_active: false })
        .eq('is_active', true);

      // Insert new rate
      const { data, error } = await supabase
        .from('interest_rates')
        .insert([{
          interest_rate_percent: parseFloat(formData.interest_rate_percent),
          effective_from: formData.effective_from,
          is_active: true,
        }])
        .select()
        .single();

      if (error) throw error;

      setRates([data, ...rates.map(r => ({ ...r, is_active: false }))]);
      setDialogOpen(false);
      resetForm();
      toast({ title: 'Interest rate added and activated' });
    } catch (err: any) {
      console.error('Error adding rate:', err);
      toast({ title: 'Error saving rate', description: err.message, variant: 'destructive' });
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      // Set all to inactive
      await supabase.from('interest_rates').update({ is_active: false }).eq('is_active', true);
      // Activate the selected
      const { data, error } = await supabase
        .from('interest_rates')
        .update({ is_active: true })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      setRates(rates.map(r => ({ ...r, is_active: r.id === id })));
      toast({ title: 'Active interest rate updated' });
    } catch (err: any) {
      console.error('Error updating active rate:', err);
      toast({ title: 'Error updating rate', description: err.message, variant: 'destructive' });
    }
  };

  if (loading) return <div className="text-center py-20 text-muted-foreground">Loading interest rates...</div>;

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
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
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
              <span className="text-4xl font-bold text-primary">{activeRate.interest_rate_percent}%</span>
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
                  {rates.map(rate => (
                    <TableRow key={rate.id}>
                      <TableCell className="font-medium text-lg">{rate.interest_rate_percent}%</TableCell>
                      <TableCell>{new Date(rate.effective_from).toLocaleDateString()}</TableCell>
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
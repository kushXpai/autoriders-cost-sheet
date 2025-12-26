import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/supabase/client';
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
import { formatCurrency } from '@/lib/calculations';
import type { FuelRate, City } from '@/types';
import { Plus, Fuel, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type FuelRateType = 'PETROL' | 'DIESEL' | 'EV';
const FUEL_TYPES: FuelRateType[] = ['PETROL', 'DIESEL', 'EV'];
const CITIES: City[] = [
  'Mumbai', 'Delhi', 'Ahmedabad', 'Chennai', 'Bangalore',
  'Hyderabad', 'Vadodara', 'Kolkata', 'Gurugram', 'Pune'
];

export default function FuelRates() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const [rates, setRates] = useState<FuelRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState<City>('Mumbai');

  const [formData, setFormData] = useState({
    fuel_type: 'PETROL' as FuelRateType,
    city: 'Mumbai' as City,
    rate_per_unit: '',
    effective_date: new Date().toISOString().split('T')[0],
  });

  /* ---------------- FETCH ---------------- */
  const fetchRates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('fuel_rates')
      .select('*')
      .order('effective_date', { ascending: false });

    if (error) {
      toast({ title: 'Error fetching fuel rates', description: error.message, variant: 'destructive' });
      console.error(error);
    } else {
      setRates(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRates();
  }, []);

  /* ---------------- ADD RATE ---------------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase
      .from('fuel_rates')
      .insert([{
        fuel_type: formData.fuel_type,
        city: formData.city,
        rate_per_unit: parseFloat(formData.rate_per_unit),
        effective_date: formData.effective_date,
      }]);

    if (error) {
      toast({ title: 'Error saving fuel rate', description: error.message, variant: 'destructive' });
      console.error(error);
      return;
    }

    toast({ title: 'Fuel rate added successfully' });
    setDialogOpen(false);
    fetchRates();
  };

  /* ---------------- FILTER & GROUP ---------------- */
  const cityRates = rates.filter(r => r.city === selectedCity);

  const groupedRates = FUEL_TYPES.map(type => {
    const typeRates = cityRates
      .filter(r => r.fuel_type === type)
      .sort((a, b) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime());

    return {
      type,
      currentRate: typeRates[0],
      history: typeRates.slice(1),
    };
  });

  if (loading)
    return <div className="py-20 text-center text-muted-foreground">Loading fuel rates...</div>;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Fuel Rates</h1>
          <p className="text-muted-foreground mt-1">
            City-wise fuel prices for cost calculations
          </p>
        </div>

        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Rate
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Fuel Rate</DialogTitle>
                <DialogDescription>Add a new fuel rate</DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Select
                    value={formData.city}
                    onValueChange={(value: City) => setFormData({ ...formData, city: value })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CITIES.map(city => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Fuel Type</Label>
                  <Select
                    value={formData.fuel_type}
                    onValueChange={(value: FuelRateType) => setFormData({ ...formData, fuel_type: value })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FUEL_TYPES.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Rate per Unit</Label>
                  <Input
                    type="number"
                    step="0.01"
                    required
                    value={formData.rate_per_unit}
                    onChange={(e) => setFormData({ ...formData, rate_per_unit: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Effective Date</Label>
                  <Input
                    type="date"
                    required
                    value={formData.effective_date}
                    onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Save</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* CITY SELECTOR */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" /> Select City
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {CITIES.map(city => (
            <Button
              key={city}
              size="sm"
              variant={selectedCity === city ? 'default' : 'outline'}
              onClick={() => setSelectedCity(city)}
            >
              {city}
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* CURRENT RATES */}
      <div className="grid gap-4 md:grid-cols-3">
        {groupedRates.map(({ type, currentRate }) => (
          <Card key={type}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Fuel className="w-5 h-5" /> {type}
              </CardTitle>
              <CardDescription>{selectedCity}</CardDescription>
            </CardHeader>
            <CardContent>
              {currentRate ? (
                <>
                  <p className="text-3xl font-bold">
                    {formatCurrency(currentRate.rate_per_unit)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Since {new Date(currentRate.effective_date).toLocaleDateString()}
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">No rate set</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* HISTORY */}
      <Card>
        <CardHeader>
          <CardTitle>Rate History – {selectedCity}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fuel</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cityRates.map(rate => {
                const isCurrent =
                  groupedRates.find(g => g.type === rate.fuel_type)?.currentRate?.id === rate.id;

                return (
                  <TableRow key={rate.id}>
                    <TableCell>{rate.fuel_type}</TableCell>
                    <TableCell>{formatCurrency(rate.rate_per_unit)}</TableCell>
                    <TableCell>{new Date(rate.effective_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={isCurrent ? 'default' : 'secondary'}>
                        {isCurrent ? 'Current' : 'Historical'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </div>
  );
}
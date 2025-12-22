import { useState } from 'react';
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
import { getFuelRates, setFuelRates, generateId } from '@/lib/storage';
import { formatCurrency } from '@/lib/calculations';
import type { FuelRate, City } from '@/types';
import { Plus, Fuel, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type FuelRateType = 'PETROL' | 'DIESEL' | 'EV';
const FUEL_TYPES: FuelRateType[] = ['PETROL', 'DIESEL', 'EV'];
const CITIES: City[] = ['Mumbai', 'Delhi', 'Ahmedabad', 'Chennai', 'Bangalore', 'Hyderabad', 'Vadodara', 'Kolkata', 'Gurugram', 'Pune'];

export default function FuelRates() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [rates, setRatesState] = useState<FuelRate[]>(getFuelRates());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState<City>('Mumbai');
  const [formData, setFormData] = useState({
    fuel_type: 'PETROL' as FuelRateType,
    city: 'Mumbai' as City,
    rate_per_unit: '',
    effective_date: new Date().toISOString().split('T')[0],
  });

  const resetForm = () => {
    setFormData({
      fuel_type: 'PETROL',
      city: 'Mumbai',
      rate_per_unit: '',
      effective_date: new Date().toISOString().split('T')[0],
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const rateData: FuelRate = {
      id: generateId(),
      fuel_type: formData.fuel_type,
      city: formData.city,
      rate_per_unit: parseFloat(formData.rate_per_unit) || 0,
      effective_date: formData.effective_date,
      created_at: new Date().toISOString(),
    };

    const updatedRates = [...rates, rateData];
    setFuelRates(updatedRates);
    setRatesState(updatedRates);
    setDialogOpen(false);
    resetForm();
    toast({ title: 'Fuel rate added successfully' });
  };

  // Filter rates by selected city
  const cityRates = rates.filter(r => r.city === selectedCity);

  // Group by fuel type and sort by date for selected city
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Fuel Rates</h1>
          <p className="text-muted-foreground mt-1">City-wise fuel prices for cost calculations</p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Add Rate
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Fuel Rate</DialogTitle>
                <DialogDescription>
                  Add a new fuel rate for a specific city
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Select
                    value={formData.city}
                    onValueChange={(value: City) => setFormData({ ...formData, city: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CITIES.map(city => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fuel_type">Fuel Type</Label>
                  <Select
                    value={formData.fuel_type}
                    onValueChange={(value: FuelRateType) => setFormData({ ...formData, fuel_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FUEL_TYPES.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rate">Rate per Unit</Label>
                  <Input
                    id="rate"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.rate_per_unit}
                    onChange={(e) => setFormData({ ...formData, rate_per_unit: e.target.value })}
                    placeholder="104.21"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    ₹ per litre (or per kWh for EV)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Effective Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.effective_date}
                    onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
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
        )}
      </div>

      {/* City Selector */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Select City</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {CITIES.map(city => (
              <Button
                key={city}
                variant={selectedCity === city ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCity(city)}
              >
                {city}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Rates Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {groupedRates.map(({ type, currentRate }) => (
          <Card key={type}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Fuel className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">{type}</CardTitle>
              </div>
              <CardDescription>{selectedCity}</CardDescription>
            </CardHeader>
            <CardContent>
              {currentRate ? (
                <>
                  <p className="text-3xl font-bold">
                    {formatCurrency(currentRate.rate_per_unit)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    per {type === 'EV' ? 'kWh' : 'litre'} • Since {new Date(currentRate.effective_date).toLocaleDateString()}
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">No rate set</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Rate History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Rate History - {selectedCity}</CardTitle>
          <CardDescription>All fuel rates with effective dates for {selectedCity}</CardDescription>
        </CardHeader>
        <CardContent>
          {cityRates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Fuel className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No fuel rates added for {selectedCity} yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fuel Type</TableHead>
                    <TableHead>Rate per Unit</TableHead>
                    <TableHead>Effective Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...cityRates]
                    .sort((a, b) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime())
                    .map((rate) => {
                      const isCurrent = groupedRates.find(g => g.type === rate.fuel_type)?.currentRate?.id === rate.id;
                      return (
                        <TableRow key={rate.id}>
                          <TableCell>
                            <Badge variant="outline">{rate.fuel_type}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(rate.rate_per_unit)}/{rate.fuel_type === 'EV' ? 'kWh' : 'L'}
                          </TableCell>
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
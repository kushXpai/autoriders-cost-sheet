// src/pages/FuelRates.tsx
import { useState, useEffect, useMemo, useCallback } from 'react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { formatCurrency } from '@/lib/calculations';
import type { FuelRate, City } from '@/types';
import { Plus, Fuel, MapPin, TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RealtimeChannel } from '@supabase/supabase-js';

type FuelRateType = 'PETROL' | 'DIESEL' | 'EV' | 'CNG';
const FUEL_TYPES: FuelRateType[] = ['PETROL', 'DIESEL', 'EV', 'CNG'];

const FUEL_UNIT_LABEL: Record<FuelRateType, string> = {
  PETROL: '/L',
  DIESEL: '/L',
  EV: '/kWh',
  CNG: '/Kg',
};
const CITIES: City[] = [
  'Mumbai', 'Delhi', 'Ahmedabad', 'Chennai', 'Bangalore',
  'Hyderabad', 'Vadodara', 'Kolkata', 'Gurugram', 'Pune'
];

interface FuelRateFormData {
  fuel_type: FuelRateType;
  rate_per_unit: string;
  enabled: boolean;
}

export default function FuelRates() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const [rates, setRates] = useState<FuelRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState<City>('Mumbai');
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    city: 'Mumbai' as City,
    effective_date: new Date().toISOString().split('T')[0],
    rates: [
      { fuel_type: 'PETROL' as FuelRateType, rate_per_unit: '', enabled: true },
      { fuel_type: 'DIESEL' as FuelRateType, rate_per_unit: '', enabled: false },
      { fuel_type: 'EV' as FuelRateType, rate_per_unit: '', enabled: false },
      { fuel_type: 'CNG' as FuelRateType, rate_per_unit: '', enabled: false },
    ] as FuelRateFormData[],
  });

  /* ---------------- FETCH ---------------- */
  const fetchRates = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('fuel_rates')
      .select('*')
      .order('effective_date', { ascending: false });

    if (error) {
      toast({ 
        title: 'Error fetching fuel rates', 
        description: error.message, 
        variant: 'destructive' 
      });
      console.error(error);
    } else {
      setRates(data || []);
    }
    setLoading(false);
  }, [toast]);

  /* ---------------- REAL-TIME SUBSCRIPTION ---------------- */
  useEffect(() => {
    fetchRates();

    let channel: RealtimeChannel;

    // Set up real-time subscription
    channel = supabase
      .channel('fuel_rates_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fuel_rates' },
        (payload) => {
          console.log('Real-time update:', payload);
          
          if (payload.eventType === 'INSERT') {
            setRates(prev => [payload.new as FuelRate, ...prev]);
            toast({ 
              title: 'Fuel rate updated', 
              description: 'A new fuel rate has been added.' 
            });
          } else if (payload.eventType === 'UPDATE') {
            setRates(prev => 
              prev.map(rate => 
                rate.id === payload.new.id ? payload.new as FuelRate : rate
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setRates(prev => prev.filter(rate => rate.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchRates, toast]);

  /* ---------------- HANDLE FORM SUBMISSION ---------------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const enabledRates = formData.rates.filter(r => r.enabled);

    if (enabledRates.length === 0) {
      toast({ 
        title: 'No fuel types selected', 
        description: 'Please select at least one fuel type to add.', 
        variant: 'destructive' 
      });
      setSubmitting(false);
      return;
    }

    // Validate that all enabled rates have values
    const invalidRates = enabledRates.filter(r => !r.rate_per_unit || parseFloat(r.rate_per_unit) <= 0);
    if (invalidRates.length > 0) {
      toast({ 
        title: 'Invalid rate values', 
        description: 'Please enter valid rates (greater than 0) for all selected fuel types.', 
        variant: 'destructive' 
      });
      setSubmitting(false);
      return;
    }

    const ratesToInsert = enabledRates.map(r => ({
      fuel_type: r.fuel_type,
      city: formData.city,
      rate_per_unit: parseFloat(r.rate_per_unit),
      effective_date: formData.effective_date,
    }));

    const { error } = await supabase
      .from('fuel_rates')
      .insert(ratesToInsert);

    if (error) {
      toast({ 
        title: 'Error saving fuel rates', 
        description: error.message, 
        variant: 'destructive' 
      });
      console.error(error);
      setSubmitting(false);
      return;
    }

    toast({ 
      title: 'Success!', 
      description: `${enabledRates.length} fuel rate(s) added successfully.` 
    });
    
    // Reset form
    setFormData({
      city: selectedCity,
      effective_date: new Date().toISOString().split('T')[0],
      rates: [
        { fuel_type: 'PETROL', rate_per_unit: '', enabled: true },
        { fuel_type: 'DIESEL', rate_per_unit: '', enabled: false },
        { fuel_type: 'EV', rate_per_unit: '', enabled: false },
        { fuel_type: 'CNG', rate_per_unit: '', enabled: false },
      ],
    });
    
    setDialogOpen(false);
    setSubmitting(false);
  };

  /* ---------------- MEMOIZED CALCULATIONS ---------------- */
  const cityRates = useMemo(() => 
    rates.filter(r => r.city === selectedCity),
    [rates, selectedCity]
  );

  const groupedRates = useMemo(() => {
    return FUEL_TYPES.map(type => {
      const typeRates = cityRates
        .filter(r => r.fuel_type === type)
        .sort((a, b) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime());

      const currentRate = typeRates[0];
      const previousRate = typeRates[1];
      
      let changePercent = 0;
      let changeDirection: 'up' | 'down' | 'none' = 'none';
      
      if (currentRate && previousRate) {
        changePercent = ((currentRate.rate_per_unit - previousRate.rate_per_unit) / previousRate.rate_per_unit) * 100;
        changeDirection = changePercent > 0 ? 'up' : changePercent < 0 ? 'down' : 'none';
      }

      return {
        type,
        currentRate,
        previousRate,
        changePercent,
        changeDirection,
        history: typeRates.slice(1),
      };
    });
  }, [cityRates]);

  /* ---------------- TOGGLE FUEL TYPE ---------------- */
  const toggleFuelType = (fuelType: FuelRateType) => {
    setFormData(prev => ({
      ...prev,
      rates: prev.rates.map(r => 
        r.fuel_type === fuelType ? { ...r, enabled: !r.enabled } : r
      )
    }));
  };

  /* ---------------- UPDATE RATE VALUE ---------------- */
  const updateRateValue = (fuelType: FuelRateType, value: string) => {
    setFormData(prev => ({
      ...prev,
      rates: prev.rates.map(r => 
        r.fuel_type === fuelType ? { ...r, rate_per_unit: value } : r
      )
    }));
  };

  /* ---------------- LOADING SKELETON ---------------- */
  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

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
              <Button aria-label="Add new fuel rate">
                <Plus className="w-4 h-4 mr-2" />
                Add Rate
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-lg" aria-describedby="dialog-description">
              <DialogHeader>
                <DialogTitle>Add Fuel Rate(s)</DialogTitle>
                <DialogDescription id="dialog-description">
                  Add rates for one or multiple fuel types at once
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="city-select">City</Label>
                  <Select
                    value={formData.city}
                    onValueChange={(value: City) => setFormData({ ...formData, city: value })}
                  >
                    <SelectTrigger id="city-select" aria-label="Select city">
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
                  <Label htmlFor="effective-date">Effective Date</Label>
                  <Input
                    id="effective-date"
                    type="date"
                    required
                    value={formData.effective_date}
                    onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                    aria-label="Effective date for fuel rates"
                  />
                </div>

                <div className="space-y-3 border rounded-lg p-4">
                  <Label className="text-base">Fuel Types & Rates</Label>
                  <p className="text-sm text-muted-foreground">
                    Select and enter rates for the fuel types you want to add
                  </p>

                  {formData.rates.map((rate) => (
                    <div 
                      key={rate.fuel_type} 
                      className={`flex items-center gap-3 p-3 border rounded-md transition-colors ${
                        rate.enabled ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'
                      }`}
                    >
                      <Checkbox
                        id={`checkbox-${rate.fuel_type}`}
                        checked={rate.enabled}
                        onCheckedChange={() => toggleFuelType(rate.fuel_type)}
                        aria-label={`Enable ${rate.fuel_type} rate input`}
                      />
                      <Label 
                        htmlFor={`checkbox-${rate.fuel_type}`}
                        className="flex-shrink-0 w-20 cursor-pointer"
                      >
                        {rate.fuel_type}
                        <span className="block text-xs text-muted-foreground font-normal">
                          {FUEL_UNIT_LABEL[rate.fuel_type]}
                        </span>
                      </Label>
                      <div className="flex-1">
                        <Input
                          id={`rate-${rate.fuel_type}`}
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder={`Rate ${FUEL_UNIT_LABEL[rate.fuel_type]}`}
                          value={rate.rate_per_unit}
                          onChange={(e) => updateRateValue(rate.fuel_type, e.target.value)}
                          disabled={!rate.enabled}
                          required={rate.enabled}
                          aria-label={`Rate per unit for ${rate.fuel_type}`}
                          className="transition-all"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {formData.rates.filter(r => r.enabled).length === 0 && (
                  <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-md">
                    <AlertCircle className="w-4 h-4" />
                    <span>Please select at least one fuel type</span>
                  </div>
                )}

                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setDialogOpen(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={submitting || formData.rates.filter(r => r.enabled).length === 0}
                  >
                    {submitting ? 'Saving...' : 'Save Rates'}
                  </Button>
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
              aria-pressed={selectedCity === city}
              aria-label={`View fuel rates for ${city}`}
            >
              {city}
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* CURRENT RATES */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {groupedRates.map(({ type, currentRate, changePercent, changeDirection }) => (
          <Card key={type}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Fuel className="w-5 h-5" /> {type}
              </CardTitle>
              <CardDescription>
                {selectedCity} · {FUEL_UNIT_LABEL[type]}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currentRate ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold">
                      {formatCurrency(currentRate.rate_per_unit)}
                    </p>
                    <span className="text-sm text-muted-foreground">{FUEL_UNIT_LABEL[type]}</span>
                    {changeDirection !== 'none' && (
                      <div className={`flex items-center gap-1 text-sm font-medium ${
                        changeDirection === 'up' ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {changeDirection === 'up' ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        <span>{Math.abs(changePercent).toFixed(2)}%</span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Since {new Date(currentRate.effective_date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </p>
                </>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Minus className="w-4 h-4" />
                  <p>No rate set</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* HISTORY */}
      <Card>
        <CardHeader>
          <CardTitle>Rate History — {selectedCity}</CardTitle>
          <CardDescription>
            {cityRates.length > 0 
              ? `Showing ${cityRates.length} rate entries`
              : 'No rate history available for this city'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cityRates.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fuel Type</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Rate per Unit</TableHead>
                    <TableHead>Effective Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cityRates.map(rate => {
                    const isCurrent =
                      groupedRates.find(g => g.type === rate.fuel_type)?.currentRate?.id === rate.id;

                    return (
                      <TableRow key={rate.id}>
                        <TableCell className="font-medium">{rate.fuel_type}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {FUEL_UNIT_LABEL[rate.fuel_type as FuelRateType] ?? '/unit'}
                        </TableCell>
                        <TableCell>{formatCurrency(rate.rate_per_unit)}</TableCell>
                        <TableCell>
                          {new Date(rate.effective_date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </TableCell>
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
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Fuel className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">No fuel rates found</p>
              <p className="text-sm mt-1">Add rates for {selectedCity} to see them here</p>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
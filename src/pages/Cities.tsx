// src/pages/Cities.tsx
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { Plus, MapPin, Pencil, Trash2, Search, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RealtimeChannel } from '@supabase/supabase-js';

interface City {
  name: string;
  created_at?: string;
}

export default function Cities() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cityToDelete, setCityToDelete] = useState<City | null>(null);

  const [formData, setFormData] = useState({
    name: '',
  });

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  /* ---------------- DEBOUNCED SEARCH ---------------- */
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  /* ---------------- FETCH CITIES ---------------- */
  const fetchCities = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cities')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setCities(data || []);
    } catch (err: any) {
      console.error('Error fetching cities:', err);
      toast({ 
        title: 'Error fetching cities', 
        description: err.message, 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  /* ---------------- REAL-TIME SUBSCRIPTION ---------------- */
  useEffect(() => {
    fetchCities();

    let channel: RealtimeChannel;

    // Set up real-time subscription
    channel = supabase
      .channel('cities_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cities' },
        (payload) => {
          console.log('Real-time update:', payload);
          
          if (payload.eventType === 'INSERT') {
            setCities(prev => [...prev, payload.new as City].sort((a, b) => 
              a.name.localeCompare(b.name)
            ));
            toast({ 
              title: 'City added', 
              description: `${payload.new.name} has been added to the system.` 
            });
          } else if (payload.eventType === 'UPDATE') {
            setCities(prev => 
              prev.map(city => 
                city.name === payload.old.name ? payload.new as City : city
              ).sort((a, b) => a.name.localeCompare(b.name))
            );
          } else if (payload.eventType === 'DELETE') {
            setCities(prev => prev.filter(city => city.name !== payload.old.name));
          }
        }
      )
      .subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchCities, toast]);

  /* ---------------- RESET FORM ---------------- */
  const resetForm = useCallback(() => {
    setFormData({ name: '' });
    setEditingCity(null);
  }, []);

  /* ---------------- OPEN DIALOG ---------------- */
  const handleOpenDialog = useCallback((city?: City) => {
    if (city) {
      setEditingCity(city);
      setFormData({ name: city.name });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  }, [resetForm]);

  /* ---------------- SUBMIT FORM ---------------- */
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (!formData.name.trim()) {
      toast({ 
        title: 'City name required', 
        description: 'Please enter a city name.', 
        variant: 'destructive' 
      });
      setSubmitting(false);
      return;
    }

    // Validate city name format (letters, spaces, and basic punctuation only)
    const cityNameRegex = /^[a-zA-Z\s\-'.]+$/;
    if (!cityNameRegex.test(formData.name)) {
      toast({ 
        title: 'Invalid city name', 
        description: 'City name can only contain letters, spaces, hyphens, apostrophes, and periods.', 
        variant: 'destructive' 
      });
      setSubmitting(false);
      return;
    }

    const cityName = formData.name.trim();

    try {
      if (editingCity) {
        // Update existing city
        const { error } = await supabase
          .from('cities')
          .update({ name: cityName })
          .eq('name', editingCity.name);

        if (error) throw error;
        toast({ title: 'City updated successfully' });
      } else {
        // Add new city
        const { error } = await supabase
          .from('cities')
          .insert([{ name: cityName }]);

        if (error) {
          if (error.code === '23505') { // Unique constraint violation
            toast({ 
              title: 'City already exists', 
              description: `${cityName} is already in the system.`, 
              variant: 'destructive' 
            });
            setSubmitting(false);
            return;
          }
          throw error;
        }
        toast({ title: 'City added successfully' });
      }

      setDialogOpen(false);
      resetForm();
    } catch (err: any) {
      console.error('Error saving city:', err);
      toast({ 
        title: 'Error saving city', 
        description: err.message, 
        variant: 'destructive' 
      });
    } finally {
      setSubmitting(false);
    }
  }, [formData, editingCity, toast, resetForm]);

  /* ---------------- DELETE HANDLERS ---------------- */
  const handleDeleteClick = useCallback((city: City) => {
    setCityToDelete(city);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!cityToDelete) return;
    
    try {
      const { error } = await supabase
        .from('cities')
        .delete()
        .eq('name', cityToDelete.name);

      if (error) {
        if (error.code === '23503') { // Foreign key constraint violation
          toast({ 
            title: 'Cannot delete city', 
            description: 'This city is being used in fuel rates or other records. Please remove those references first.', 
            variant: 'destructive' 
          });
          setDeleteDialogOpen(false);
          setCityToDelete(null);
          return;
        }
        throw error;
      }
      
      toast({ 
        title: 'City deleted successfully',
        description: `${cityToDelete.name} has been removed from the system.`
      });
    } catch (err: any) {
      console.error('Error deleting city:', err);
      toast({ 
        title: 'Error deleting city', 
        description: err.message, 
        variant: 'destructive' 
      });
    } finally {
      setDeleteDialogOpen(false);
      setCityToDelete(null);
    }
  }, [cityToDelete, toast]);

  /* ---------------- FILTERED CITIES ---------------- */
  const filteredCities = useMemo(() => {
    if (!debouncedSearchQuery) return cities;
    
    const query = debouncedSearchQuery.toLowerCase();
    return cities.filter(city => 
      city.name.toLowerCase().includes(query)
    );
  }, [cities, debouncedSearchQuery]);

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
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Cities</h1>
          <p className="text-muted-foreground mt-1">
            Manage cities available in the system
          </p>
        </div>

        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button aria-label="Add new city">
                <Plus className="w-4 h-4 mr-2" />
                Add City
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md" aria-describedby="dialog-description">
              <DialogHeader>
                <DialogTitle>{editingCity ? 'Edit City' : 'Add New City'}</DialogTitle>
                <DialogDescription id="dialog-description">
                  {editingCity ? 'Update city name' : 'Add a new city to the system'}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="city-name">City Name *</Label>
                  <Input
                    id="city-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ name: e.target.value })}
                    placeholder="e.g., Mumbai, Surat"
                    required
                    autoFocus
                    aria-label="City name"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the full city name (letters, spaces, hyphens, and apostrophes allowed)
                  </p>
                </div>

                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setDialogOpen(false);
                      resetForm();
                    }}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Saving...' : editingCity ? 'Update City' : 'Add City'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* STATS CARD */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" /> 
            City Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <p className="text-sm text-muted-foreground">Total Cities</p>
              <p className="text-3xl font-bold">{cities.length}</p>
            </div>
            <div className="flex-1 flex flex-wrap gap-2">
              {cities.slice(0, 5).map(city => (
                <Badge key={city.name} variant="outline" className="text-xs">
                  {city.name}
                </Badge>
              ))}
              {cities.length > 5 && (
                <Badge variant="secondary" className="text-xs">
                  +{cities.length - 5} more
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SEARCH BAR */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search cities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              aria-label="Search cities"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {searchQuery && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Searching for:</span>
              <Badge variant="secondary">{searchQuery}</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CITIES TABLE */}
      <Card>
        <CardHeader>
          <CardTitle>All Cities</CardTitle>
          <CardDescription>
            Showing {filteredCities.length} of {cities.length} cities
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredCities.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No cities found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery 
                  ? 'Try adjusting your search query'
                  : 'Add your first city to get started'
                }
              </p>
              {searchQuery && (
                <Button variant="outline" onClick={() => setSearchQuery('')}>
                  <X className="w-4 h-4 mr-2" />
                  Clear Search
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>City Name</TableHead>
                      {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCities.map((city, index) => (
                      <TableRow key={city.name}>
                        <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            {city.name}
                          </div>
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDialog(city)}
                                aria-label={`Edit ${city.name}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClick(city)}
                                className="text-destructive hover:text-destructive"
                                aria-label={`Delete ${city.name}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {filteredCities.map((city, index) => (
                  <Card key={city.name} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground font-medium">
                            #{index + 1}
                          </span>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{city.name}</span>
                          </div>
                        </div>
                        
                        {isAdmin && (
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(city)}
                              aria-label={`Edit ${city.name}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(city)}
                              className="text-destructive hover:text-destructive"
                              aria-label={`Delete ${city.name}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* DELETE CONFIRMATION DIALOG */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{cityToDelete?.name}</strong> from the system. 
              This action cannot be undone.
              <br /><br />
              <strong>Note:</strong> If this city is being used in fuel rates or other records, 
              the deletion will fail. You'll need to remove those references first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete City
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
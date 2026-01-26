// src/pages/Vehicles.tsx
import { useEffect, useState, useMemo, useCallback } from 'react';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Pencil, Trash2, Car, MoreVertical, Power, PowerOff, Search, X, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Filter, AlertCircle, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/supabase/client';
import type { Vehicle, FuelType } from '@/types';
import { RealtimeChannel } from '@supabase/supabase-js';

const FUEL_TYPES: FuelType[] = ['PETROL', 'DIESEL', 'HYBRID', 'EV'];
const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

type SortField = 'brand_name' | 'model_name' | 'mileage_km_per_unit' | 'maintenance_cost_per_km';
type SortDirection = 'asc' | 'desc';

interface VariantFormData {
  fuel_type: FuelType;
  variant_name: string;
  mileage_km_per_unit: string;
  maintenance_cost_per_km: string;
  enabled: boolean;
}

export default function Vehicles() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Form data for adding multiple variants
  const [formData, setFormData] = useState({
    brand_name: '',
    model_name: '',
    variants: [
      { fuel_type: 'PETROL' as FuelType, variant_name: '', mileage_km_per_unit: '', maintenance_cost_per_km: '', enabled: true },
      { fuel_type: 'DIESEL' as FuelType, variant_name: '', mileage_km_per_unit: '', maintenance_cost_per_km: '', enabled: false },
      { fuel_type: 'HYBRID' as FuelType, variant_name: '', mileage_km_per_unit: '', maintenance_cost_per_km: '', enabled: false },
      { fuel_type: 'EV' as FuelType, variant_name: '', mileage_km_per_unit: '', maintenance_cost_per_km: '', enabled: false },
    ] as VariantFormData[],
  });

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [fuelTypeFilter, setFuelTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Sorting States
  const [sortField, setSortField] = useState<SortField>('brand_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  /* ---------------- DEBOUNCED SEARCH ---------------- */
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  /* ---------------- FETCH VEHICLES ---------------- */
  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('brand_name', { ascending: true });
      if (error) throw error;
      setVehicles(data || []);
    } catch (err: any) {
      console.error('Error fetching vehicles:', err);
      toast({ title: 'Error fetching vehicles', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  /* ---------------- REAL-TIME SUBSCRIPTION ---------------- */
  useEffect(() => {
    fetchVehicles();

    let channel: RealtimeChannel;

    // Set up real-time subscription
    channel = supabase
      .channel('vehicles_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vehicles' },
        (payload) => {
          console.log('Real-time update:', payload);
          
          if (payload.eventType === 'INSERT') {
            setVehicles(prev => [...prev, payload.new as Vehicle].sort((a, b) => 
              a.brand_name.localeCompare(b.brand_name)
            ));
            toast({ 
              title: 'New vehicle added', 
              description: `${payload.new.brand_name} ${payload.new.model_name} has been added.` 
            });
          } else if (payload.eventType === 'UPDATE') {
            setVehicles(prev => 
              prev.map(vehicle => 
                vehicle.id === payload.new.id ? payload.new as Vehicle : vehicle
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setVehicles(prev => prev.filter(vehicle => vehicle.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchVehicles, toast]);

  /* ---------------- FORM RESET ---------------- */
  const resetForm = useCallback(() => {
    setFormData({
      brand_name: '',
      model_name: '',
      variants: [
        { fuel_type: 'PETROL', variant_name: '', mileage_km_per_unit: '', maintenance_cost_per_km: '', enabled: true },
        { fuel_type: 'DIESEL', variant_name: '', mileage_km_per_unit: '', maintenance_cost_per_km: '', enabled: false },
        { fuel_type: 'HYBRID', variant_name: '', mileage_km_per_unit: '', maintenance_cost_per_km: '', enabled: false },
        { fuel_type: 'EV', variant_name: '', mileage_km_per_unit: '', maintenance_cost_per_km: '', enabled: false },
      ],
    });
    setEditingVehicle(null);
  }, []);

  /* ---------------- OPEN DIALOG ---------------- */
  const handleOpenDialog = useCallback((vehicle?: Vehicle) => {
    if (vehicle) {
      setEditingVehicle(vehicle);
      // For editing, we only show a single variant (traditional edit mode)
      setFormData({
        brand_name: vehicle.brand_name,
        model_name: vehicle.model_name,
        variants: [
          { 
            fuel_type: vehicle.fuel_type, 
            variant_name: vehicle.variant_name, 
            mileage_km_per_unit: vehicle.mileage_km_per_unit.toString(), 
            maintenance_cost_per_km: vehicle.maintenance_cost_per_km.toString(),
            enabled: true 
          },
        ],
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  }, [resetForm]);

  /* ---------------- DUPLICATE VEHICLE ---------------- */
  const handleDuplicateVehicle = useCallback((vehicle: Vehicle) => {
    setEditingVehicle(null); // Not editing, creating new
    setFormData({
      brand_name: vehicle.brand_name,
      model_name: vehicle.model_name,
      variants: [
        { 
          fuel_type: vehicle.fuel_type, 
          variant_name: vehicle.variant_name + ' (Copy)', 
          mileage_km_per_unit: vehicle.mileage_km_per_unit.toString(), 
          maintenance_cost_per_km: vehicle.maintenance_cost_per_km.toString(),
          enabled: true 
        },
      ],
    });
    setDialogOpen(true);
  }, []);

  /* ---------------- TOGGLE VARIANT ---------------- */
  const toggleVariant = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.map((v, i) => 
        i === index ? { ...v, enabled: !v.enabled } : v
      )
    }));
  }, []);

  /* ---------------- UPDATE VARIANT FIELD ---------------- */
  const updateVariantField = useCallback((index: number, field: keyof VariantFormData, value: string | FuelType) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.map((v, i) => 
        i === index ? { ...v, [field]: value } : v
      )
    }));
  }, []);

  /* ---------------- COPY MAINTENANCE COST TO ALL ---------------- */
  const copyMaintenanceCostToAll = useCallback((sourceIndex: number) => {
    const sourceCost = formData.variants[sourceIndex].maintenance_cost_per_km;
    if (!sourceCost) {
      toast({ title: 'No value to copy', description: 'Please enter a maintenance cost first.', variant: 'destructive' });
      return;
    }

    setFormData(prev => ({
      ...prev,
      variants: prev.variants.map(v => ({ ...v, maintenance_cost_per_km: sourceCost }))
    }));

    toast({ title: 'Maintenance cost copied', description: `All variants now have ₹${sourceCost}/km` });
  }, [formData.variants, toast]);

  /* ---------------- SUBMIT FORM ---------------- */
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (!formData.brand_name || !formData.model_name) {
      toast({ title: 'Please fill all required fields', description: 'Brand and Model are required.', variant: 'destructive' });
      setSubmitting(false);
      return;
    }

    const enabledVariants = formData.variants.filter(v => v.enabled);

    if (enabledVariants.length === 0) {
      toast({ title: 'No variants selected', description: 'Please select at least one variant to add.', variant: 'destructive' });
      setSubmitting(false);
      return;
    }

    // Validate enabled variants
    const invalidVariants = enabledVariants.filter(v => 
      !v.variant_name || 
      !v.mileage_km_per_unit || 
      parseFloat(v.mileage_km_per_unit) <= 0 ||
      !v.maintenance_cost_per_km ||
      parseFloat(v.maintenance_cost_per_km) < 0
    );

    if (invalidVariants.length > 0) {
      toast({ 
        title: 'Invalid variant data', 
        description: 'Please fill all required fields for selected variants with valid values.', 
        variant: 'destructive' 
      });
      setSubmitting(false);
      return;
    }

    try {
      if (editingVehicle) {
        // Traditional edit mode - only update single vehicle
        const vehicleData = {
          brand_name: formData.brand_name,
          model_name: formData.model_name,
          variant_name: enabledVariants[0].variant_name,
          fuel_type: enabledVariants[0].fuel_type,
          mileage_km_per_unit: parseFloat(enabledVariants[0].mileage_km_per_unit),
          maintenance_cost_per_km: parseFloat(enabledVariants[0].maintenance_cost_per_km),
        };

        const { error } = await supabase
          .from('vehicles')
          .update(vehicleData)
          .eq('id', editingVehicle.id);
        
        if (error) throw error;
        toast({ title: 'Vehicle updated successfully' });
      } else {
        // Multi-variant add mode
        const vehiclesToInsert = enabledVariants.map(v => ({
          brand_name: formData.brand_name,
          model_name: formData.model_name,
          variant_name: v.variant_name,
          fuel_type: v.fuel_type,
          mileage_km_per_unit: parseFloat(v.mileage_km_per_unit),
          maintenance_cost_per_km: parseFloat(v.maintenance_cost_per_km),
        }));

        const { error } = await supabase
          .from('vehicles')
          .insert(vehiclesToInsert);
        
        if (error) throw error;
        toast({ 
          title: 'Success!', 
          description: `${enabledVariants.length} vehicle variant(s) added successfully.` 
        });
      }

      setDialogOpen(false);
      resetForm();
    } catch (err: any) {
      console.error('Error saving vehicle:', err);
      toast({ title: 'Error saving vehicle', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }, [formData, editingVehicle, toast, resetForm]);

  /* ---------------- TOGGLE ACTIVE (WITH OPTIMISTIC UPDATE) ---------------- */
  const handleToggleActive = useCallback(async (vehicle: Vehicle) => {
    // Optimistic update
    setVehicles(prev => 
      prev.map(v => 
        v.id === vehicle.id ? { ...v, is_active: !v.is_active } : v
      )
    );

    try {
      const { error } = await supabase
        .from('vehicles')
        .update({ is_active: !vehicle.is_active })
        .eq('id', vehicle.id);
      
      if (error) throw error;

      toast({ 
        title: vehicle.is_active ? 'Vehicle deactivated' : 'Vehicle activated',
        description: `${vehicle.brand_name} ${vehicle.model_name} is now ${!vehicle.is_active ? 'active' : 'inactive'}`
      });
    } catch (err: any) {
      // Revert optimistic update on error
      setVehicles(prev => 
        prev.map(v => 
          v.id === vehicle.id ? { ...v, is_active: vehicle.is_active } : v
        )
      );
      console.error('Error updating vehicle status:', err);
      toast({ title: 'Error updating status', description: err.message, variant: 'destructive' });
    }
  }, [toast]);

  /* ---------------- DELETE HANDLERS ---------------- */
  const handleDeleteClick = useCallback((vehicle: Vehicle) => {
    setVehicleToDelete(vehicle);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!vehicleToDelete) return;
    
    try {
      const { error } = await supabase.from('vehicles').delete().eq('id', vehicleToDelete.id);
      if (error) throw error;
      
      toast({ 
        title: 'Vehicle deleted successfully',
        description: `${vehicleToDelete.brand_name} ${vehicleToDelete.model_name} has been removed`
      });
    } catch (err: any) {
      console.error('Error deleting vehicle:', err);
      toast({ title: 'Error deleting vehicle', description: err.message, variant: 'destructive' });
    } finally {
      setDeleteDialogOpen(false);
      setVehicleToDelete(null);
    }
  }, [vehicleToDelete, toast]);

  /* ---------------- FORMAT CURRENCY ---------------- */
  const formatCurrency = useCallback((amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }, []);

  /* ---------------- FILTERED AND SORTED VEHICLES ---------------- */
  const filteredAndSortedVehicles = useMemo(() => {
    let filtered = vehicles;

    // Apply search filter (debounced)
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(vehicle => 
        vehicle.brand_name.toLowerCase().includes(query) ||
        vehicle.model_name.toLowerCase().includes(query) ||
        vehicle.variant_name.toLowerCase().includes(query)
      );
    }

    // Apply fuel type filter
    if (fuelTypeFilter !== 'all') {
      filtered = filtered.filter(vehicle => vehicle.fuel_type === fuelTypeFilter);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(vehicle => 
        statusFilter === 'active' ? vehicle.is_active : !vehicle.is_active
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [vehicles, debouncedSearchQuery, fuelTypeFilter, statusFilter, sortField, sortDirection]);

  /* ---------------- PAGINATION ---------------- */
  const totalPages = Math.ceil(filteredAndSortedVehicles.length / itemsPerPage);
  const paginatedVehicles = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSortedVehicles.slice(startIndex, endIndex);
  }, [filteredAndSortedVehicles, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, fuelTypeFilter, statusFilter, itemsPerPage]);

  /* ---------------- STATS ---------------- */
  const stats = useMemo(() => {
    const active = vehicles.filter(v => v.is_active).length;
    const inactive = vehicles.filter(v => !v.is_active).length;
    
    const fuelTypeCounts = vehicles.reduce((acc, v) => {
      acc[v.fuel_type] = (acc[v.fuel_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const avgMileage = vehicles.length > 0
      ? vehicles.reduce((sum, v) => sum + v.mileage_km_per_unit, 0) / vehicles.length
      : 0;

    return { active, inactive, fuelTypeCounts, avgMileage };
  }, [vehicles]);

  /* ---------------- SORT HANDLER ---------------- */
  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField, sortDirection]);

  /* ---------------- CLEAR FILTERS ---------------- */
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setFuelTypeFilter('all');
    setStatusFilter('all');
  }, []);

  const hasActiveFilters = searchQuery || fuelTypeFilter !== 'all' || statusFilter !== 'all';

  /* ---------------- SORT ICON COMPONENT ---------------- */
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1 inline opacity-30" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4 ml-1 inline" />
      : <ArrowDown className="w-4 h-4 ml-1 inline" />;
  };

  /* ---------------- LOADING SKELETON ---------------- */
  if (loading) {
    return (
      <div className="space-y-6 p-6 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  /* ---------------- FILTERS COMPONENT (FOR MOBILE SHEET) ---------------- */
  const FiltersContent = () => (
    <div className="space-y-4">
      {/* Search */}
      <div className="space-y-2">
        <Label htmlFor="search-input">Search Vehicles</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="search-input"
            placeholder="Brand, model, or variant..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            aria-label="Search vehicles by brand, model, or variant"
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
      </div>

      {/* Fuel Type Filter */}
      <div className="space-y-2">
        <Label htmlFor="fuel-filter">Fuel Type</Label>
        <Select value={fuelTypeFilter} onValueChange={setFuelTypeFilter}>
          <SelectTrigger id="fuel-filter" aria-label="Filter by fuel type">
            <SelectValue placeholder="Fuel Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Fuel Types</SelectItem>
            {FUEL_TYPES.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status Filter */}
      <div className="space-y-2">
        <Label htmlFor="status-filter">Status</Label>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger id="status-filter" aria-label="Filter by vehicle status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active Only</SelectItem>
            <SelectItem value="inactive">Inactive Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button variant="outline" onClick={clearFilters} className="w-full">
          <X className="w-4 h-4 mr-2" />
          Clear All Filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Vehicles</CardDescription>
            <CardTitle className="text-2xl md:text-3xl">{vehicles.length}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Active / Inactive</CardDescription>
            <CardTitle className="text-2xl md:text-3xl">
              <span className="text-green-600">{stats.active}</span>
              <span className="text-lg md:text-xl text-muted-foreground"> / </span>
              <span className="text-gray-500">{stats.inactive}</span>
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Fuel Types</CardDescription>
            <div className="flex flex-wrap gap-1 md:gap-2 mt-2">
              {FUEL_TYPES.map(type => (
                <Badge key={type} variant="outline" className="text-xs">
                  {type}: {stats.fuelTypeCounts[type] || 0}
                </Badge>
              ))}
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Avg Mileage</CardDescription>
            <CardTitle className="text-2xl md:text-3xl">
              {stats.avgMileage.toFixed(1)} <span className="text-base md:text-lg text-muted-foreground">km</span>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Header with Add Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Vehicle Master</h1>
          <p className="text-sm text-muted-foreground">Manage your vehicle database</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} aria-label="Add new vehicle">
              <Plus className="w-4 h-4 mr-2" />
              Add Vehicle
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto" aria-describedby="dialog-description">
            <DialogHeader>
              <DialogTitle>{editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle(s)'}</DialogTitle>
              <DialogDescription id="dialog-description">
                {editingVehicle 
                  ? 'Update vehicle information' 
                  : 'Enter vehicle details. You can add multiple variants at once by selecting different fuel types.'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Brand and Model */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brand">Brand Name *</Label>
                  <Input
                    id="brand"
                    value={formData.brand_name}
                    onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                    placeholder="Toyota"
                    required
                    aria-label="Vehicle brand name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Model Name *</Label>
                  <Input
                    id="model"
                    value={formData.model_name}
                    onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
                    placeholder="Innova Crysta"
                    required
                    aria-label="Vehicle model name"
                  />
                </div>
              </div>

              {/* Variants Section */}
              <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Variants *</Label>
                  {!editingVehicle && formData.variants.filter(v => v.enabled).length > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {formData.variants.filter(v => v.enabled).length} variant(s) selected
                    </span>
                  )}
                </div>
                
                {!editingVehicle && (
                  <p className="text-sm text-muted-foreground">
                    Select fuel types and enter details for each variant you want to add
                  </p>
                )}

                {formData.variants.map((variant, index) => (
                  <div 
                    key={index} 
                    className={`border rounded-lg p-4 space-y-3 transition-colors ${
                      variant.enabled ? 'bg-background border-primary/30' : 'bg-muted/50 border-border'
                    }`}
                  >
                    {/* Fuel Type Header with Checkbox (only for add mode) */}
                    {!editingVehicle && (
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={`variant-${index}`}
                          checked={variant.enabled}
                          onCheckedChange={() => toggleVariant(index)}
                          aria-label={`Enable ${variant.fuel_type} variant`}
                        />
                        <Label htmlFor={`variant-${index}`} className="text-base font-semibold cursor-pointer flex-1">
                          {variant.fuel_type}
                        </Label>
                      </div>
                    )}

                    {(editingVehicle || variant.enabled) && (
                      <>
                        {/* Variant Name */}
                        <div className="space-y-2">
                          <Label htmlFor={`variant-name-${index}`}>Variant Name *</Label>
                          <Input
                            id={`variant-name-${index}`}
                            value={variant.variant_name}
                            onChange={(e) => updateVariantField(index, 'variant_name', e.target.value)}
                            placeholder={`e.g., ${variant.fuel_type === 'EV' ? 'Long Range AWD' : 'GX 2.4'}`}
                            required={variant.enabled}
                            disabled={!variant.enabled && !editingVehicle}
                            aria-label={`Variant name for ${variant.fuel_type}`}
                          />
                        </div>

                        {/* Mileage and Maintenance */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor={`mileage-${index}`}>
                              Mileage * (km/{variant.fuel_type === 'EV' ? 'kWh' : 'L'})
                            </Label>
                            <Input
                              id={`mileage-${index}`}
                              type="number"
                              step="0.1"
                              min="0.1"
                              value={variant.mileage_km_per_unit}
                              onChange={(e) => updateVariantField(index, 'mileage_km_per_unit', e.target.value)}
                              placeholder="12.5"
                              required={variant.enabled}
                              disabled={!variant.enabled && !editingVehicle}
                              aria-label={`Mileage for ${variant.fuel_type} variant`}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label htmlFor={`maintenance-${index}`}>Maintenance * (₹/km)</Label>
                              {!editingVehicle && index === 0 && variant.enabled && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-xs"
                                  onClick={() => copyMaintenanceCostToAll(index)}
                                  aria-label="Copy maintenance cost to all variants"
                                >
                                  <Copy className="w-3 h-3 mr-1" />
                                  Copy to all
                                </Button>
                              )}
                            </div>
                            <Input
                              id={`maintenance-${index}`}
                              type="number"
                              step="0.01"
                              min="0"
                              value={variant.maintenance_cost_per_km}
                              onChange={(e) => updateVariantField(index, 'maintenance_cost_per_km', e.target.value)}
                              placeholder="2.5"
                              required={variant.enabled}
                              disabled={!variant.enabled && !editingVehicle}
                              aria-label={`Maintenance cost for ${variant.fuel_type} variant`}
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}

                {!editingVehicle && formData.variants.filter(v => v.enabled).length === 0 && (
                  <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-md">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>Please select at least one variant to add</span>
                  </div>
                )}
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
                <Button 
                  type="submit" 
                  disabled={submitting || (!editingVehicle && formData.variants.filter(v => v.enabled).length === 0)}
                >
                  {submitting ? 'Saving...' : editingVehicle ? 'Update Vehicle' : 'Add Vehicle(s)'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter Bar - Desktop */}
      <Card className="hidden md:block">
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by brand, model, or variant..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                aria-label="Search vehicles"
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

            {/* Fuel Type Filter */}
            <Select value={fuelTypeFilter} onValueChange={setFuelTypeFilter}>
              <SelectTrigger className="w-full lg:w-[180px]" aria-label="Filter by fuel type">
                <SelectValue placeholder="Fuel Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Fuel Types</SelectItem>
                {FUEL_TYPES.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-[180px]" aria-label="Filter by status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters} aria-label="Clear all filters">
                <X className="w-4 h-4 mr-2" />
                Clear
              </Button>
            )}
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {searchQuery && (
                <Badge variant="secondary">
                  Search: {searchQuery}
                </Badge>
              )}
              {fuelTypeFilter !== 'all' && (
                <Badge variant="secondary">
                  Fuel: {fuelTypeFilter}
                </Badge>
              )}
              {statusFilter !== 'all' && (
                <Badge variant="secondary">
                  Status: {statusFilter}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mobile Filter Button */}
      <div className="md:hidden">
        <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full" aria-label="Open filters">
              <Filter className="w-4 h-4 mr-2" />
              Filters {hasActiveFilters && `(${[searchQuery, fuelTypeFilter !== 'all', statusFilter !== 'all'].filter(Boolean).length})`}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh]">
            <SheetHeader>
              <SheetTitle>Filter Vehicles</SheetTitle>
              <SheetDescription>
                Refine your vehicle search with filters
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              <FiltersContent />
            </div>
          </SheetContent>
        </Sheet>

        {/* Active Filters Display - Mobile */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="text-sm text-muted-foreground">Active:</span>
            {searchQuery && (
              <Badge variant="secondary" className="text-xs">
                Search: {searchQuery.length > 15 ? searchQuery.substring(0, 15) + '...' : searchQuery}
              </Badge>
            )}
            {fuelTypeFilter !== 'all' && (
              <Badge variant="secondary" className="text-xs">
                {fuelTypeFilter}
              </Badge>
            )}
            {statusFilter !== 'all' && (
              <Badge variant="secondary" className="text-xs">
                {statusFilter === 'active' ? 'Active' : 'Inactive'}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Vehicles Table/Cards */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <CardTitle className="text-lg">All Vehicles</CardTitle>
              <CardDescription>
                Showing {paginatedVehicles.length} of {filteredAndSortedVehicles.length} vehicles
                {hasActiveFilters && ` (filtered from ${vehicles.length} total)`}
              </CardDescription>
            </div>
            
            {/* Items per page selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Show:</span>
              <Select 
                value={itemsPerPage.toString()} 
                onValueChange={(value) => setItemsPerPage(Number(value))}
              >
                <SelectTrigger className="w-[80px]" aria-label="Items per page">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ITEMS_PER_PAGE_OPTIONS.map(option => (
                    <SelectItem key={option} value={option.toString()}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {filteredAndSortedVehicles.length === 0 ? (
            <div className="text-center py-12">
              <Car className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No vehicles found</h3>
              <p className="text-muted-foreground mb-4">
                {hasActiveFilters 
                  ? 'Try adjusting your filters to see more results'
                  : 'Add your first vehicle to get started'
                }
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  <X className="w-4 h-4 mr-2" />
                  Clear Filters
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
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSort('brand_name')}
                        role="button"
                        tabIndex={0}
                        aria-label="Sort by brand name"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSort('brand_name');
                          }
                        }}
                      >
                        Brand <SortIcon field="brand_name" />
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSort('model_name')}
                        role="button"
                        tabIndex={0}
                        aria-label="Sort by model name"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSort('model_name');
                          }
                        }}
                      >
                        Model <SortIcon field="model_name" />
                      </TableHead>
                      <TableHead>Variant</TableHead>
                      <TableHead>Fuel</TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSort('mileage_km_per_unit')}
                        role="button"
                        tabIndex={0}
                        aria-label="Sort by mileage"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSort('mileage_km_per_unit');
                          }
                        }}
                      >
                        Mileage <SortIcon field="mileage_km_per_unit" />
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSort('maintenance_cost_per_km')}
                        role="button"
                        tabIndex={0}
                        aria-label="Sort by maintenance cost"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSort('maintenance_cost_per_km');
                          }
                        }}
                      >
                        Maintenance <SortIcon field="maintenance_cost_per_km" />
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedVehicles.map(vehicle => (
                      <TableRow key={vehicle.id}>
                        <TableCell className="font-medium">{vehicle.brand_name}</TableCell>
                        <TableCell>{vehicle.model_name}</TableCell>
                        <TableCell className="text-muted-foreground">{vehicle.variant_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{vehicle.fuel_type}</Badge>
                        </TableCell>
                        <TableCell>
                          {vehicle.mileage_km_per_unit} km/{vehicle.fuel_type === 'EV' ? 'kWh' : 'L'}
                        </TableCell>
                        <TableCell>{formatCurrency(vehicle.maintenance_cost_per_km)}/km</TableCell>
                        <TableCell>
                          <Badge variant={vehicle.is_active ? 'default' : 'secondary'}>
                            {vehicle.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" aria-label={`Actions for ${vehicle.brand_name} ${vehicle.model_name}`}>
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenDialog(vehicle)}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Edit Vehicle
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDuplicateVehicle(vehicle)}>
                                <Copy className="w-4 h-4 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              {isAdmin && (
                                <>
                                  <DropdownMenuItem onClick={() => handleToggleActive(vehicle)}>
                                    {vehicle.is_active ? (
                                      <>
                                        <PowerOff className="w-4 h-4 mr-2" />
                                        Deactivate
                                      </>
                                    ) : (
                                      <>
                                        <Power className="w-4 h-4 mr-2" />
                                        Activate
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => handleDeleteClick(vehicle)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Vehicle
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {paginatedVehicles.map(vehicle => (
                  <Card key={vehicle.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{vehicle.brand_name} {vehicle.model_name}</h3>
                          <p className="text-sm text-muted-foreground truncate">{vehicle.variant_name}</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="flex-shrink-0" aria-label={`Actions for ${vehicle.brand_name} ${vehicle.model_name}`}>
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenDialog(vehicle)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit Vehicle
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicateVehicle(vehicle)}>
                              <Copy className="w-4 h-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            {isAdmin && (
                              <>
                                <DropdownMenuItem onClick={() => handleToggleActive(vehicle)}>
                                  {vehicle.is_active ? (
                                    <>
                                      <PowerOff className="w-4 h-4 mr-2" />
                                      Deactivate
                                    </>
                                  ) : (
                                    <>
                                      <Power className="w-4 h-4 mr-2" />
                                      Activate
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteClick(vehicle)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete Vehicle
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground block mb-1">Fuel Type</span>
                          <Badge variant="outline">{vehicle.fuel_type}</Badge>
                        </div>
                        <div>
                          <span className="text-muted-foreground block mb-1">Status</span>
                          <Badge variant={vehicle.is_active ? 'default' : 'secondary'}>
                            {vehicle.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-muted-foreground block mb-1">Mileage</span>
                          <span className="font-medium">
                            {vehicle.mileage_km_per_unit} km/{vehicle.fuel_type === 'EV' ? 'kWh' : 'L'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block mb-1">Maintenance</span>
                          <span className="font-medium">{formatCurrency(vehicle.maintenance_cost_per_km)}/km</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t">
                  <div className="text-sm text-muted-foreground" role="status" aria-live="polite">
                    Page {currentPage} of {totalPages}
                  </div>
                  
                  <nav className="flex items-center gap-2" aria-label="Pagination navigation">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      aria-label="Go to previous page"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      <span className="hidden sm:inline">Previous</span>
                    </Button>
                    
                    {/* Page Numbers */}
                    <div className="hidden sm:flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className="w-9"
                            aria-label={`Go to page ${pageNum}`}
                            aria-current={currentPage === pageNum ? 'page' : undefined}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      aria-label="Go to next page"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </nav>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{vehicleToDelete?.brand_name} {vehicleToDelete?.model_name}</strong> from the system. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Vehicle
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
import { useEffect, useState, useMemo } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, Car, MoreVertical, Power, PowerOff, Search, X, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/supabase/client';
import type { Vehicle, FuelType } from '@/types';

const FUEL_TYPES: FuelType[] = ['PETROL', 'DIESEL', 'HYBRID', 'EV'];

type SortField = 'brand_name' | 'model_name' | 'mileage_km_per_unit' | 'maintenance_cost_per_km';
type SortDirection = 'asc' | 'desc';

export default function Vehicles() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState({
    brand_name: '',
    model_name: '',
    variant_name: '',
    fuel_type: 'PETROL' as FuelType,
    mileage_km_per_unit: '',
    maintenance_cost_per_km: '',
  });
  const [loading, setLoading] = useState(true);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [fuelTypeFilter, setFuelTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Sorting States
  const [sortField, setSortField] = useState<SortField>('brand_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchVehicles = async () => {
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
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const resetForm = () => {
    setFormData({
      brand_name: '',
      model_name: '',
      variant_name: '',
      fuel_type: 'PETROL',
      mileage_km_per_unit: '',
      maintenance_cost_per_km: '',
    });
    setEditingVehicle(null);
  };

  const handleOpenDialog = (vehicle?: Vehicle) => {
    if (vehicle) {
      setEditingVehicle(vehicle);
      setFormData({
        brand_name: vehicle.brand_name,
        model_name: vehicle.model_name,
        variant_name: vehicle.variant_name,
        fuel_type: vehicle.fuel_type,
        mileage_km_per_unit: vehicle.mileage_km_per_unit.toString(),
        maintenance_cost_per_km: vehicle.maintenance_cost_per_km.toString(),
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.brand_name || !formData.model_name || !formData.variant_name) {
      toast({ title: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    try {
      const vehicleData = {
        brand_name: formData.brand_name,
        model_name: formData.model_name,
        variant_name: formData.variant_name,
        fuel_type: formData.fuel_type,
        mileage_km_per_unit: parseFloat(formData.mileage_km_per_unit) || 0,
        maintenance_cost_per_km: parseFloat(formData.maintenance_cost_per_km) || 0,
      };

      if (editingVehicle) {
        const { error } = await supabase
          .from('vehicles')
          .update(vehicleData)
          .eq('id', editingVehicle.id);
        if (error) throw error;
        toast({ title: 'Vehicle updated successfully' });
      } else {
        const { error } = await supabase
          .from('vehicles')
          .insert([vehicleData]);
        if (error) throw error;
        toast({ title: 'Vehicle added successfully' });
      }
      fetchVehicles();
      setDialogOpen(false);
      resetForm();
    } catch (err: any) {
      console.error('Error saving vehicle:', err);
      toast({ title: 'Error saving vehicle', description: err.message, variant: 'destructive' });
    }
  };

  const handleToggleActive = async (vehicle: Vehicle) => {
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({ is_active: !vehicle.is_active })
        .eq('id', vehicle.id);
      if (error) throw error;
      fetchVehicles();
      toast({ 
        title: vehicle.is_active ? 'Vehicle deactivated' : 'Vehicle activated',
        description: `${vehicle.brand_name} ${vehicle.model_name} is now ${!vehicle.is_active ? 'active' : 'inactive'}`
      });
    } catch (err: any) {
      console.error('Error updating vehicle status:', err);
      toast({ title: 'Error updating status', description: err.message, variant: 'destructive' });
    }
  };

  const handleDeleteClick = (vehicle: Vehicle) => {
    setVehicleToDelete(vehicle);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!vehicleToDelete) return;
    
    try {
      const { error } = await supabase.from('vehicles').delete().eq('id', vehicleToDelete.id);
      if (error) throw error;
      fetchVehicles();
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
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Filtered and Sorted Vehicles
  const filteredAndSortedVehicles = useMemo(() => {
    let filtered = vehicles;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
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
  }, [vehicles, searchQuery, fuelTypeFilter, statusFilter, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedVehicles.length / itemsPerPage);
  const paginatedVehicles = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSortedVehicles.slice(startIndex, endIndex);
  }, [filteredAndSortedVehicles, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, fuelTypeFilter, statusFilter, itemsPerPage]);

  // Stats calculations
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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFuelTypeFilter('all');
    setStatusFilter('all');
  };

  const hasActiveFilters = searchQuery || fuelTypeFilter !== 'all' || statusFilter !== 'all';

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1 inline opacity-30" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4 ml-1 inline" />
      : <ArrowDown className="w-4 h-4 ml-1 inline" />;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Stats Dashboard */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Vehicles</CardDescription>
              <CardTitle className="text-3xl">{vehicles.length}</CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Active / Inactive</CardDescription>
              <CardTitle className="text-3xl">
                <span className="text-green-600">{stats.active}</span>
                <span className="text-xl text-muted-foreground"> / </span>
                <span className="text-gray-500">{stats.inactive}</span>
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Fuel Types</CardDescription>
              <div className="flex flex-wrap gap-2 mt-2">
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
              <CardTitle className="text-3xl">{stats.avgMileage.toFixed(1)} <span className="text-lg text-muted-foreground">km</span></CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Header with Search and Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Vehicle Master</h1>
          <p className="text-sm text-muted-foreground">Manage your vehicle database</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Vehicle
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}</DialogTitle>
              <DialogDescription>
                {editingVehicle ? 'Update vehicle information' : 'Enter vehicle details to add to master'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brand">Brand Name *</Label>
                  <Input
                    id="brand"
                    value={formData.brand_name}
                    onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                    placeholder="Toyota"
                    required
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
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="variant">Variant Name *</Label>
                  <Input
                    id="variant"
                    value={formData.variant_name}
                    onChange={(e) => setFormData({ ...formData, variant_name: e.target.value })}
                    placeholder="GX 2.4"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fuel">Fuel Type *</Label>
                  <Select
                    value={formData.fuel_type}
                    onValueChange={(value: FuelType) => setFormData({ ...formData, fuel_type: value })}
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mileage">Mileage (km per unit) *</Label>
                  <Input
                    id="mileage"
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.mileage_km_per_unit}
                    onChange={(e) => setFormData({ ...formData, mileage_km_per_unit: e.target.value })}
                    placeholder="12"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    For EV: km per kWh, Others: km per litre
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maintenance">Maintenance Cost (₹/km) *</Label>
                  <Input
                    id="maintenance"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.maintenance_cost_per_km}
                    onChange={(e) => setFormData({ ...formData, maintenance_cost_per_km: e.target.value })}
                    placeholder="2.5"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Cost per kilometer for maintenance
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">{editingVehicle ? 'Update Vehicle' : 'Add Vehicle'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter Bar */}
      <Card>
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
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Fuel Type Filter */}
            <Select value={fuelTypeFilter} onValueChange={setFuelTypeFilter}>
              <SelectTrigger className="w-full lg:w-[180px]">
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
              <SelectTrigger className="w-full lg:w-[180px]">
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
              <Button variant="outline" onClick={clearFilters}>
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

      {/* Vehicles Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
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
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            // Loading Skeleton
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredAndSortedVehicles.length === 0 ? (
            // Empty State
            <div className="text-center py-12 text-muted-foreground">
              <Car className="w-12 h-12 mx-auto mb-3 opacity-50" />
              {hasActiveFilters ? (
                <>
                  <p>No vehicles match your filters</p>
                  <p className="text-sm">Try adjusting your search criteria</p>
                  <Button variant="outline" onClick={clearFilters} className="mt-4">
                    Clear Filters
                  </Button>
                </>
              ) : (
                <>
                  <p>No vehicles added yet</p>
                  <p className="text-sm">Click "Add Vehicle" to get started</p>
                </>
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
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('brand_name')}
                      >
                        Vehicle <SortIcon field="brand_name" />
                      </TableHead>
                      <TableHead>Fuel Type</TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('mileage_km_per_unit')}
                      >
                        Mileage <SortIcon field="mileage_km_per_unit" />
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('maintenance_cost_per_km')}
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
                        <TableCell>
                          <div>
                            <p className="font-medium">{vehicle.brand_name} {vehicle.model_name}</p>
                            <p className="text-sm text-muted-foreground">{vehicle.variant_name}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{vehicle.fuel_type}</Badge>
                        </TableCell>
                        <TableCell>
                          {vehicle.mileage_km_per_unit} km/{vehicle.fuel_type === 'EV' ? 'kWh' : 'L'}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <span className="font-medium">{formatCurrency(vehicle.maintenance_cost_per_km)}</span>
                            <span className="text-muted-foreground">/km</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={vehicle.is_active ? 'default' : 'secondary'}>
                            {vehicle.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenDialog(vehicle)}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Edit Vehicle
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
                        <div className="flex-1">
                          <h3 className="font-semibold">{vehicle.brand_name} {vehicle.model_name}</h3>
                          <p className="text-sm text-muted-foreground">{vehicle.variant_name}</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenDialog(vehicle)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit Vehicle
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
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Previous
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
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
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
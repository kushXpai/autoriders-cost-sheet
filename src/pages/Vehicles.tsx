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
import { getVehicles, setVehicles, generateId } from '@/lib/storage';
import type { Vehicle, FuelType } from '@/types';
import { Plus, Pencil, Trash2, Car } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const FUEL_TYPES: FuelType[] = ['PETROL', 'DIESEL', 'HYBRID', 'EV'];

export default function Vehicles() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [vehicles, setVehiclesState] = useState<Vehicle[]>(getVehicles());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState({
    brand_name: '',
    model_name: '',
    variant_name: '',
    fuel_type: 'PETROL' as FuelType,
    mileage_km_per_unit: '',
  });

  const resetForm = () => {
    setFormData({
      brand_name: '',
      model_name: '',
      variant_name: '',
      fuel_type: 'PETROL',
      mileage_km_per_unit: '',
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
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const vehicleData: Vehicle = {
      id: editingVehicle?.id || generateId(),
      brand_name: formData.brand_name,
      model_name: formData.model_name,
      variant_name: formData.variant_name,
      fuel_type: formData.fuel_type,
      mileage_km_per_unit: parseFloat(formData.mileage_km_per_unit) || 0,
      is_active: editingVehicle?.is_active ?? true,
      created_at: editingVehicle?.created_at || new Date().toISOString(),
    };

    let updatedVehicles: Vehicle[];
    if (editingVehicle) {
      updatedVehicles = vehicles.map(v => v.id === editingVehicle.id ? vehicleData : v);
      toast({ title: 'Vehicle updated successfully' });
    } else {
      updatedVehicles = [...vehicles, vehicleData];
      toast({ title: 'Vehicle added successfully' });
    }

    setVehicles(updatedVehicles);
    setVehiclesState(updatedVehicles);
    setDialogOpen(false);
    resetForm();
  };

  const handleToggleActive = (id: string) => {
    const updatedVehicles = vehicles.map(v =>
      v.id === id ? { ...v, is_active: !v.is_active } : v
    );
    setVehicles(updatedVehicles);
    setVehiclesState(updatedVehicles);
    toast({ title: 'Vehicle status updated' });
  };

  const handleDelete = (id: string) => {
    const updatedVehicles = vehicles.filter(v => v.id !== id);
    setVehicles(updatedVehicles);
    setVehiclesState(updatedVehicles);
    toast({ title: 'Vehicle deleted successfully' });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Vehicle Master</h1>
          <p className="text-muted-foreground mt-1">Manage your vehicle fleet</p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Vehicle
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}</DialogTitle>
                <DialogDescription>
                  {editingVehicle ? 'Update vehicle details' : 'Add a new vehicle to the fleet'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="brand">Brand Name</Label>
                    <Input
                      id="brand"
                      value={formData.brand_name}
                      onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                      placeholder="Toyota"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model">Model Name</Label>
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
                    <Label htmlFor="variant">Variant Name</Label>
                    <Input
                      id="variant"
                      value={formData.variant_name}
                      onChange={(e) => setFormData({ ...formData, variant_name: e.target.value })}
                      placeholder="GX 2.4"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fuel">Fuel Type</Label>
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

                <div className="space-y-2">
                  <Label htmlFor="mileage">Mileage (km per unit)</Label>
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

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingVehicle ? 'Update Vehicle' : 'Add Vehicle'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Vehicles</CardTitle>
          <CardDescription>{vehicles.length} vehicles in master</CardDescription>
        </CardHeader>
        <CardContent>
          {vehicles.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Car className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No vehicles added yet</p>
              {isAdmin && <p className="text-sm">Click "Add Vehicle" to get started</p>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Fuel Type</TableHead>
                    <TableHead>Mileage</TableHead>
                    <TableHead>Status</TableHead>
                    {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map((vehicle) => (
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
                        <Badge variant={vehicle.is_active ? 'default' : 'secondary'}>
                          {vehicle.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(vehicle)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleActive(vehicle.id)}
                            >
                              {vehicle.is_active ? 'Deactivate' : 'Activate'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(vehicle.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
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

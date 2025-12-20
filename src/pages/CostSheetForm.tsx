import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { getVehicles, getCostSheets, setCostSheets, generateId, getActiveInterestRate, getActiveAdminChargePercent, getCurrentFuelRate } from '@/lib/storage';
import { calculateCostSheet, formatCurrency } from '@/lib/calculations';
import type { CostSheet, CostSheetFormData, Vehicle } from '@/types';
import { ArrowLeft, Save, Send, Calculator, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const formSchema = z.object({
  company_name: z.string().min(1, 'Company name is required').max(200),
  vehicle_id: z.string().min(1, 'Please select a vehicle'),
  tenure_years: z.number().min(1, 'Minimum 1 year').max(10, 'Maximum 10 years'),
  vehicle_cost: z.number().min(1, 'Vehicle cost is required'),
  registration_charges: z.number().min(0),
  daily_km: z.number().min(1, 'Daily km is required'),
  daily_hours: z.number().min(1, 'Daily hours is required').max(24),
  drivers_count: z.number().min(0),
  driver_salary_per_driver: z.number().min(0),
  parking_charges: z.number().min(0),
  maintenance_cost: z.number().min(0),
  supervisor_cost: z.number().min(0),
  gps_camera_cost: z.number().min(0),
  permit_cost: z.number().min(0),
});

export default function CostSheetForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const vehicles = getVehicles().filter(v => v.is_active);
  const isEditing = !!id;

  const [formData, setFormData] = useState<CostSheetFormData>({
    company_name: '',
    vehicle_id: '',
    tenure_years: 3,
    vehicle_cost: 0,
    registration_charges: 0,
    daily_km: 100,
    daily_hours: 8,
    drivers_count: 1,
    driver_salary_per_driver: 15000,
    parking_charges: 0,
    maintenance_cost: 0,
    supervisor_cost: 0,
    gps_camera_cost: 0,
    permit_cost: 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load existing cost sheet if editing
  useEffect(() => {
    if (id) {
      const costSheets = getCostSheets();
      const existing = costSheets.find(s => s.id === id);
      if (existing) {
        if (existing.status === 'APPROVED') {
          toast({ title: 'Cannot edit approved cost sheet', variant: 'destructive' });
          navigate('/cost-sheets');
          return;
        }
        setFormData({
          company_name: existing.company_name,
          vehicle_id: existing.vehicle_id,
          tenure_years: existing.tenure_years,
          vehicle_cost: existing.vehicle_cost,
          registration_charges: existing.registration_charges,
          daily_km: existing.daily_km,
          daily_hours: existing.daily_hours,
          drivers_count: existing.drivers_count,
          driver_salary_per_driver: existing.driver_salary_per_driver,
          parking_charges: existing.parking_charges,
          maintenance_cost: existing.maintenance_cost,
          supervisor_cost: existing.supervisor_cost,
          gps_camera_cost: existing.gps_camera_cost,
          permit_cost: existing.permit_cost,
        });
      }
    }
  }, [id, navigate, toast]);

  // Auto-calculated fields
  const calculations = useMemo(() => calculateCostSheet(formData), [formData]);
  
  const selectedVehicle = vehicles.find(v => v.id === formData.vehicle_id);
  const interestRate = getActiveInterestRate();
  const currentFuelRate = selectedVehicle ? getCurrentFuelRate(selectedVehicle.fuel_type) : 0;

  const updateField = (field: keyof CostSheetFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validateForm = (): boolean => {
    try {
      formSchema.parse(formData);
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach(e => {
          if (e.path[0]) newErrors[e.path[0] as string] = e.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const saveCostSheet = (status: 'DRAFT' | 'PENDING_APPROVAL') => {
    if (!validateForm()) {
      toast({ title: 'Please fix the errors', variant: 'destructive' });
      return;
    }

    const now = new Date().toISOString();
    const costSheets = getCostSheets();
    
    const costSheetData: CostSheet = {
      id: id || generateId(),
      company_name: formData.company_name.trim(),
      vehicle_id: formData.vehicle_id,
      tenure_years: formData.tenure_years,
      tenure_months: calculations.tenure_months,
      vehicle_cost: formData.vehicle_cost,
      emi_amount: calculations.emi_amount,
      insurance_amount: calculations.insurance_amount,
      registration_charges: formData.registration_charges,
      subtotal_a: calculations.subtotal_a,
      daily_km: formData.daily_km,
      daily_hours: formData.daily_hours,
      fuel_cost: calculations.fuel_cost,
      drivers_count: formData.drivers_count,
      driver_salary_per_driver: formData.driver_salary_per_driver,
      total_driver_cost: calculations.total_driver_cost,
      parking_charges: formData.parking_charges,
      maintenance_cost: formData.maintenance_cost,
      supervisor_cost: formData.supervisor_cost,
      gps_camera_cost: formData.gps_camera_cost,
      permit_cost: formData.permit_cost,
      subtotal_b: calculations.subtotal_b,
      admin_charge_percent: calculations.admin_charge_percent,
      admin_charge_amount: calculations.admin_charge_amount,
      grand_total: calculations.grand_total,
      status,
      approval_remarks: '',
      submitted_at: status === 'PENDING_APPROVAL' ? now : null,
      approved_at: null,
      approved_by: null,
      pdf_url: null,
      created_by: user?.id || '',
      created_at: isEditing ? (costSheets.find(s => s.id === id)?.created_at || now) : now,
      updated_at: now,
    };

    let updatedSheets: CostSheet[];
    if (isEditing) {
      updatedSheets = costSheets.map(s => s.id === id ? costSheetData : s);
    } else {
      updatedSheets = [...costSheets, costSheetData];
    }

    setCostSheets(updatedSheets);
    toast({ 
      title: status === 'DRAFT' ? 'Cost sheet saved as draft' : 'Cost sheet submitted for approval' 
    });
    navigate('/cost-sheets');
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/cost-sheets')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            {isEditing ? 'Edit Cost Sheet' : 'New Cost Sheet'}
          </h1>
          <p className="text-muted-foreground mt-1">
            Fill in the details and auto-calculated fields will update automatically
          </p>
        </div>
      </div>

      {/* Company & Vehicle Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Basic Information</CardTitle>
          <CardDescription>Company and vehicle details</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="company">Company Name *</Label>
            <Input
              id="company"
              value={formData.company_name}
              onChange={(e) => updateField('company_name', e.target.value)}
              placeholder="Enter company name"
              maxLength={200}
            />
            {errors.company_name && <p className="text-xs text-destructive">{errors.company_name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="vehicle">Vehicle *</Label>
            <Select value={formData.vehicle_id} onValueChange={(v) => updateField('vehicle_id', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select vehicle" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map(v => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.brand_name} {v.model_name} - {v.variant_name} ({v.fuel_type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.vehicle_id && <p className="text-xs text-destructive">{errors.vehicle_id}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tenure">Tenure (Years) *</Label>
            <Input
              id="tenure"
              type="number"
              min="1"
              max="10"
              value={formData.tenure_years}
              onChange={(e) => updateField('tenure_years', parseInt(e.target.value) || 0)}
            />
            <p className="text-xs text-muted-foreground">= {calculations.tenure_months} months</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vehicle_cost">Vehicle Cost (₹) *</Label>
            <Input
              id="vehicle_cost"
              type="number"
              min="0"
              value={formData.vehicle_cost || ''}
              onChange={(e) => updateField('vehicle_cost', parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
        </CardContent>
      </Card>

      {/* Section A - Vehicle Costs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded text-sm">A</span>
            Vehicle Finance & Registration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                EMI Amount (Monthly)
                <Lock className="w-3 h-3 text-muted-foreground" />
              </Label>
              <div className="p-3 bg-muted rounded-lg font-medium">
                {formatCurrency(calculations.emi_amount)}
              </div>
              {!isAdmin && (
                <p className="text-xs text-muted-foreground">
                  Interest Rate: {interestRate}% p.a.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Insurance Amount
                <Lock className="w-3 h-3 text-muted-foreground" />
              </Label>
              <div className="p-3 bg-muted rounded-lg font-medium">
                {formatCurrency(calculations.insurance_amount)}
              </div>
              <p className="text-xs text-muted-foreground">3.5% of vehicle cost</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="registration">Registration Charges (₹)</Label>
              <Input
                id="registration"
                type="number"
                min="0"
                value={formData.registration_charges || ''}
                onChange={(e) => updateField('registration_charges', parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
          </div>

          <Separator />

          <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg">
            <span className="font-medium">Subtotal A</span>
            <span className="text-xl font-bold text-primary">{formatCurrency(calculations.subtotal_a)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Section B - Operational Costs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded text-sm">B</span>
            Operational Costs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Usage & Fuel */}
          <div>
            <h4 className="font-medium mb-3 text-muted-foreground">Usage & Fuel</h4>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="daily_km">Daily KM *</Label>
                <Input
                  id="daily_km"
                  type="number"
                  min="1"
                  value={formData.daily_km || ''}
                  onChange={(e) => updateField('daily_km', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="daily_hours">Daily Hours *</Label>
                <Input
                  id="daily_hours"
                  type="number"
                  min="1"
                  max="24"
                  value={formData.daily_hours || ''}
                  onChange={(e) => updateField('daily_hours', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Monthly Fuel Cost
                  <Lock className="w-3 h-3 text-muted-foreground" />
                </Label>
                <div className="p-3 bg-muted rounded-lg font-medium">
                  {formatCurrency(calculations.fuel_cost)}
                </div>
                {selectedVehicle && (
                  <p className="text-xs text-muted-foreground">
                    {formData.daily_km * 30} km/month @ {formatCurrency(currentFuelRate)}/{selectedVehicle.fuel_type === 'EV' ? 'kWh' : 'L'}
                  </p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Driver Costs */}
          <div>
            <h4 className="font-medium mb-3 text-muted-foreground">Driver Costs</h4>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="drivers">Number of Drivers</Label>
                <Input
                  id="drivers"
                  type="number"
                  min="0"
                  value={formData.drivers_count || ''}
                  onChange={(e) => updateField('drivers_count', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salary">Salary per Driver (₹)</Label>
                <Input
                  id="salary"
                  type="number"
                  min="0"
                  value={formData.driver_salary_per_driver || ''}
                  onChange={(e) => updateField('driver_salary_per_driver', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Total Driver Cost
                  <Calculator className="w-3 h-3 text-muted-foreground" />
                </Label>
                <div className="p-3 bg-muted rounded-lg font-medium">
                  {formatCurrency(calculations.total_driver_cost)}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Other Costs */}
          <div>
            <h4 className="font-medium mb-3 text-muted-foreground">Other Monthly Costs</h4>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="parking">Parking Charges (₹)</Label>
                <Input
                  id="parking"
                  type="number"
                  min="0"
                  value={formData.parking_charges || ''}
                  onChange={(e) => updateField('parking_charges', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maintenance">Maintenance Cost (₹)</Label>
                <Input
                  id="maintenance"
                  type="number"
                  min="0"
                  value={formData.maintenance_cost || ''}
                  onChange={(e) => updateField('maintenance_cost', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supervisor">Supervisor Cost (₹)</Label>
                <Input
                  id="supervisor"
                  type="number"
                  min="0"
                  value={formData.supervisor_cost || ''}
                  onChange={(e) => updateField('supervisor_cost', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gps">GPS & Camera Cost (₹)</Label>
                <Input
                  id="gps"
                  type="number"
                  min="0"
                  value={formData.gps_camera_cost || ''}
                  onChange={(e) => updateField('gps_camera_cost', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="permit">Permit Cost (₹)</Label>
                <Input
                  id="permit"
                  type="number"
                  min="0"
                  value={formData.permit_cost || ''}
                  onChange={(e) => updateField('permit_cost', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg">
            <span className="font-medium">Subtotal B</span>
            <span className="text-xl font-bold text-primary">{formatCurrency(calculations.subtotal_b)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Admin Charges & Grand Total */}
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="text-lg">Summary & Admin Charges</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal A</span>
                <span className="font-medium">{formatCurrency(calculations.subtotal_a)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal B</span>
                <span className="font-medium">{formatCurrency(calculations.subtotal_b)}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-2">
                  Admin Charges ({calculations.admin_charge_percent}%)
                  <Lock className="w-3 h-3" />
                </span>
                <span className="font-medium">{formatCurrency(calculations.admin_charge_amount)}</span>
              </div>
            </div>
            <div className="flex flex-col justify-center items-center p-6 bg-primary rounded-lg text-primary-foreground">
              <span className="text-sm opacity-90">Grand Total (Monthly)</span>
              <span className="text-3xl font-bold">{formatCurrency(calculations.grand_total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end pb-6">
        <Button variant="outline" onClick={() => navigate('/cost-sheets')}>
          Cancel
        </Button>
        <Button variant="secondary" onClick={() => saveCostSheet('DRAFT')}>
          <Save className="w-4 h-4 mr-2" />
          Save as Draft
        </Button>
        <Button onClick={() => saveCostSheet('PENDING_APPROVAL')}>
          <Send className="w-4 h-4 mr-2" />
          Submit for Approval
        </Button>
      </div>
    </div>
  );
}

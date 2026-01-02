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
import { supabase } from '@/supabase/client';
import { calculateCostSheet, formatCurrency } from '@/lib/calculations';
import type { CostSheet, CostSheetFormData, Vehicle, CostSheetStatus } from '@/types';
import { ArrowLeft, Save, Send, Calculator, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';


const formSchema = z.object({
  company_name: z.string().min(1, 'Company name is required').max(200),
  vehicle_id: z.string().min(1, 'Please select a vehicle'),
  tenure_years: z.number().min(1, 'Minimum 1 year').max(10, 'Maximum 10 years'),
  ex_showroom_price: z.number().min(1, 'Ex-showroom price is required'),  // CHANGED from vehicle_cost
  down_payment_percent: z.number().min(0, 'Minimum 0%').max(100, 'Maximum 100%'),
  registration_charges: z.number().min(0),
  monthly_km: z.number().min(1, 'Monthly km is required'),
  daily_hours: z.number().min(1, 'Daily hours is required').max(24),
  drivers_count: z.number().min(0),
  driver_salary_per_driver: z.number().min(0),
  parking_charges: z.number().min(0),
  supervisor_cost: z.number().min(0),
  gps_camera_cost: z.number().min(0),
  permit_cost: z.number().min(0),
});


export default function CostSheetForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const isEditing = !!id;


  const [formData, setFormData] = useState<CostSheetFormData>({
    company_name: '',
    vehicle_id: '',
    tenure_years: 3,
    ex_showroom_price: 0,  // CHANGED from vehicle_cost
    down_payment_percent: 20,
    registration_charges: 0,
    monthly_km: 3000,
    daily_hours: 8,
    drivers_count: 1,
    driver_salary_per_driver: 15000,
    parking_charges: 0,
    maintenance_cost: 0,
    supervisor_cost: 0,
    gps_camera_cost: 0,
    permit_cost: 0,
  });

  // City state
  const [selectedCity, setSelectedCity] = useState('');
  const [cities, setCities] = useState<string[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  // Dynamic rates from Supabase
  const [interestRate, setInterestRate] = useState(12);
  const [adminChargePercent, setAdminChargePercent] = useState(0);
  const [insuranceRate, setInsuranceRate] = useState(3.5);
  const [fuelRate, setFuelRate] = useState(0);


  // Fetch cities on mount
  useEffect(() => {
    fetchCities();
  }, []);

  // Fetch vehicles on mount
  useEffect(() => {
    fetchVehicles();
    fetchDynamicRates();
  }, []);


  // Fetch fuel rate when vehicle or city changes
  useEffect(() => {
    if (formData.vehicle_id && selectedCity) {
      const vehicle = vehicles.find(v => v.id === formData.vehicle_id);
      if (vehicle) {
        fetchFuelRate(vehicle.fuel_type, selectedCity);
      }
    }
  }, [formData.vehicle_id, selectedCity, vehicles]);


  // Load existing cost sheet if editing
  useEffect(() => {
    if (id && user) {
      fetchCostSheet(id);
    }
  }, [id, user]);


  const fetchCities = async () => {
    try {
      const { data, error } = await supabase
        .from('cities')
        .select('name')
        .order('name');

      if (error) throw error;
      const cityList = (data || []).map(c => c.name);
      setCities(cityList);
      if (cityList.length > 0) {
        setSelectedCity(cityList[0]);
      }
    } catch (error: any) {
      console.error('Error fetching cities:', error);
    }
  };

  const fetchVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('is_active', true)
        .order('brand_name')
        .order('model_name');


      if (error) throw error;
      setVehicles(data || []);
    } catch (error: any) {
      console.error('Error fetching vehicles:', error);
      toast({ title: 'Failed to load vehicles', variant: 'destructive' });
    }
  };


  const fetchDynamicRates = async () => {
    try {
      // Fetch interest rate
      const { data: irData } = await supabase
        .from('interest_rates')
        .select('*')
        .eq('is_active', true)
        .order('effective_from', { ascending: false })
        .limit(1)
        .single();

      if (irData) setInterestRate(irData.interest_rate_percent);


      // Fetch admin charge
      const { data: acData } = await supabase
        .from('admin_charges')
        .select('*')
        .eq('is_active', true)
        .order('effective_from', { ascending: false })
        .limit(1)
        .single();

      if (acData) setAdminChargePercent(acData.admin_charge_percent);


      // Fetch insurance rate
      const { data: insData } = await supabase
        .from('insurance_rates')
        .select('*')
        .eq('is_active', true)
        .order('effective_from', { ascending: false })
        .limit(1)
        .single();

      if (insData) setInsuranceRate(insData.insurance_rate_percent);
    } catch (error: any) {
      console.error('Error fetching dynamic rates:', error);
      // Use defaults, don't crash
    }
  };


  const fetchFuelRate = async (fuelType: string, city: string) => {
    try {
      const { data } = await supabase
        .from('fuel_rates')
        .select('*')
        .eq('fuel_type', fuelType)
        .eq('city', city)
        .order('effective_date', { ascending: false })
        .limit(1)
        .single();


      if (data) setFuelRate(data.rate_per_unit);
    } catch (error: any) {
      console.error('Error fetching fuel rate:', error);
      setFuelRate(0);
    }
  };


  const fetchCostSheet = async (costSheetId: string) => {
    try {
      const { data, error } = await supabase
        .from('cost_sheets')
        .select('*')
        .eq('id', costSheetId)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          company_name: data.company_name,
          vehicle_id: data.vehicle_id,
          tenure_years: data.tenure_years,
          ex_showroom_price: data.ex_showroom_price,  // CHANGED from vehicle_cost
          down_payment_percent: (data.down_payment_amount / data.on_road_price) * 100,  // CHANGED from vehicle_cost
          registration_charges: data.registration_charges,
          monthly_km: data.monthly_km,
          daily_hours: data.daily_hours,
          drivers_count: data.drivers_count,
          driver_salary_per_driver: data.driver_salary_per_driver,
          parking_charges: data.parking_charges,
          maintenance_cost: data.maintenance_cost,
          supervisor_cost: data.supervisor_cost,
          gps_camera_cost: data.gps_camera_cost,
          permit_cost: data.permit_cost,
        });
      }
    } catch (error: any) {
      console.error('Error fetching cost sheet:', error);
      toast({ title: 'Failed to load cost sheet', variant: 'destructive' });
    }
  };


  // Synchronous calculation with auto-calculated maintenance
  const calculations = useMemo(() => {
    if (!formData.vehicle_id) {
      return {
        tenure_months: 0,
        insurance_amount: 0,
        on_road_price: 0,
        down_payment_amount: 0,
        loan_amount: 0,
        emi_amount: 0,
        subtotal_a: 0,
        fuel_cost: 0,
        total_driver_cost: 0,
        maintenance_cost: 0,
        subtotal_b: 0,
        admin_charge_percent: 0,
        admin_charge_amount: 0,
        grand_total: 0,
      };
    }

    const tenure_months = formData.tenure_years * 12;

    // Insurance calculated on ex-showroom price (annual, then monthly)
    const insurance_amount_annual = formData.ex_showroom_price * (insuranceRate / 100);
    const insurance_amount = insurance_amount_annual / 12;

    // On-road price = ex-showroom + annual insurance + registration
    const on_road_price =
      formData.ex_showroom_price +
      insurance_amount_annual +
      formData.registration_charges;

    // Down payment and loan based on on-road price
    const down_payment_amount = on_road_price * (formData.down_payment_percent / 100);
    const loan_amount = on_road_price - down_payment_amount;

    // EMI calculation (reducing balance) on loan amount
    const monthlyRate = interestRate / 100 / 12;
    const n = tenure_months;
    const emi_amount =
      monthlyRate <= 0
        ? loan_amount / tenure_months
        : (loan_amount * monthlyRate * Math.pow(1 + monthlyRate, n)) /
        (Math.pow(1 + monthlyRate, n) - 1);

    const subtotal_a = emi_amount;

    // Fuel cost calculation using vehicle mileage and city-based fuel rate
    const selectedVehicle = vehicles.find(v => v.id === formData.vehicle_id);
    const mileage = selectedVehicle?.mileage_km_per_unit ?? 25;
    const fuel_cost = (formData.monthly_km / mileage) * fuelRate;

    // AUTO-CALCULATED MAINTENANCE COST based on vehicle's maintenance_cost_per_km
    const maintenance_cost_per_km = selectedVehicle?.maintenance_cost_per_km ?? 0;
    const maintenance_cost = formData.monthly_km * maintenance_cost_per_km;

    // Driver cost
    const total_driver_cost = formData.drivers_count * formData.driver_salary_per_driver;

    // Subtotal B
    const subtotal_b =
      fuel_cost +
      total_driver_cost +
      maintenance_cost +
      formData.parking_charges +
      formData.supervisor_cost +
      formData.gps_camera_cost +
      formData.permit_cost;

    // Admin charge
    const admin_charge_amount = (subtotal_a + subtotal_b) * (adminChargePercent / 100);

    // Grand total
    const grand_total = subtotal_a + subtotal_b + admin_charge_amount;

    return {
      tenure_months,
      insurance_amount,
      on_road_price,
      down_payment_amount,
      loan_amount,
      emi_amount,
      subtotal_a,
      fuel_cost,
      total_driver_cost,
      maintenance_cost,
      subtotal_b,
      admin_charge_percent: adminChargePercent,
      admin_charge_amount,
      grand_total,
    };
  }, [formData, vehicles, interestRate, adminChargePercent, insuranceRate, fuelRate]);


  const selectedVehicle = vehicles.find(v => v.id === formData.vehicle_id);


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

  const saveCostSheet = async (status: CostSheetStatus) => {
    if (!validateForm() || !user) {
      toast({ title: 'Please fix the errors', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const now = new Date().toISOString();
      const finalStatus = isEditing ? 'DRAFT' : status;

      const costSheetData: Omit<CostSheet, 'id' | 'created_at' | 'updated_at'> = {
        company_name: formData.company_name.trim(),
        vehicle_id: formData.vehicle_id,
        tenure_years: formData.tenure_years,
        tenure_months: calculations.tenure_months,
        ex_showroom_price: formData.ex_showroom_price,
        insurance_amount: calculations.insurance_amount,
        registration_charges: formData.registration_charges,
        on_road_price: calculations.on_road_price,
        down_payment_percent: formData.down_payment_percent,
        down_payment_amount: calculations.down_payment_amount,
        loan_amount: calculations.loan_amount,
        emi_amount: calculations.emi_amount,
        subtotal_a: calculations.subtotal_a,
        monthly_km: formData.monthly_km,
        daily_hours: formData.daily_hours,
        fuel_cost: calculations.fuel_cost,
        drivers_count: formData.drivers_count,
        driver_salary_per_driver: formData.driver_salary_per_driver,
        total_driver_cost: calculations.total_driver_cost,
        parking_charges: formData.parking_charges,
        maintenance_cost: calculations.maintenance_cost,
        supervisor_cost: formData.supervisor_cost,
        gps_camera_cost: formData.gps_camera_cost,
        permit_cost: formData.permit_cost,
        subtotal_b: calculations.subtotal_b,
        admin_charge_percent: calculations.admin_charge_percent,
        admin_charge_amount: calculations.admin_charge_amount,
        grand_total: calculations.grand_total,
        status: finalStatus,
        approval_remarks: '',
        submitted_at: finalStatus === 'PENDING_APPROVAL' ? now : null,
        approved_at: null,
        approved_by: null,
        pdf_url: null,
        created_by: user.id,
      };

      let result;
      if (isEditing) {
        result = await supabase
          .from('cost_sheets')
          .update({ ...costSheetData, updated_at: now })
          .eq('id', id!)
          .select()
          .single();
      } else {
        result = await supabase
          .from('cost_sheets')
          .insert(costSheetData)
          .select()
          .single();
      }

      if (result.error) {
        throw result.error;
      }

      // Send email notification if submitted for approval
      if (finalStatus === 'PENDING_APPROVAL' && result.data) {
        try {
          const { sendCostSheetSubmissionEmail } = await import('@/services/emailService');
          const vehicle = vehicles.find(v => v.id === formData.vehicle_id);
          const vehicleInfo = vehicle ? `${vehicle.brand_name} ${vehicle.model_name}` : 'N/A';

          const { data: userData } = await supabase
            .from('users')
            .select('full_name, email')
            .eq('id', user.id)
            .single();

          await sendCostSheetSubmissionEmail({
            costSheetId: result.data.id,
            companyName: formData.company_name,
            creatorName: userData?.full_name || user.email || 'Unknown',
            creatorEmail: user.email || '',
            vehicleInfo,
            grandTotal: calculations.grand_total,
            status: finalStatus,
          });

          toast({
            title: isEditing
              ? 'Cost sheet updated'
              : status === 'DRAFT'
                ? 'Cost sheet saved as draft'
                : 'Cost sheet submitted for approval',
            description: 'Email notification sent via Resend'
          });
        } catch (emailError) {
          console.error('Failed to send email notification:', emailError);
          toast({
            title: isEditing
              ? 'Cost sheet updated'
              : status === 'DRAFT'
                ? 'Cost sheet saved as draft'
                : 'Cost sheet submitted for approval',
            description: 'Note: Email notification failed to send'
          });
        }
      } else {
        toast({
          title: isEditing
            ? 'Cost sheet updated and set to draft. Submit for approval when ready.'
            : status === 'DRAFT'
              ? 'Cost sheet saved as draft'
              : 'Cost sheet submitted for approval'
        });
      }

      navigate('/cost-sheets');
    } catch (error: any) {
      console.error('Error saving cost sheet:', error);
      toast({
        title: 'Failed to save cost sheet',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
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


      {/* Company, City & Vehicle Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Basic Information</CardTitle>
          <CardDescription>Company, location, and vehicle details</CardDescription>
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
            <Label htmlFor="city">City *</Label>
            <Select value={selectedCity} onValueChange={setSelectedCity}>
              <SelectTrigger>
                <SelectValue placeholder="Select city" />
              </SelectTrigger>
              <SelectContent>
                {cities.map(city => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Label htmlFor="ex_showroom_price">Ex-Showroom Price (₹) *</Label>
            <Input
              id="ex_showroom_price"
              type="number"
              min="0"
              value={formData.ex_showroom_price || ''}
              onChange={(e) => updateField('ex_showroom_price', parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
            {errors.ex_showroom_price && <p className="text-xs text-destructive">{errors.ex_showroom_price}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Insurance & On-Road Price Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Insurance & On-Road Price</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Annual Insurance
              <Lock className="w-3 h-3 text-muted-foreground" />
            </Label>
            <div className="p-3 bg-muted rounded-lg font-medium">
              {formatCurrency(calculations.insurance_amount * 12)}
            </div>
            <p className="text-xs text-muted-foreground">
              {insuranceRate}% of ex-showroom price
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="registration">Registration Charges (₹) *</Label>
            <Input
              id="registration"
              type="number"
              min="0"
              value={formData.registration_charges || ''}
              onChange={(e) => updateField('registration_charges', parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              On-Road Price
              <Lock className="w-3 h-3 text-muted-foreground" />
            </Label>
            <div className="p-3 bg-primary/10 rounded-lg font-medium text-primary">
              {formatCurrency(calculations.on_road_price)}
            </div>
            <p className="text-xs text-muted-foreground">
              Ex-showroom + Insurance + Registration
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Financing Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Financing Details</CardTitle>
          <CardDescription>Based on on-road price</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="down_payment">Down Payment (%)</Label>
            <Input
              id="down_payment"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={formData.down_payment_percent || ''}
              onChange={(e) => updateField('down_payment_percent', parseFloat(e.target.value) || 0)}
              placeholder="20"
            />
            {errors.down_payment_percent && <p className="text-xs text-destructive">{errors.down_payment_percent}</p>}
            <p className="text-xs text-muted-foreground">
              On {formatCurrency(calculations.on_road_price)}
            </p>
          </div>
          <div className="space-y-2">
            <Label>Down Payment Amount</Label>
            <div className="p-3 bg-muted rounded-lg font-medium">
              {formatCurrency(calculations.down_payment_amount)}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Loan Amount</Label>
            <div className="p-3 bg-muted rounded-lg font-medium">
              {formatCurrency(calculations.loan_amount)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section A - Vehicle Costs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded text-sm">A</span>
            Vehicle Finance Costs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              EMI Amount
              <Lock className="w-3 h-3 text-muted-foreground" />
            </Label>
            <div className="p-3 bg-muted rounded-lg font-medium text-lg">
              {formatCurrency(calculations.emi_amount)}
            </div>
            <p className="text-xs text-muted-foreground">
              Interest Rate: {interestRate}% p.a. | Loan: {formatCurrency(calculations.loan_amount)} | Tenure: {calculations.tenure_months} months
            </p>
            <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted/50 rounded">
              <strong>Loan breakdown:</strong> On-road price {formatCurrency(calculations.on_road_price)}
              (Ex-showroom {formatCurrency(formData.ex_showroom_price)} + Insurance {formatCurrency(calculations.insurance_amount * 12)} + Registration {formatCurrency(formData.registration_charges)})
              - Down payment {formatCurrency(calculations.down_payment_amount)}
            </div>
          </div>

          <Separator />

          <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg">
            <span className="font-medium">Subtotal A (Monthly EMI)</span>
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
                <Label htmlFor="monthly_km">Monthly KM *</Label>
                <Input
                  id="monthly_km"
                  type="number"
                  min="1"
                  value={formData.monthly_km || ''}
                  onChange={(e) => updateField('monthly_km', parseFloat(e.target.value) || 0)}
                />
                {errors.monthly_km && <p className="text-xs text-destructive">{errors.monthly_km}</p>}
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
                {selectedVehicle && selectedCity && (
                  <p className="text-xs text-muted-foreground">
                    {formData.monthly_km.toFixed(0)} km ÷ {selectedVehicle.mileage_km_per_unit} km/{selectedVehicle.fuel_type === 'EV' ? 'kWh' : 'L'} @ {formatCurrency(fuelRate)}/{selectedVehicle.fuel_type === 'EV' ? 'kWh' : 'L'} in {selectedCity}
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


          {/* Maintenance Cost - AUTO CALCULATED */}
          <div>
            <h4 className="font-medium mb-3 text-muted-foreground">Maintenance</h4>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Monthly Maintenance Cost
                  <Lock className="w-3 h-3 text-muted-foreground" />
                </Label>
                <div className="p-3 bg-muted rounded-lg font-medium">
                  {formatCurrency(calculations.maintenance_cost)}
                </div>
                {selectedVehicle && (
                  <p className="text-xs text-muted-foreground">
                    {formData.monthly_km.toFixed(0)} km × {formatCurrency(selectedVehicle.maintenance_cost_per_km)}/km
                  </p>
                )}
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
                <Label htmlFor="gps">GPS & Accessories Cost (₹)</Label>
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


          <div className="flex justify-between items-center p-3 bg-secondary/20 rounded-lg">
            <span className="font-medium">Subtotal B</span>
            <span className="text-xl font-bold text-secondary-foreground">{formatCurrency(calculations.subtotal_b)}</span>
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
                  Admin Charges ({calculations.admin_charge_percent.toFixed(1)}%)
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
      <div className="flex flex-col gap-3 pb-6">
        {isEditing && (
          <p className="text-sm text-muted-foreground text-center">
            Editing will reset the cost sheet to Draft status. Submit for approval after saving.
          </p>
        )}
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => navigate('/cost-sheets')} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={() => saveCostSheet('DRAFT')}
            disabled={loading || !user}
          >
            <Save className="w-4 h-4 mr-2" />
            {isEditing ? 'Save Changes (Draft)' : 'Save as Draft'}
          </Button>
          {!isEditing && (
            <Button
              onClick={() => saveCostSheet('PENDING_APPROVAL')}
              disabled={loading || !user}
            >
              <Send className="w-4 h-4 mr-2" />
              Submit for Approval
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
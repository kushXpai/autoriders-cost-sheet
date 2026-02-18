// src/pages/CostSheetForm.tsx
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useParams, useBlocker } from 'react-router-dom';
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
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/supabase/client';
import { calculateCostSheet, formatCurrency } from '@/lib/calculations';
import type { CostSheet, CostSheetFormData, Vehicle, CostSheetStatus } from '@/types';
import { ArrowLeft, Save, Send, Calculator, Lock, Cloud, HardDrive, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const formSchema = z.object({
  company_name: z.string().min(1, 'Company name is required').max(200),
  vehicle_id: z.string().min(1, 'Please select a vehicle'),
  city: z.string().min(1, 'Please select a city'),
  tenure_years: z.number().min(1, 'Minimum 1 year').max(10, 'Maximum 10 years'),
  ex_showroom_price: z.number().min(1, 'Ex-showroom price is required'),
  discount: z.number().min(0, 'Discount cannot be negative'),
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
    city: '',
    tenure_years: 3,
    ex_showroom_price: 0,
    discount: 0,
    down_payment_percent: 0,
    registration_charges: 0,
    monthly_km: 3000,
    daily_hours: 8,
    mileage_per_liter: 0,
    maintenance_cost_per_km: 0,
    drivers_count: 1,
    driver_salary_per_driver: 15000,
    parking_charges: 0,
    maintenance_cost: 0,
    supervisor_cost: 0,
    gps_camera_cost: 0,
    permit_cost: 0,
  });

  const [cities, setCities] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [interestRate, setInterestRate] = useState(12);
  const [adminChargePercent, setAdminChargePercent] = useState(0);
  const [insuranceRate, setInsuranceRate] = useState(3.5);
  const [fuelRate, setFuelRate] = useState(0);
  const [originalCreatedBy, setOriginalCreatedBy] = useState<string | null>(null);
  const [originalStatus, setOriginalStatus] = useState<CostSheetStatus | null>(null);

  // Auto-save state
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [autoSavedDraftId, setAutoSavedDraftId] = useState<string | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadRef = useRef(true);
  const formDataRef = useRef(formData);
  const autoSavedDraftIdRef = useRef<string | null>(null);

  // Update ref whenever formData changes
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  useEffect(() => {
    autoSavedDraftIdRef.current = autoSavedDraftId;
  }, [autoSavedDraftId]);

  // Block navigation if unsaved changes
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasUnsavedChanges &&
      currentLocation.pathname !== nextLocation.pathname
  );

  // Auto-populate mileage and maintenance when vehicle is selected
  useEffect(() => {
    if (formData.vehicle_id && vehicles.length > 0 && !isEditing) {
      const vehicle = vehicles.find(v => v.id === formData.vehicle_id);
      if (vehicle) {
        // Only auto-populate if fields are empty (0)
        setFormData(prev => ({
          ...prev,
          mileage_per_liter: prev.mileage_per_liter || vehicle.mileage_km_per_unit,
          maintenance_cost_per_km: prev.maintenance_cost_per_km || vehicle.maintenance_cost_per_km,
        }));
      }
    }
  }, [formData.vehicle_id, vehicles, isEditing]);

  // Save to database as DRAFT
  const saveToDatabase = useCallback(async () => {
    if (!user || !formDataRef.current.company_name || !formDataRef.current.vehicle_id) {
      return; // Don't save empty or incomplete forms
    }

    setAutoSaveStatus('saving');

    try {
      const calculations = calculateWithCurrentData();

      // Validate calculations - replace NaN with 0
      const safeCalculations = {
        tenure_months: isNaN(calculations.tenure_months) ? 0 : calculations.tenure_months,
        discounted_price: isNaN(calculations.discounted_price) ? 0 : calculations.discounted_price,
        insurance_amount_monthly: isNaN(calculations.insurance_amount_monthly) ? 0 : calculations.insurance_amount_monthly,
        registration_monthly: isNaN(calculations.registration_monthly) ? 0 : calculations.registration_monthly,
        on_road_price: isNaN(calculations.on_road_price) ? 0 : calculations.on_road_price,
        down_payment_amount: isNaN(calculations.down_payment_amount) ? 0 : calculations.down_payment_amount,
        loan_amount: isNaN(calculations.loan_amount) ? 0 : calculations.loan_amount,
        emi_amount: isNaN(calculations.emi_amount) ? 0 : calculations.emi_amount,
        subtotal_a: isNaN(calculations.subtotal_a) ? 0 : calculations.subtotal_a,
        fuel_cost: isNaN(calculations.fuel_cost) ? 0 : calculations.fuel_cost,
        total_driver_cost: isNaN(calculations.total_driver_cost) ? 0 : calculations.total_driver_cost,
        maintenance_cost: isNaN(calculations.maintenance_cost) ? 0 : calculations.maintenance_cost,
        subtotal_b: isNaN(calculations.subtotal_b) ? 0 : calculations.subtotal_b,
        admin_charge_percent: isNaN(calculations.admin_charge_percent) ? 0 : calculations.admin_charge_percent,
        admin_charge_amount: isNaN(calculations.admin_charge_amount) ? 0 : calculations.admin_charge_amount,
        grand_total: isNaN(calculations.grand_total) ? 0 : calculations.grand_total,
      };

      const now = new Date().toISOString();

      const autoSaveStatus: CostSheetStatus = 
        isEditing && originalStatus ? originalStatus : 
        isAdmin ? 'APPROVED' : 
        'DRAFT';

      const selectedVehicle = vehicles.find(v => v.id === formDataRef.current.vehicle_id);

      const costSheetData: Omit<CostSheet, 'id' | 'created_at' | 'updated_at'> = {
        company_name: formDataRef.current.company_name.trim(),
        vehicle_id: formDataRef.current.vehicle_id,
        city: formDataRef.current.city,
        tenure_years: formDataRef.current.tenure_years,
        tenure_months: safeCalculations.tenure_months,
        ex_showroom_price: formDataRef.current.ex_showroom_price || 0,
        discount: formDataRef.current.discount || 0,
        discounted_price: safeCalculations.discounted_price,
        insurance_amount_monthly: safeCalculations.insurance_amount_monthly,
        registration_monthly: safeCalculations.registration_monthly,
        registration_charges: formDataRef.current.registration_charges || 0,
        on_road_price: safeCalculations.on_road_price,
        down_payment_percent: isNaN(formDataRef.current.down_payment_percent) ? 0 : formDataRef.current.down_payment_percent,
        down_payment_amount: safeCalculations.down_payment_amount,
        loan_amount: safeCalculations.loan_amount,
        emi_amount: safeCalculations.emi_amount,
        subtotal_a: safeCalculations.subtotal_a,
        monthly_km: formDataRef.current.monthly_km || 0,
        daily_hours: formDataRef.current.daily_hours || 0,
        mileage_per_liter: formDataRef.current.mileage_per_liter || selectedVehicle?.mileage_km_per_unit || 0,
        maintenance_cost_per_km: formDataRef.current.maintenance_cost_per_km || selectedVehicle?.maintenance_cost_per_km || 0,
        fuel_cost: safeCalculations.fuel_cost,
        drivers_count: formDataRef.current.drivers_count || 0,
        driver_salary_per_driver: formDataRef.current.driver_salary_per_driver || 0,
        total_driver_cost: safeCalculations.total_driver_cost,
        parking_charges: formDataRef.current.parking_charges || 0,
        maintenance_cost: safeCalculations.maintenance_cost,
        supervisor_cost: formDataRef.current.supervisor_cost || 0,
        gps_camera_cost: formDataRef.current.gps_camera_cost || 0,
        permit_cost: formDataRef.current.permit_cost || 0,
        subtotal_b: safeCalculations.subtotal_b,
        admin_charge_percent: safeCalculations.admin_charge_percent,
        admin_charge_amount: safeCalculations.admin_charge_amount,
        grand_total: safeCalculations.grand_total,
        status: autoSaveStatus,
        approval_remarks: (autoSaveStatus === 'APPROVED' && isAdmin && !isEditing) ? 'Auto-approved (Superadmin)' : '',
        submitted_at: (autoSaveStatus === 'PENDING_APPROVAL' || autoSaveStatus === 'APPROVED') && !isEditing ? now : null,
        approved_at: autoSaveStatus === 'APPROVED' && !isEditing ? now : null,
        approved_by: autoSaveStatus === 'APPROVED' && !isEditing ? user.id : null,
        pdf_url: null,
        created_by: (isEditing && originalCreatedBy) ? originalCreatedBy : user.id,
      };

      let result;
      const currentDraftId = autoSavedDraftIdRef.current;

      if (isEditing && id) {
        // If editing an existing cost sheet, update it
        result = await supabase
          .from('cost_sheets')
          .update({ ...costSheetData, updated_at: now })
          .eq('id', id)
          .select()
          .single();
      } else if (currentDraftId) {
        // If we have an auto-saved draft ID, update that draft
        result = await supabase
          .from('cost_sheets')
          .update({ ...costSheetData, updated_at: now })
          .eq('id', currentDraftId)
          .select()
          .single();
      } else {
        // Create new draft and store its ID
        result = await supabase
          .from('cost_sheets')
          .insert(costSheetData)
          .select()
          .single();

        if (result.data?.id) {
          setAutoSavedDraftId(result.data.id);
          autoSavedDraftIdRef.current = result.data.id;
        }
      }

      if (result.error) throw result.error;

      setAutoSaveStatus('saved');
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      console.log('Auto-saved to database:', result.data?.id);

      setTimeout(() => setAutoSaveStatus('idle'), 2000);
    } catch (error: any) {
      console.error('Auto-save to database failed:', error);
      setAutoSaveStatus('error');
      setTimeout(() => setAutoSaveStatus('idle'), 3000);
    }
  }, [user, isEditing, id, vehicles, interestRate, adminChargePercent, insuranceRate, fuelRate, isAdmin, originalStatus]);

  // Helper to calculate with current data
  const calculateWithCurrentData = () => {
    const tenure_months = formDataRef.current.tenure_years * 12;
    const ex_showroom = formDataRef.current.ex_showroom_price || 0;
    const discount = formDataRef.current.discount || 0;
    const discounted_price = ex_showroom - discount;
    
    // Insurance calculated on original ex-showroom price
    const insurance_amount_annual = ex_showroom * (insuranceRate / 100);
    const insurance_amount_monthly = insurance_amount_annual / 12;
    const registration = formDataRef.current.registration_charges || 0;
    const registration_monthly = registration / 12;
    const on_road_price = discounted_price + insurance_amount_annual + registration;

    // Ensure down_payment_percent is a valid number
    const down_payment_percent = isNaN(formDataRef.current.down_payment_percent) ? 0 : formDataRef.current.down_payment_percent;
    const down_payment_amount = discounted_price * (down_payment_percent / 100);
    const loan_amount = discounted_price - down_payment_amount;

    const monthlyRate = interestRate / 100 / 12;
    const n = tenure_months;
    const emi_amount = loan_amount <= 0 ? 0 : (monthlyRate <= 0 ? loan_amount / tenure_months : (loan_amount * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1));
    const subtotal_a = emi_amount + insurance_amount_monthly + registration_monthly;

    const selectedVehicle = vehicles.find(v => v.id === formDataRef.current.vehicle_id);
    const mileage = formDataRef.current.mileage_per_liter || selectedVehicle?.mileage_km_per_unit || 25;
    const monthly_km = formDataRef.current.monthly_km || 0;
    const fuel_cost = mileage > 0 ? (monthly_km / mileage) * fuelRate : 0;
    const maintenance_cost_per_km = formDataRef.current.maintenance_cost_per_km || selectedVehicle?.maintenance_cost_per_km || 0;
    const maintenance_cost = monthly_km * maintenance_cost_per_km;
    const total_driver_cost = (formDataRef.current.drivers_count || 0) * (formDataRef.current.driver_salary_per_driver || 0);
    const subtotal_b = fuel_cost + total_driver_cost + maintenance_cost + (formDataRef.current.parking_charges || 0) + (formDataRef.current.supervisor_cost || 0) + (formDataRef.current.gps_camera_cost || 0) + (formDataRef.current.permit_cost || 0);
    const admin_charge_amount = (subtotal_a + subtotal_b) * (adminChargePercent / 100);
    const grand_total = subtotal_a + subtotal_b + admin_charge_amount;

    return {
      tenure_months,
      discounted_price,
      insurance_amount_monthly,
      registration_monthly,
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
  };

  // Debounced auto-save to database only (every 2 seconds of inactivity)
  useEffect(() => {
    if (initialLoadRef.current) return;

    setHasUnsavedChanges(true);

    // Clear existing timer
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    // Save to database after 2 seconds of inactivity
    autoSaveTimerRef.current = setTimeout(() => {
      saveToDatabase();
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [formData, saveToDatabase]);

  useEffect(() => {
    fetchCities();
  }, []);

  useEffect(() => {
    fetchVehicles();
    fetchDynamicRates();
  }, []);

  useEffect(() => {
    if (formData.vehicle_id && formData.city && vehicles.length > 0) {
      const vehicle = vehicles.find(v => v.id === formData.vehicle_id);
      if (vehicle) {
        fetchFuelRate(vehicle.fuel_type, formData.city);
      }
    }
  }, [formData.vehicle_id, formData.city, vehicles]);

  useEffect(() => {
    if (id && user) {
      fetchCostSheet(id);
    } else {
      initialLoadRef.current = false;
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
      // Only set default city if formData.city is empty
      if (cityList.length > 0 && !formData.city) {
        setFormData(prev => ({ ...prev, city: cityList[0] }));
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
      const { data: irData } = await supabase
        .from('interest_rates')
        .select('*')
        .eq('is_active', true)
        .order('effective_from', { ascending: false })
        .limit(1)
        .single();

      if (irData) setInterestRate(irData.interest_rate_percent);

      const { data: acData } = await supabase
        .from('admin_charges')
        .select('*')
        .eq('is_active', true)
        .order('effective_from', { ascending: false })
        .limit(1)
        .single();

      if (acData) setAdminChargePercent(acData.admin_charge_percent);

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
        setOriginalCreatedBy(data.created_by);
        setOriginalStatus(data.status);

        const downPaymentPercent = isNaN(data.down_payment_percent) ? 0 : (data.down_payment_percent || 0);

        setFormData({
          company_name: data.company_name || '',
          vehicle_id: data.vehicle_id || '',
          city: data.city || '',
          tenure_years: data.tenure_years || 3,
          ex_showroom_price: data.ex_showroom_price || 0,
          discount: data.discount || 0,
          down_payment_percent: downPaymentPercent,
          registration_charges: data.registration_charges || 0,
          monthly_km: data.monthly_km || 3000,
          daily_hours: data.daily_hours || 8,
          mileage_per_liter: data.mileage_per_liter || 0,
          maintenance_cost_per_km: data.maintenance_cost_per_km || 0,
          drivers_count: data.drivers_count || 1,
          driver_salary_per_driver: data.driver_salary_per_driver || 15000,
          parking_charges: data.parking_charges || 0,
          maintenance_cost: data.maintenance_cost || 0,
          supervisor_cost: data.supervisor_cost || 0,
          gps_camera_cost: data.gps_camera_cost || 0,
          permit_cost: data.permit_cost || 0,
        });
        initialLoadRef.current = false;
      }
    } catch (error: any) {
      console.error('Error fetching cost sheet:', error);
      toast({ title: 'Failed to load cost sheet', variant: 'destructive' });
    }
  };

  const calculations = useMemo(() => {
    if (!formData.vehicle_id) {
      return {
        tenure_months: 0, discounted_price: 0, insurance_amount_monthly: 0, registration_monthly: 0, on_road_price: 0, down_payment_amount: 0,
        loan_amount: 0, emi_amount: 0, subtotal_a: 0, fuel_cost: 0, total_driver_cost: 0,
        maintenance_cost: 0, subtotal_b: 0, admin_charge_percent: 0, admin_charge_amount: 0,
        grand_total: 0,
      };
    }

    const tenure_months = formData.tenure_years * 12;
    const ex_showroom = formData.ex_showroom_price || 0;
    const discount = formData.discount || 0;
    const discounted_price = ex_showroom - discount;
    
    // Insurance calculated on original ex-showroom price
    const insurance_amount_annual = ex_showroom * (insuranceRate / 100);
    const insurance_amount_monthly = insurance_amount_annual / 12;
    const registration = formData.registration_charges || 0;
    const registration_monthly = registration / 12;
    const on_road_price = discounted_price + insurance_amount_annual + registration;

    // Ensure down_payment_percent is a valid number
    const down_payment_percent = isNaN(formData.down_payment_percent) ? 0 : formData.down_payment_percent;
    const down_payment_amount = discounted_price * (down_payment_percent / 100);
    const loan_amount = discounted_price - down_payment_amount;

    const monthlyRate = interestRate / 100 / 12;
    const n = tenure_months;
    const emi_amount = loan_amount <= 0 ? 0 : (monthlyRate <= 0 ? loan_amount / tenure_months : (loan_amount * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1));
    const subtotal_a = emi_amount + insurance_amount_monthly + registration_monthly;

    const selectedVehicle = vehicles.find(v => v.id === formData.vehicle_id);
    const mileage = formData.mileage_per_liter || selectedVehicle?.mileage_km_per_unit || 25;
    const monthly_km = formData.monthly_km || 0;
    const fuel_cost = mileage > 0 ? (monthly_km / mileage) * fuelRate : 0;
    const maintenance_cost_per_km = formData.maintenance_cost_per_km || selectedVehicle?.maintenance_cost_per_km || 0;
    const maintenance_cost = monthly_km * maintenance_cost_per_km;
    const total_driver_cost = (formData.drivers_count || 0) * (formData.driver_salary_per_driver || 0);
    const subtotal_b = fuel_cost + total_driver_cost + maintenance_cost + (formData.parking_charges || 0) + (formData.supervisor_cost || 0) + (formData.gps_camera_cost || 0) + (formData.permit_cost || 0);
    const admin_charge_amount = (subtotal_a + subtotal_b) * (adminChargePercent / 100);
    const grand_total = subtotal_a + subtotal_b + admin_charge_amount;

    return {
      tenure_months,
      discounted_price,
      insurance_amount_monthly,
      registration_monthly,
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

      // Superadmin's own sheets are always APPROVED
      const finalStatus: CostSheetStatus = isAdmin ? 'APPROVED' : status;

      const costSheetData: Omit<CostSheet, 'id' | 'created_at' | 'updated_at'> = {
        company_name: formData.company_name.trim(),
        vehicle_id: formData.vehicle_id,
        city: formData.city,
        tenure_years: formData.tenure_years,
        tenure_months: calculations.tenure_months,
        ex_showroom_price: formData.ex_showroom_price,
        discount: formData.discount,
        discounted_price: formData.ex_showroom_price - formData.discount,
        insurance_amount_monthly: calculations.insurance_amount_monthly,
        registration_monthly: calculations.registration_monthly,
        registration_charges: formData.registration_charges,
        on_road_price: calculations.on_road_price,
        down_payment_percent: formData.down_payment_percent,
        down_payment_amount: calculations.down_payment_amount,
        loan_amount: calculations.loan_amount,
        emi_amount: calculations.emi_amount,
        subtotal_a: calculations.subtotal_a,
        monthly_km: formData.monthly_km,
        daily_hours: formData.daily_hours,
        mileage_per_liter: formData.mileage_per_liter || selectedVehicle?.mileage_km_per_unit || 0,
        maintenance_cost_per_km: formData.maintenance_cost_per_km || selectedVehicle?.maintenance_cost_per_km || 0,
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
        approval_remarks: isAdmin ? 'Auto-approved (Superadmin)' : '',
        submitted_at: finalStatus === 'PENDING_APPROVAL' || finalStatus === 'APPROVED' ? now : null,
        approved_at: finalStatus === 'APPROVED' ? now : null,
        approved_by: finalStatus === 'APPROVED' ? user.id : null,
        pdf_url: null,
        created_by: (isEditing && originalCreatedBy) ? originalCreatedBy : user.id,
      };

      let result;
      const currentDraftId = autoSavedDraftIdRef.current;

      if (isEditing && id) {
        // If editing an existing cost sheet, update it
        result = await supabase
          .from('cost_sheets')
          .update({ ...costSheetData, updated_at: now })
          .eq('id', id)
          .select()
          .single();
      } else if (currentDraftId) {
        // If we have an auto-saved draft ID, update that draft
        result = await supabase
          .from('cost_sheets')
          .update({ ...costSheetData, updated_at: now })
          .eq('id', currentDraftId)
          .select()
          .single();

        setAutoSavedDraftId(null);
        autoSavedDraftIdRef.current = null;
      } else {
        // Create new cost sheet
        result = await supabase
          .from('cost_sheets')
          .insert(costSheetData)
          .select()
          .single();
      }

      if (result.error) {
        throw result.error;
      }

      // Clear auto-save state
      setHasUnsavedChanges(false);
      setAutoSavedDraftId(null);
      autoSavedDraftIdRef.current = null;

      // Send email notification only for regular users submitting for approval
      if (!isAdmin && finalStatus === 'PENDING_APPROVAL' && result.data) {
        try {
          const { sendCostSheetSubmittedEmail } = await import('../services/email');

          const emailResult = await sendCostSheetSubmittedEmail(result.data.id);

          if (emailResult.success) {
            toast({
              title: 'Cost sheet submitted for approval',
              description: 'Email notifications sent to admins'
            });
          } else {
            toast({
              title: 'Cost sheet submitted for approval',
              description: 'Note: Email notification failed to send'
            });
          }
        } catch (emailError) {
          console.error('Failed to send email notification:', emailError);
          toast({
            title: 'Cost sheet submitted for approval',
            description: 'Note: Email notification failed to send'
          });
        }
      }
      // Send email when superadmin edits (auto-approves)
      else if (isAdmin && isEditing && finalStatus === 'APPROVED' && result.data) {
        try {
          const { sendCostSheetApprovedEmail } = await import('../services/email');

          const emailResult = await sendCostSheetApprovedEmail(result.data.id, 'SUPER_ADMIN');

          if (emailResult.success) {
            toast({
              title: 'Cost sheet updated and approved',
              description: 'Email notification sent to creator'
            });
          } else {
            toast({
              title: 'Cost sheet updated and approved',
              description: 'Note: Email notification failed to send'
            });
          }
        } catch (emailError) {
          console.error('Failed to send email notification:', emailError);
          toast({
            title: 'Cost sheet updated and approved',
            description: 'Note: Email notification failed to send'
          });
        }
      } else {
        // Toast for superadmin create or drafts
        const getMessage = () => {
          if (isAdmin) {
            return isEditing
              ? 'Cost sheet updated and approved'
              : 'Cost sheet created and approved';
          }
          return status === 'DRAFT'
            ? 'Cost sheet saved as draft'
            : 'Cost sheet submitted for approval';
        };

        toast({
          title: getMessage()
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

  // Auto-save status indicator
  const AutoSaveIndicator = () => {
    if (autoSaveStatus === 'idle' && !lastSaved) return null;

    const statusConfig = {
      saving: { icon: Cloud, text: 'Saving...', color: 'text-blue-500' },
      saved: { icon: CheckCircle2, text: 'Saved', color: 'text-green-500' },
      error: { icon: Cloud, text: 'Save failed', color: 'text-red-500' },
      idle: { icon: HardDrive, text: lastSaved ? `Saved ${getTimeSince(lastSaved)}` : '', color: 'text-muted-foreground' },
    };

    const config = statusConfig[autoSaveStatus];
    const Icon = config.icon;

    return (
      <Badge variant="outline" className="gap-1.5">
        <Icon className={`w-3 h-3 ${config.color}`} />
        <span className="text-xs">{config.text}</span>
      </Badge>
    );
  };

  const getTimeSince = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 10) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <>
      <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
        {/* Header with Auto-save indicator */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/cost-sheets')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold text-foreground">
              {isEditing ? 'Edit Cost Sheet' : 'New Cost Sheet'}
            </h1>
            <p className="text-muted-foreground mt-1">
              Fill in the details and auto-calculated fields will update automatically
            </p>
          </div>
          <AutoSaveIndicator />
        </div>

        {/* Action Buttons - MOVED TO TOP */}
        <div className="flex flex-col gap-3">
          {isAdmin && (
            <p className="text-sm text-green-600 font-medium text-center">
              ✓ As a superadmin, your cost sheets are automatically approved when you click Save Changes
            </p>
          )}
          {isEditing && !isAdmin && (
            <p className="text-sm text-muted-foreground text-center">
              Editing will reset the cost sheet to Draft status. Submit for approval after saving.
            </p>
          )}
          <div className="flex gap-3 justify-end">
            {!isAdmin && (
              <Button variant="outline" onClick={() => navigate('/cost-sheets')} disabled={loading}>
                Cancel
              </Button>
            )}
            {isAdmin ? (
              // Superadmin only sees one button - everything is auto-approved
              <Button
                onClick={() => saveCostSheet('APPROVED')}
                disabled={loading || !user}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {isEditing ? 'Save Changes' : 'Create Cost Sheet'}
              </Button>
            ) : (
              // Regular users see Draft and Submit buttons
              <>
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
              </>
            )}
          </div>
        </div>

        {/* Company, City & Vehicle Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Basic Information</CardTitle>
            <CardDescription>Company, location, and vehicle details</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="company">Company Name *</Label>
              <Input
                id="company"
                value={formData.company_name}
                onChange={(e) => updateField('company_name', e.target.value)}
                placeholder="Enter company name"
              />
              {errors.company_name && <p className="text-xs text-destructive">{errors.company_name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Select value={formData.city} onValueChange={(v) => updateField('city', v)}>
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
              {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
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
                  <Label htmlFor="ex_showroom">Ex-Showroom Price (₹)</Label>
                  <Input
                    id="ex_showroom"
                    type="number"
                    min="0"
                    value={formData.ex_showroom_price || ''}
                    onChange={(e) => updateField('ex_showroom_price', parseFloat(e.target.value) || 0)}
                  />
                  {errors.ex_showroom_price && <p className="text-sm text-destructive">{errors.ex_showroom_price}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discount">Discount Amount (₹)</Label>
                  <Input
                    id="discount"
                    type="number"
                    min="0"
                    value={formData.discount || ''}
                    onChange={(e) => updateField('discount', parseFloat(e.target.value) || 0)}
                  />
                  {errors.discount && <p className="text-sm text-destructive">{errors.discount}</p>}
                  <p className="text-xs text-muted-foreground">
                    Discount applied to ex-showroom price
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Discounted Price
                    <Calculator className="w-3 h-3 text-muted-foreground" />
                  </Label>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg font-medium text-blue-700">
                    {formatCurrency(calculations.discounted_price)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(formData.ex_showroom_price)} - {formatCurrency(formData.discount)}
                  </p>
                </div>
          </CardContent>
        </Card>

        {/* Financing Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Financing Details</CardTitle>
            <CardDescription>Based on ex-showroom price only</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            {isAdmin && (
              <div className="space-y-2">
                <Label htmlFor="down_payment">Down Payment (%)</Label>
                <Input
                  id="down_payment"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.down_payment_percent || 0}
                  onChange={(e) => updateField('down_payment_percent', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
                {errors.down_payment_percent && <p className="text-xs text-destructive">{errors.down_payment_percent}</p>}
                <p className="text-xs text-muted-foreground">
                  On discounted price {formatCurrency(calculations.discounted_price)}
                </p>
              </div>
            )}
            {isAdmin && (
              <div className="space-y-2">
                <Label>Down Payment Amount</Label>
                <div className="p-3 bg-muted rounded-lg font-medium">
                  {formatCurrency(calculations.down_payment_amount)}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Loan Amount</Label>
              <div className="p-3 bg-muted rounded-lg font-medium">
                {formatCurrency(calculations.loan_amount)}
              </div>
              <p className="text-xs text-muted-foreground">
                Discounted price - Down payment
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Insurance, Registration & On-Road Price Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Insurance, Registration & On-Road Price</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Annual Insurance
                <Lock className="w-3 h-3 text-muted-foreground" />
              </Label>
              <div className="p-3 bg-muted rounded-lg font-medium">
                {formatCurrency(calculations.insurance_amount_monthly * 12)}
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
              <p className="text-xs text-muted-foreground">
                One-time registration fee
              </p>
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
              <div className="flex justify-between items-center">
                <Label className="flex items-center gap-2">
                  Monthly EMI
                  <Lock className="w-3 h-3 text-muted-foreground" />
                </Label>
                <div className="text-lg font-medium">
                  {formatCurrency(calculations.emi_amount)}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Interest Rate: {interestRate}% p.a. | Loan: {formatCurrency(calculations.loan_amount)} | Tenure: {calculations.tenure_months} months
              </p>
              <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted/50 rounded">
                <strong>Loan breakdown:</strong> Discounted price {formatCurrency(calculations.discounted_price)}
                {calculations.down_payment_amount > 0 && ` - Down payment ${formatCurrency(calculations.down_payment_amount)}`}
                {' = Loan amount ' + formatCurrency(calculations.loan_amount)}
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Monthly Insurance ({insuranceRate}% of ex-showroom ÷ 12)</span>
                <span className="font-medium">{formatCurrency(calculations.insurance_amount_monthly)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Monthly Registration (₹{formatCurrency(formData.registration_charges)} ÷ 12)</span>
                <span className="font-medium">{formatCurrency(calculations.registration_monthly)}</span>
              </div>
            </div>

            <Separator />

            <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg">
              <span className="font-medium">Subtotal A (EMI + Insurance + Registration)</span>
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

            {/* Vehicle Specifications - Editable */}
            <div>
              <h4 className="font-medium mb-3 text-muted-foreground">Vehicle Specifications</h4>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="mileage_per_liter">
                    Mileage (km per {selectedVehicle?.fuel_type === 'EV' ? 'kWh' : 'Liter'})
                  </Label>
                  <Input
                    id="mileage_per_liter"
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={formData.mileage_per_liter || ''}
                    onChange={(e) => updateField('mileage_per_liter', parseFloat(e.target.value) || 0)}
                    placeholder={selectedVehicle?.mileage_km_per_unit?.toString() || '0'}
                  />
                  <p className="text-xs text-muted-foreground">
                    Default from vehicle: {selectedVehicle?.mileage_km_per_unit?.toFixed(2) || 'N/A'} km/{selectedVehicle?.fuel_type === 'EV' ? 'kWh' : 'L'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maintenance_cost_per_km">
                    Maintenance Cost (₹ per km)
                  </Label>
                  <Input
                    id="maintenance_cost_per_km"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.maintenance_cost_per_km || ''}
                    onChange={(e) => updateField('maintenance_cost_per_km', parseFloat(e.target.value) || 0)}
                    placeholder={selectedVehicle?.maintenance_cost_per_km?.toString() || '0'}
                  />
                  <p className="text-xs text-muted-foreground">
                    Default from vehicle: {selectedVehicle?.maintenance_cost_per_km
                      ? formatCurrency(selectedVehicle.maintenance_cost_per_km)
                      : 'N/A'}
                  </p>
                </div>
              </div>

              {selectedVehicle && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    <strong>Selected Vehicle:</strong> {selectedVehicle.brand_name} {selectedVehicle.model_name} - {selectedVehicle.variant_name}
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    Fuel Type: {selectedVehicle.fuel_type} |
                    Default Mileage: {selectedVehicle.mileage_km_per_unit} km/{selectedVehicle.fuel_type === 'EV' ? 'kWh' : 'L'} |
                    Default Maintenance: {formatCurrency(selectedVehicle.maintenance_cost_per_km)}/km
                  </p>
                </div>
              )}
            </div>

            <Separator />

            {/* Usage & Fuel */}
            <div>
              <h4 className="font-medium mb-3 text-muted-foreground">Usage & Fuel</h4>
              <div className="grid gap-4 md:grid-cols-4">
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
                  {selectedVehicle && formData.city && (
                    <p className="text-xs text-muted-foreground">
                      {formData.monthly_km.toFixed(0)} km ÷ {formData.mileage_per_liter || selectedVehicle.mileage_km_per_unit} km/{selectedVehicle.fuel_type === 'EV' ? 'kWh' : 'L'} @ {formatCurrency(fuelRate)}/{selectedVehicle.fuel_type === 'EV' ? 'kWh' : 'L'} in {formData.city}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Driver Costs */}
            <div>
              <h4 className="font-medium mb-3 text-muted-foreground">Driver Costs</h4>
              <div className="grid gap-4 md:grid-cols-4">
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

            {/* Maintenance Cost */}
            <div>
              <h4 className="font-medium mb-3 text-muted-foreground">Maintenance</h4>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Monthly Maintenance Cost
                    <Lock className="w-3 h-3 text-muted-foreground" />
                  </Label>
                  <div className="p-3 bg-muted rounded-lg font-medium">
                    {formatCurrency(calculations.maintenance_cost)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formData.monthly_km.toFixed(0)} km × {formatCurrency(formData.maintenance_cost_per_km || selectedVehicle?.maintenance_cost_per_km || 0)}/km
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Other Costs */}
            <div>
              <h4 className="font-medium mb-3 text-muted-foreground">Other Monthly Costs</h4>
              <div className="grid gap-4 md:grid-cols-4">
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
            <div className="grid gap-4 md:grid-cols-4">
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
      </div>

      {/* Navigation Blocker Dialog */}
      {blocker.state === 'blocked' && (
        <AlertDialog open={true} onOpenChange={() => { }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
              <AlertDialogDescription>
                You have unsaved changes. Are you sure you want to leave? Your work will be auto-saved as a draft.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => blocker.reset?.()}>Stay</AlertDialogCancel>
              <AlertDialogAction onClick={() => blocker.proceed?.()}>Leave</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
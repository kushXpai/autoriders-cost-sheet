// src/lib/calculations.ts
import type { CostSheetFormData, Vehicle, CalculatedFields } from '@/types';
import { supabase } from '../supabase/client';

// ----------------------
// Helper functions
// ----------------------

// Standard EMI formula (Reducing Balance)
function calculateEMI(
  principal: number,
  annualInterestRate: number,
  tenureMonths: number
): number {
  if (principal <= 0 || tenureMonths <= 0) return 0;
  if (annualInterestRate <= 0) return principal / tenureMonths;

  const monthlyRate = annualInterestRate / 100 / 12;
  const n = tenureMonths;

  return (
    (principal * monthlyRate * Math.pow(1 + monthlyRate, n)) /
    (Math.pow(1 + monthlyRate, n) - 1)
  );
}

// ----------------------
// Supabase fetchers
// ----------------------

async function fetchVehicle(vehicle_id: string): Promise<Vehicle | null> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', vehicle_id)
    .single();

  if (error) {
    console.error('Error fetching vehicle:', error.message);
    return null;
  }
  return data;
}

async function fetchActiveInterestRate(): Promise<number> {
  const { data, error } = await supabase
    .from('interest_rates')
    .select('*')
    .eq('is_active', true)
    .order('effective_from', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching interest rate:', error.message);
    return 12;
  }
  return data?.interest_rate_percent ?? 12;
}

async function fetchActiveAdminCharge(): Promise<number> {
  const { data, error } = await supabase
    .from('admin_charges')
    .select('*')
    .eq('is_active', true)
    .order('effective_from', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching admin charge:', error.message);
    return 0;
  }
  return data?.admin_charge_percent ?? 0;
}

async function fetchActiveInsuranceRate(): Promise<number> {
  const { data, error } = await supabase
    .from('insurance_rates')
    .select('*')
    .eq('is_active', true)
    .order('effective_from', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching insurance rate:', error.message);
    return 3.5;
  }
  return data?.insurance_rate_percent ?? 3.5;
}

async function fetchFuelRate(fuel_type: string): Promise<number> {
  const { data, error } = await supabase
    .from('fuel_rates')
    .select('*')
    .eq('fuel_type', fuel_type)
    .order('effective_date', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching fuel rate:', error.message);
    return 0;
  }
  return data?.rate_per_unit ?? 0;
}

// ----------------------
// Main calculation
// ----------------------

export async function calculateCostSheet(
  formData: CostSheetFormData
): Promise<CalculatedFields> {
  const vehicle = await fetchVehicle(formData.vehicle_id);
  const interestRate = await fetchActiveInterestRate();
  const adminChargePercent = await fetchActiveAdminCharge();
  const insuranceRate = await fetchActiveInsuranceRate();
  const fuelRate = vehicle ? await fetchFuelRate(vehicle.fuel_type) : 0;

  // ----------------------
  // Tenure
  // ----------------------
  const tenure_months = formData.tenure_years * 12;

  // ----------------------
  // Insurance & On-Road Price (CHANGED)
  // ----------------------
  // Insurance calculated on ex-showroom price (annual, then converted to monthly for subtotal_a)
  const insurance_amount_annual =
    formData.ex_showroom_price * (insuranceRate / 100);
  
  const insurance_amount = insurance_amount_annual / 12; // Monthly insurance for subtotal_a

  // On-road price = ex-showroom + annual insurance + registration
  const on_road_price =
    formData.ex_showroom_price +
    insurance_amount_annual +
    formData.registration_charges;

  // ----------------------
  // Financing (CHANGED - now based on on_road_price)
  // ----------------------
  const down_payment_amount =
    on_road_price * (formData.down_payment_percent / 100);

  const loan_amount = on_road_price - down_payment_amount;

  const emi_amount = calculateEMI(
    loan_amount,
    interestRate,
    tenure_months
  );

  // ----------------------
  // Subtotal A
  // ----------------------
  const subtotal_a = emi_amount;

  // ----------------------
  // Fuel
  // ----------------------
  const mileage = vehicle?.mileage_km_per_unit ?? 25;

  const fuel_cost =
    (formData.monthly_km / mileage) * fuelRate;

  // ----------------------
  // Driver cost
  // ----------------------
  const total_driver_cost =
    formData.drivers_count * formData.driver_salary_per_driver;

  // ----------------------
  // Maintenance (AUTO from vehicle)
  // ----------------------
  const maintenance_cost =
    (vehicle?.maintenance_cost_per_km ?? 0) * formData.monthly_km;

  // ----------------------
  // Subtotal B
  // ----------------------
  const subtotal_b =
    fuel_cost +
    total_driver_cost +
    maintenance_cost +
    formData.parking_charges +
    formData.supervisor_cost +
    formData.gps_camera_cost +
    formData.permit_cost;

  // ----------------------
  // Admin charge & total
  // ----------------------
  const admin_charge_amount =
    (subtotal_a + subtotal_b) * (adminChargePercent / 100);

  const grand_total =
    subtotal_a + subtotal_b + admin_charge_amount;

  // ----------------------
  // Return values (MATCH DB)
  // ----------------------
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
}

// ----------------------
// Format helpers
// ----------------------

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(num: number, decimals = 2): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}
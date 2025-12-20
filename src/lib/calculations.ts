import type { CostSheetFormData, CostSheet, Vehicle } from '@/types';
import { getActiveInterestRate, getActiveAdminChargePercent, getCurrentFuelRate, getVehicles, getActiveInsuranceRate } from './storage';

export interface CalculatedFields {
  tenure_months: number;
  emi_amount: number;
  insurance_amount: number;
  subtotal_a: number;
  fuel_cost: number;
  total_driver_cost: number;
  subtotal_b: number;
  admin_charge_percent: number;
  admin_charge_amount: number;
  grand_total: number;
}

// Standard EMI formula: EMI = (P * R * (1 + R)^N) / ((1 + R)^N - 1)
// P = Principal (vehicle cost), R = Monthly interest rate, N = Number of months
function calculateEMI(principal: number, annualInterestRate: number, tenureMonths: number): number {
  if (principal <= 0 || tenureMonths <= 0) return 0;
  if (annualInterestRate <= 0) return principal / tenureMonths; // No interest case
  
  const monthlyRate = annualInterestRate / 100 / 12; // Convert annual % to monthly decimal
  const n = tenureMonths;
  
  const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
  return emi;
}

export function calculateCostSheet(formData: CostSheetFormData): CalculatedFields {
  const vehicle = getVehicles().find(v => v.id === formData.vehicle_id);
  const interestRate = getActiveInterestRate();
  const adminChargePercent = getActiveAdminChargePercent();
  const insuranceRate = getActiveInsuranceRate();
  
  // Tenure
  const tenure_months = formData.tenure_years * 12;
  
  // EMI using standard formula: EMI = (P * R * (1 + R)^N) / ((1 + R)^N - 1)
  const emi_amount = calculateEMI(formData.vehicle_cost, interestRate, tenure_months);
  
  // Insurance = vehicle_cost × insurance_rate_percent
  const insurance_amount = formData.vehicle_cost * (insuranceRate / 100);
  
  // Subtotal A = EMI + insurance_amount + registration_charges (monthly costs)
  const subtotal_a = emi_amount + insurance_amount + formData.registration_charges;
  
  // Fuel Cost = (monthly_km ÷ mileage) × fuel_rate
  const monthly_km = formData.daily_km * 30;
  const fuelRate = vehicle ? getCurrentFuelRate(vehicle.fuel_type) : 0;
  const mileage = vehicle?.mileage_km_per_unit || 1;
  const fuel_cost = (monthly_km / mileage) * fuelRate;
  
  // Driver Cost = drivers_count × driver_salary
  const total_driver_cost = formData.drivers_count * formData.driver_salary_per_driver;
  
  // Subtotal B
  const subtotal_b = 
    fuel_cost +
    total_driver_cost +
    formData.parking_charges +
    formData.maintenance_cost +
    formData.supervisor_cost +
    formData.gps_camera_cost +
    formData.permit_cost;
  
  // Admin Charges = (subtotal_a + subtotal_b) × admin_charge_percent / 100
  const admin_charge_amount = (subtotal_a + subtotal_b) * (adminChargePercent / 100);
  
  // Grand Total = subtotal_a + subtotal_b + admin_charge_amount
  const grand_total = subtotal_a + subtotal_b + admin_charge_amount;
  
  return {
    tenure_months,
    emi_amount,
    insurance_amount,
    subtotal_a,
    fuel_cost,
    total_driver_cost,
    subtotal_b,
    admin_charge_percent: adminChargePercent,
    admin_charge_amount,
    grand_total,
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(num: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

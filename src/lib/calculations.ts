import type { CostSheetFormData, CostSheet, Vehicle } from '@/types';
import { getActiveInterestRate, getActiveAdminChargePercent, getCurrentFuelRate, getVehicles } from './storage';

// Fixed insurance percentage
const INSURANCE_PERCENT = 3.5;

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

export function calculateCostSheet(formData: CostSheetFormData): CalculatedFields {
  const vehicle = getVehicles().find(v => v.id === formData.vehicle_id);
  const interestRate = getActiveInterestRate();
  const adminChargePercent = getActiveAdminChargePercent();
  
  // Tenure
  const tenure_months = formData.tenure_years * 12;
  
  // EMI = (vehicle_cost × interest_rate_percent) ÷ tenure_months
  const emi_amount = tenure_months > 0 
    ? (formData.vehicle_cost * (interestRate / 100)) / tenure_months 
    : 0;
  
  // Insurance = vehicle_cost × insurance_percent
  const insurance_amount = formData.vehicle_cost * (INSURANCE_PERCENT / 100);
  
  // Subtotal A = vehicle_cost + emi_amount + insurance_amount + registration_charges
  const subtotal_a = formData.vehicle_cost + emi_amount + insurance_amount + formData.registration_charges;
  
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

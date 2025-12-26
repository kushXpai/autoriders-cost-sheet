// src/types/index.ts

// User Types
export type UserRole = 'SUPERADMIN' | 'ADMIN' | 'STAFF';

export interface User {
  id: string;
  full_name: string;
  email: string;
  password?: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Vehicle Types
export type FuelType = 'PETROL' | 'DIESEL' | 'HYBRID' | 'EV';

export interface Vehicle {
  id: string;
  brand_name: string;
  model_name: string;
  variant_name: string;
  fuel_type: FuelType;
  mileage_km_per_unit: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// City Types
export type City =
  | 'Mumbai'
  | 'Delhi'
  | 'Ahmedabad'
  | 'Chennai'
  | 'Bangalore'
  | 'Hyderabad'
  | 'Vadodara'
  | 'Kolkata'
  | 'Gurugram'
  | 'Pune';

// Fuel Rate Types
export interface FuelRate {
  id: string;
  // Exclude HYBRID from FuelType
  fuel_type: Exclude<FuelType, 'HYBRID'>;
  city: City;
  rate_per_unit: number;
  effective_date: string;
  created_at: string;
}

// Interest Rate Types
export interface InterestRate {
  id: string;
  interest_rate_percent: number;
  effective_from: string;
  is_active: boolean;
}

// Admin Charge Types
export interface AdminCharge {
  id: string;
  admin_charge_percent: number;
  effective_from: string;
  is_active: boolean;
}

// Email Settings Types
export interface EmailSettings {
  id: string;
  admin_emails: string[];
  super_admin_email: string;
  notifications_enabled: boolean;
  updated_at: string;
}

// Insurance Rate Types
export interface InsuranceRate {
  id: string;
  insurance_rate_percent: number;
  effective_from: string;
  is_active: boolean;
}

// Cost Sheet Types
export type CostSheetStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED';

export interface CostSheet {
  id: string;

  company_name: string;
  vehicle_id: string;

  tenure_years: number;
  tenure_months: number;

  vehicle_cost: number;

  down_payment_percent: number;
  down_payment_amount: number;
  loan_amount: number;

  emi_amount: number;

  insurance_amount: number;
  registration_charges: number;
  subtotal_a: number;

  monthly_km: number;
  daily_hours: number;
  fuel_cost: number;

  drivers_count: number;
  driver_salary_per_driver: number;
  total_driver_cost: number;

  parking_charges: number;
  maintenance_cost: number;
  supervisor_cost: number;
  gps_camera_cost: number;
  permit_cost: number;

  subtotal_b: number;

  admin_charge_percent: number;
  admin_charge_amount: number;

  grand_total: number;

  status: CostSheetStatus;
  approval_remarks: string | null;

  submitted_at: string | null;
  approved_at: string | null;
  approved_by: string | null;

  pdf_url: string | null;

  created_by: string;
  created_at: string;
  updated_at: string;
}

// Form Input Types (for creating/editing)
export interface CostSheetFormData {
  company_name: string;
  vehicle_id: string;

  tenure_years: number;

  vehicle_cost: number;

  down_payment_percent: number;

  registration_charges: number;

  monthly_km: number;
  daily_hours: number;

  drivers_count: number;
  driver_salary_per_driver: number;

  parking_charges: number;
  maintenance_cost: number;
  supervisor_cost: number;
  gps_camera_cost: number;
  permit_cost: number;
}

// Auth Context Types
export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isAuthenticated: boolean;
}

// Calculated fields returned by calculateCostSheet
export interface CalculatedFields {
  tenure_months: number;

  down_payment_amount: number;
  loan_amount: number;

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

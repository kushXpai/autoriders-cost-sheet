import type { User, Vehicle, FuelRate, InterestRate, AdminCharge, CostSheet, EmailSettings, InsuranceRate } from '@/types';

// Storage Keys
const STORAGE_KEYS = {
  USERS: 'car_rental_users',
  VEHICLES: 'car_rental_vehicles',
  FUEL_RATES: 'car_rental_fuel_rates',
  INTEREST_RATES: 'car_rental_interest_rates',
  ADMIN_CHARGES: 'car_rental_admin_charges',
  COST_SHEETS: 'car_rental_cost_sheets',
  CURRENT_USER: 'car_rental_current_user',
  EMAIL_SETTINGS: 'car_rental_email_settings',
  INSURANCE_RATES: 'car_rental_insurance_rates',
} as const;

// Generic storage functions
function getItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// Generate UUID
export function generateId(): string {
  return crypto.randomUUID();
}

// Users
export function getUsers(): User[] {
  return getItem<User[]>(STORAGE_KEYS.USERS, []);
}

export function setUsers(users: User[]): void {
  setItem(STORAGE_KEYS.USERS, users);
}

export function getCurrentUser(): User | null {
  return getItem<User | null>(STORAGE_KEYS.CURRENT_USER, null);
}

export function setCurrentUser(user: User | null): void {
  setItem(STORAGE_KEYS.CURRENT_USER, user);
}

// Vehicles
export function getVehicles(): Vehicle[] {
  return getItem<Vehicle[]>(STORAGE_KEYS.VEHICLES, []);
}

export function setVehicles(vehicles: Vehicle[]): void {
  setItem(STORAGE_KEYS.VEHICLES, vehicles);
}

// Fuel Rates
export function getFuelRates(): FuelRate[] {
  return getItem<FuelRate[]>(STORAGE_KEYS.FUEL_RATES, []);
}

export function setFuelRates(rates: FuelRate[]): void {
  setItem(STORAGE_KEYS.FUEL_RATES, rates);
}

export function getCurrentFuelRate(fuelType: string): number {
  const rates = getFuelRates();
  const typeRates = rates
    .filter(r => r.fuel_type === fuelType)
    .sort((a, b) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime());
  return typeRates[0]?.rate_per_unit || 0;
}

// Interest Rates
export function getInterestRates(): InterestRate[] {
  return getItem<InterestRate[]>(STORAGE_KEYS.INTEREST_RATES, []);
}

export function setInterestRates(rates: InterestRate[]): void {
  setItem(STORAGE_KEYS.INTEREST_RATES, rates);
}

export function getActiveInterestRate(): number {
  const rates = getInterestRates();
  const active = rates
    .filter(r => r.is_active)
    .sort((a, b) => new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime());
  return active[0]?.interest_rate_percent || 0;
}

// Insurance Rates
export function getInsuranceRates(): InsuranceRate[] {
  return getItem<InsuranceRate[]>(STORAGE_KEYS.INSURANCE_RATES, []);
}

export function setInsuranceRates(rates: InsuranceRate[]): void {
  setItem(STORAGE_KEYS.INSURANCE_RATES, rates);
}

export function getActiveInsuranceRate(): number {
  const rates = getInsuranceRates();
  const active = rates
    .filter(r => r.is_active)
    .sort((a, b) => new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime());
  return active[0]?.insurance_rate_percent || 3.5; // Default 3.5% if not set
}

// Admin Charges
export function getAdminCharges(): AdminCharge[] {
  return getItem<AdminCharge[]>(STORAGE_KEYS.ADMIN_CHARGES, []);
}

export function setAdminCharges(charges: AdminCharge[]): void {
  setItem(STORAGE_KEYS.ADMIN_CHARGES, charges);
}

export function getActiveAdminChargePercent(): number {
  const charges = getAdminCharges();
  const active = charges
    .filter(c => c.is_active)
    .sort((a, b) => new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime());
  return active[0]?.admin_charge_percent || 0;
}

// Cost Sheets
export function getCostSheets(): CostSheet[] {
  return getItem<CostSheet[]>(STORAGE_KEYS.COST_SHEETS, []);
}

export function setCostSheets(sheets: CostSheet[]): void {
  setItem(STORAGE_KEYS.COST_SHEETS, sheets);
}

// Email Settings
export function getEmailSettings(): EmailSettings | null {
  return getItem<EmailSettings | null>(STORAGE_KEYS.EMAIL_SETTINGS, null);
}

export function setEmailSettings(settings: EmailSettings): void {
  setItem(STORAGE_KEYS.EMAIL_SETTINGS, settings);
}

// Force reset all data (for demo purposes)
export function resetAllData(): void {
  localStorage.removeItem('car_rental_users');
  localStorage.removeItem('car_rental_vehicles');
  localStorage.removeItem('car_rental_fuel_rates');
  localStorage.removeItem('car_rental_interest_rates');
  localStorage.removeItem('car_rental_insurance_rates');
  localStorage.removeItem('car_rental_admin_charges');
  localStorage.removeItem('car_rental_cost_sheets');
  localStorage.removeItem('car_rental_current_user');
  localStorage.removeItem('car_rental_email_settings');
}

// Initialize default data
export function initializeDefaultData(): void {
  // Check if already initialized - if less than 10 vehicles, reinitialize with demo data
  const existingVehicles = getVehicles();
  if (existingVehicles.length >= 10) return;

  const now = new Date().toISOString();

  // Default Users
  const defaultUsers: User[] = [
    {
      id: generateId(),
      full_name: 'Admin User',
      email: 'admin@carrental.com',
      password: 'admin123',
      role: 'ADMIN',
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: generateId(),
      full_name: 'Staff User',
      email: 'staff@carrental.com',
      password: 'staff123',
      role: 'STAFF',
      is_active: true,
      created_at: now,
      updated_at: now,
    },
  ];
  setUsers(defaultUsers);

  // Default Vehicles - 20+ vehicles from 4 brands
  const vehicleIds: string[] = [];
  const defaultVehicles: Vehicle[] = [
    // Toyota (6 vehicles)
    {
      id: generateId(),
      brand_name: 'Toyota',
      model_name: 'Innova Crysta',
      variant_name: 'GX 2.4 MT',
      fuel_type: 'DIESEL',
      mileage_km_per_unit: 12,
      is_active: true,
      created_at: now,
    },
    {
      id: generateId(),
      brand_name: 'Toyota',
      model_name: 'Innova Crysta',
      variant_name: 'ZX 2.4 AT',
      fuel_type: 'DIESEL',
      mileage_km_per_unit: 11,
      is_active: true,
      created_at: now,
    },
    {
      id: generateId(),
      brand_name: 'Toyota',
      model_name: 'Fortuner',
      variant_name: 'Legender 4x4',
      fuel_type: 'DIESEL',
      mileage_km_per_unit: 10,
      is_active: true,
      created_at: now,
    },
    {
      id: generateId(),
      brand_name: 'Toyota',
      model_name: 'Glanza',
      variant_name: 'G MT',
      fuel_type: 'PETROL',
      mileage_km_per_unit: 22,
      is_active: true,
      created_at: now,
    },
    {
      id: generateId(),
      brand_name: 'Toyota',
      model_name: 'Urban Cruiser Hyryder',
      variant_name: 'S HEV',
      fuel_type: 'HYBRID',
      mileage_km_per_unit: 27,
      is_active: true,
      created_at: now,
    },
    {
      id: generateId(),
      brand_name: 'Toyota',
      model_name: 'Camry',
      variant_name: 'Hybrid',
      fuel_type: 'HYBRID',
      mileage_km_per_unit: 19,
      is_active: true,
      created_at: now,
    },
    // Hyundai (6 vehicles)
    {
      id: generateId(),
      brand_name: 'Hyundai',
      model_name: 'Creta',
      variant_name: 'SX (O) 1.5 Diesel',
      fuel_type: 'DIESEL',
      mileage_km_per_unit: 18,
      is_active: true,
      created_at: now,
    },
    {
      id: generateId(),
      brand_name: 'Hyundai',
      model_name: 'Creta',
      variant_name: 'SX 1.5 Petrol',
      fuel_type: 'PETROL',
      mileage_km_per_unit: 16,
      is_active: true,
      created_at: now,
    },
    {
      id: generateId(),
      brand_name: 'Hyundai',
      model_name: 'Verna',
      variant_name: 'SX 1.5 Turbo GDi',
      fuel_type: 'PETROL',
      mileage_km_per_unit: 18,
      is_active: true,
      created_at: now,
    },
    {
      id: generateId(),
      brand_name: 'Hyundai',
      model_name: 'Tucson',
      variant_name: 'Signature AWD',
      fuel_type: 'DIESEL',
      mileage_km_per_unit: 14,
      is_active: true,
      created_at: now,
    },
    {
      id: generateId(),
      brand_name: 'Hyundai',
      model_name: 'i20',
      variant_name: 'Asta (O) 1.2',
      fuel_type: 'PETROL',
      mileage_km_per_unit: 20,
      is_active: true,
      created_at: now,
    },
    {
      id: generateId(),
      brand_name: 'Hyundai',
      model_name: 'Ioniq 5',
      variant_name: 'Long Range AWD',
      fuel_type: 'EV',
      mileage_km_per_unit: 5.2,
      is_active: true,
      created_at: now,
    },
    // Tata (5 vehicles)
    {
      id: generateId(),
      brand_name: 'Tata',
      model_name: 'Nexon EV',
      variant_name: 'Max XZ+ Lux',
      fuel_type: 'EV',
      mileage_km_per_unit: 5.5,
      is_active: true,
      created_at: now,
    },
    {
      id: generateId(),
      brand_name: 'Tata',
      model_name: 'Harrier',
      variant_name: 'Fearless+ AT',
      fuel_type: 'DIESEL',
      mileage_km_per_unit: 14,
      is_active: true,
      created_at: now,
    },
    {
      id: generateId(),
      brand_name: 'Tata',
      model_name: 'Safari',
      variant_name: 'Adventure+ AT 6S',
      fuel_type: 'DIESEL',
      mileage_km_per_unit: 13,
      is_active: true,
      created_at: now,
    },
    {
      id: generateId(),
      brand_name: 'Tata',
      model_name: 'Punch',
      variant_name: 'Creative AMT',
      fuel_type: 'PETROL',
      mileage_km_per_unit: 18,
      is_active: true,
      created_at: now,
    },
    {
      id: generateId(),
      brand_name: 'Tata',
      model_name: 'Tiago EV',
      variant_name: 'XZ+ Tech Lux',
      fuel_type: 'EV',
      mileage_km_per_unit: 6,
      is_active: true,
      created_at: now,
    },
    // Mahindra (5 vehicles)
    {
      id: generateId(),
      brand_name: 'Mahindra',
      model_name: 'XUV700',
      variant_name: 'AX7 L AWD',
      fuel_type: 'DIESEL',
      mileage_km_per_unit: 13,
      is_active: true,
      created_at: now,
    },
    {
      id: generateId(),
      brand_name: 'Mahindra',
      model_name: 'Scorpio N',
      variant_name: 'Z8 L 4WD AT',
      fuel_type: 'DIESEL',
      mileage_km_per_unit: 12,
      is_active: true,
      created_at: now,
    },
    {
      id: generateId(),
      brand_name: 'Mahindra',
      model_name: 'Thar',
      variant_name: 'LX Hard Top 4WD AT',
      fuel_type: 'DIESEL',
      mileage_km_per_unit: 11,
      is_active: true,
      created_at: now,
    },
    {
      id: generateId(),
      brand_name: 'Mahindra',
      model_name: 'XUV400',
      variant_name: 'EL Pro',
      fuel_type: 'EV',
      mileage_km_per_unit: 5.8,
      is_active: true,
      created_at: now,
    },
    {
      id: generateId(),
      brand_name: 'Mahindra',
      model_name: 'Bolero Neo',
      variant_name: 'N10 (O)',
      fuel_type: 'DIESEL',
      mileage_km_per_unit: 15,
      is_active: true,
      created_at: now,
    },
  ];
  
  // Store vehicle IDs for cost sheets
  defaultVehicles.forEach(v => vehicleIds.push(v.id));
  setVehicles(defaultVehicles);

  // Default Fuel Rates
  const defaultFuelRates: FuelRate[] = [
    {
      id: generateId(),
      fuel_type: 'PETROL',
      rate_per_unit: 104.21,
      effective_date: now.split('T')[0],
      created_at: now,
    },
    {
      id: generateId(),
      fuel_type: 'DIESEL',
      rate_per_unit: 89.62,
      effective_date: now.split('T')[0],
      created_at: now,
    },
    {
      id: generateId(),
      fuel_type: 'EV',
      rate_per_unit: 8.50,
      effective_date: now.split('T')[0],
      created_at: now,
    },
  ];
  setFuelRates(defaultFuelRates);

  // Default Interest Rate
  const defaultInterestRates: InterestRate[] = [
    {
      id: generateId(),
      interest_rate_percent: 12,
      effective_from: now.split('T')[0],
      is_active: true,
    },
  ];
  setInterestRates(defaultInterestRates);

  // Default Insurance Rate
  const defaultInsuranceRates: InsuranceRate[] = [
    {
      id: generateId(),
      insurance_rate_percent: 3.5,
      effective_from: now.split('T')[0],
      is_active: true,
    },
  ];
  setInsuranceRates(defaultInsuranceRates);

  // Default Admin Charge
  const defaultAdminCharges: AdminCharge[] = [
    {
      id: generateId(),
      admin_charge_percent: 10,
      effective_from: now.split('T')[0],
      is_active: true,
    },
  ];
  setAdminCharges(defaultAdminCharges);

  // Default Cost Sheets - 5 cost sheets in various stages
  const adminUserId = defaultUsers[0].id;
  const staffUserId = defaultUsers[1].id;
  
  const defaultCostSheets: CostSheet[] = [
    {
      id: generateId(),
      company_name: 'Reliance Industries Ltd',
      vehicle_id: vehicleIds[2], // Toyota Fortuner
      tenure_years: 3,
      tenure_months: 36,
      vehicle_cost: 4500000,
      emi_amount: 145000,
      insurance_amount: 85000,
      registration_charges: 250000,
      subtotal_a: 480000,
      daily_km: 120,
      daily_hours: 10,
      fuel_cost: 89621,
      drivers_count: 2,
      driver_salary_per_driver: 25000,
      total_driver_cost: 50000,
      parking_charges: 5000,
      maintenance_cost: 8000,
      supervisor_cost: 15000,
      gps_camera_cost: 3500,
      permit_cost: 2500,
      subtotal_b: 173621,
      admin_charge_percent: 10,
      admin_charge_amount: 65362,
      grand_total: 718983,
      status: 'APPROVED',
      approval_remarks: 'Approved for corporate fleet. Good pricing negotiated.',
      submitted_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      approved_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      approved_by: adminUserId,
      pdf_url: null,
      created_by: staffUserId,
      created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: generateId(),
      company_name: 'Infosys Technologies',
      vehicle_id: vehicleIds[6], // Hyundai Creta Diesel
      tenure_years: 2,
      tenure_months: 24,
      vehicle_cost: 1800000,
      emi_amount: 82500,
      insurance_amount: 42000,
      registration_charges: 95000,
      subtotal_a: 219500,
      daily_km: 80,
      daily_hours: 8,
      fuel_cost: 39832,
      drivers_count: 1,
      driver_salary_per_driver: 22000,
      total_driver_cost: 22000,
      parking_charges: 3000,
      maintenance_cost: 5000,
      supervisor_cost: 8000,
      gps_camera_cost: 2500,
      permit_cost: 1500,
      subtotal_b: 81832,
      admin_charge_percent: 10,
      admin_charge_amount: 30133,
      grand_total: 331465,
      status: 'PENDING_APPROVAL',
      approval_remarks: '',
      submitted_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      approved_at: null,
      approved_by: null,
      pdf_url: null,
      created_by: staffUserId,
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: generateId(),
      company_name: 'Tata Consultancy Services',
      vehicle_id: vehicleIds[12], // Tata Nexon EV
      tenure_years: 4,
      tenure_months: 48,
      vehicle_cost: 2100000,
      emi_amount: 58000,
      insurance_amount: 48000,
      registration_charges: 35000,
      subtotal_a: 141000,
      daily_km: 100,
      daily_hours: 8,
      fuel_cost: 15455,
      drivers_count: 1,
      driver_salary_per_driver: 20000,
      total_driver_cost: 20000,
      parking_charges: 2500,
      maintenance_cost: 3000,
      supervisor_cost: 6000,
      gps_camera_cost: 2000,
      permit_cost: 1000,
      subtotal_b: 49955,
      admin_charge_percent: 10,
      admin_charge_amount: 19096,
      grand_total: 210051,
      status: 'PENDING_APPROVAL',
      approval_remarks: '',
      submitted_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      approved_at: null,
      approved_by: null,
      pdf_url: null,
      created_by: staffUserId,
      created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: generateId(),
      company_name: 'Wipro Limited',
      vehicle_id: vehicleIds[17], // Mahindra XUV700
      tenure_years: 3,
      tenure_months: 36,
      vehicle_cost: 2800000,
      emi_amount: 92000,
      insurance_amount: 62000,
      registration_charges: 145000,
      subtotal_a: 299000,
      daily_km: 150,
      daily_hours: 12,
      fuel_cost: 103346,
      drivers_count: 2,
      driver_salary_per_driver: 24000,
      total_driver_cost: 48000,
      parking_charges: 4500,
      maintenance_cost: 7500,
      supervisor_cost: 12000,
      gps_camera_cost: 3000,
      permit_cost: 2000,
      subtotal_b: 180346,
      admin_charge_percent: 10,
      admin_charge_amount: 47935,
      grand_total: 527281,
      status: 'REJECTED',
      approval_remarks: 'Costs are too high for the vehicle segment. Please renegotiate driver salaries and parking charges.',
      submitted_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      approved_at: null,
      approved_by: adminUserId,
      pdf_url: null,
      created_by: staffUserId,
      created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: generateId(),
      company_name: 'HCL Technologies',
      vehicle_id: vehicleIds[0], // Toyota Innova Crysta
      tenure_years: 2,
      tenure_months: 24,
      vehicle_cost: 2200000,
      emi_amount: 102000,
      insurance_amount: 52000,
      registration_charges: 115000,
      subtotal_a: 269000,
      daily_km: 100,
      daily_hours: 10,
      fuel_cost: 74683,
      drivers_count: 1,
      driver_salary_per_driver: 23000,
      total_driver_cost: 23000,
      parking_charges: 4000,
      maintenance_cost: 6000,
      supervisor_cost: 10000,
      gps_camera_cost: 2500,
      permit_cost: 1800,
      subtotal_b: 121983,
      admin_charge_percent: 10,
      admin_charge_amount: 39098,
      grand_total: 430081,
      status: 'DRAFT',
      approval_remarks: '',
      submitted_at: null,
      approved_at: null,
      approved_by: null,
      pdf_url: null,
      created_by: staffUserId,
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: now,
    },
  ];
  setCostSheets(defaultCostSheets);
}

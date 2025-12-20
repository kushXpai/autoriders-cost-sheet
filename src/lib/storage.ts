import type { User, Vehicle, FuelRate, InterestRate, AdminCharge, CostSheet } from '@/types';

// Storage Keys
const STORAGE_KEYS = {
  USERS: 'car_rental_users',
  VEHICLES: 'car_rental_vehicles',
  FUEL_RATES: 'car_rental_fuel_rates',
  INTEREST_RATES: 'car_rental_interest_rates',
  ADMIN_CHARGES: 'car_rental_admin_charges',
  COST_SHEETS: 'car_rental_cost_sheets',
  CURRENT_USER: 'car_rental_current_user',
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

// Initialize default data
export function initializeDefaultData(): void {
  // Check if already initialized
  if (getUsers().length > 0) return;

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

  // Default Vehicles
  const defaultVehicles: Vehicle[] = [
    {
      id: generateId(),
      brand_name: 'Toyota',
      model_name: 'Innova Crysta',
      variant_name: 'GX 2.4',
      fuel_type: 'DIESEL',
      mileage_km_per_unit: 12,
      is_active: true,
      created_at: now,
    },
    {
      id: generateId(),
      brand_name: 'Hyundai',
      model_name: 'Creta',
      variant_name: 'SX',
      fuel_type: 'PETROL',
      mileage_km_per_unit: 15,
      is_active: true,
      created_at: now,
    },
    {
      id: generateId(),
      brand_name: 'Tata',
      model_name: 'Nexon EV',
      variant_name: 'Max',
      fuel_type: 'EV',
      mileage_km_per_unit: 6, // km per kWh
      is_active: true,
      created_at: now,
    },
  ];
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
      rate_per_unit: 8.50, // per kWh
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
}

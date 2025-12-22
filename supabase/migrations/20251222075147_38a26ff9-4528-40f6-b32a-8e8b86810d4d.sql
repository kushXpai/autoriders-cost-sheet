
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('superadmin', 'admin', 'staff');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Create vehicles table
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model TEXT NOT NULL,
  ex_showroom_price NUMERIC NOT NULL,
  mileage NUMERIC NOT NULL,
  fuel_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create fuel_rates table
CREATE TABLE public.fuel_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fuel_type TEXT NOT NULL,
  rate NUMERIC NOT NULL,
  effective_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create interest_rates table
CREATE TABLE public.interest_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate NUMERIC NOT NULL,
  effective_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create insurance_rates table
CREATE TABLE public.insurance_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate NUMERIC NOT NULL,
  effective_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create admin_charges table
CREATE TABLE public.admin_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_percent NUMERIC NOT NULL,
  effective_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create cost_sheets table
CREATE TABLE public.cost_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  vehicle_id UUID REFERENCES public.vehicles(id),
  vehicle_model TEXT NOT NULL,
  ex_showroom_price NUMERIC NOT NULL,
  tenure_months INTEGER NOT NULL,
  emi_amount NUMERIC NOT NULL,
  insurance_amount NUMERIC NOT NULL,
  subtotal_a NUMERIC NOT NULL,
  running_kms NUMERIC NOT NULL,
  fuel_cost NUMERIC NOT NULL,
  driver_salary NUMERIC NOT NULL,
  driver_allowance NUMERIC NOT NULL,
  total_driver_cost NUMERIC NOT NULL,
  subtotal_b NUMERIC NOT NULL,
  admin_charge_percent NUMERIC NOT NULL,
  admin_charge_amount NUMERIC NOT NULL,
  grand_total NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending',
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interest_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_sheets ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Authenticated can view roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Superadmin can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'superadmin'));

-- RLS Policies for vehicles (viewable by all authenticated, manageable by admin+)
CREATE POLICY "View vehicles" ON public.vehicles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manage vehicles" ON public.vehicles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

-- RLS Policies for rates tables
CREATE POLICY "View fuel_rates" ON public.fuel_rates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manage fuel_rates" ON public.fuel_rates FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "View interest_rates" ON public.interest_rates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manage interest_rates" ON public.interest_rates FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "View insurance_rates" ON public.insurance_rates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manage insurance_rates" ON public.insurance_rates FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "View admin_charges" ON public.admin_charges FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manage admin_charges" ON public.admin_charges FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'superadmin'));

-- RLS Policies for cost_sheets
CREATE POLICY "View cost_sheets" ON public.cost_sheets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Create cost_sheets" ON public.cost_sheets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Update cost_sheets" ON public.cost_sheets FOR UPDATE TO authenticated USING (
  created_by = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin')
);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (new.id, COALESCE(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)), new.email);
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

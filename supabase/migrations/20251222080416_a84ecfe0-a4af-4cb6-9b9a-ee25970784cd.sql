
-- Fix 1: Restrict profiles SELECT to only own profile
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

-- Allow admins to view all profiles for user management
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

-- Fix 2: Restrict cost_sheets SELECT to creator/admins only
DROP POLICY IF EXISTS "View cost_sheets" ON public.cost_sheets;
CREATE POLICY "View own or admin cost_sheets" ON public.cost_sheets
FOR SELECT USING (
  (created_by = auth.uid()) 
  OR has_role(auth.uid(), 'admin') 
  OR has_role(auth.uid(), 'superadmin')
);

-- Fix 3: Require authentication for INSERT on cost_sheets
DROP POLICY IF EXISTS "Create cost_sheets" ON public.cost_sheets;
CREATE POLICY "Authenticated users can create cost_sheets" ON public.cost_sheets
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

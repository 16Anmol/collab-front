
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT CHECK (role IN ('startup', 'freelancer')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create startup_profiles table
CREATE TABLE public.startup_profiles (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  startup_name TEXT,
  industry TEXT,
  description TEXT,
  funding_stage TEXT,
  website TEXT,
  location TEXT
);

-- Create freelancer_profiles table
CREATE TABLE public.freelancer_profiles (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  skills TEXT[],
  experience TEXT,
  portfolio_link TEXT,
  hourly_rate NUMERIC,
  bio TEXT
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.startup_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_profiles ENABLE ROW LEVEL SECURITY;

-- Helper function
CREATE OR REPLACE FUNCTION public.is_own_profile(_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _id = auth.uid()
$$;

-- Trigger to make role immutable after first set
CREATE OR REPLACE FUNCTION public.prevent_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.role IS NOT NULL AND NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Role cannot be changed once set';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_immutable_role
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_role_change();

-- RLS policies for profiles
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (public.is_own_profile(id));

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.is_own_profile(id));

-- RLS policies for startup_profiles
CREATE POLICY "Users can view own startup profile"
ON public.startup_profiles FOR SELECT
TO authenticated
USING (public.is_own_profile(id));

CREATE POLICY "Users can insert own startup profile"
ON public.startup_profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own startup profile"
ON public.startup_profiles FOR UPDATE
TO authenticated
USING (public.is_own_profile(id));

-- RLS policies for freelancer_profiles
CREATE POLICY "Users can view own freelancer profile"
ON public.freelancer_profiles FOR SELECT
TO authenticated
USING (public.is_own_profile(id));

CREATE POLICY "Users can insert own freelancer profile"
ON public.freelancer_profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own freelancer profile"
ON public.freelancer_profiles FOR UPDATE
TO authenticated
USING (public.is_own_profile(id));

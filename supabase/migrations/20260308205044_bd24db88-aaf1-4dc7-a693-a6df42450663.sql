
CREATE OR REPLACE FUNCTION public.get_email_by_phone(phone text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM public.profiles WHERE phone_number = phone LIMIT 1;
$$;

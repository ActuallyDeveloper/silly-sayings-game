
-- Update get_email_by_username to search sp_profiles and mp_profiles instead of profiles
CREATE OR REPLACE FUNCTION public.get_email_by_username(_username text)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT u.email FROM auth.users u
  WHERE u.id IN (
    SELECT sp.user_id FROM public.sp_profiles sp WHERE lower(sp.username) = lower(_username)
    UNION
    SELECT mp.user_id FROM public.mp_profiles mp WHERE lower(mp.username) = lower(_username)
  )
  LIMIT 1
$$;

-- Update handle_new_user to NOT insert into profiles table
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.sp_profiles (user_id, display_name, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'username'
  );
  INSERT INTO public.mp_profiles (user_id, display_name, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'username'
  );
  RETURN NEW;
END;
$$;

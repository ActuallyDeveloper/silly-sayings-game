-- Fix security definer view by setting it to SECURITY INVOKER
ALTER VIEW public.leaderboard SET (security_invoker = on);
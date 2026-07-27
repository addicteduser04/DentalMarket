-- Correct active application-owned branding without rewriting historical
-- migrations or altering customer-generated commercial records.

update public.profiles
set full_name = 'Administrateur DENTANOVA'
where full_name = 'Administrateur ' || 'DENTAL' || 'NOVA'
  and role = 'admin';

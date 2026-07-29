-- Anonymous policies must not invoke private.is_admin(), which anon cannot execute.
-- Admin visibility is supplied by separate authenticated policies.

drop policy if exists universities_public_read on public.universities;
create policy universities_public_read on public.universities for select to anon, authenticated
using (is_active);
create policy universities_admin_read_all on public.universities for select to authenticated
using ((select private.is_admin()));

drop policy if exists academic_years_public_read on public.academic_years;
create policy academic_years_public_read on public.academic_years for select to anon, authenticated
using (is_active);
create policy academic_years_admin_read_all on public.academic_years for select to authenticated
using ((select private.is_admin()));

drop policy if exists student_packs_public_read on public.student_packs;
create policy student_packs_public_read on public.student_packs for select to anon, authenticated
using (
  publication_status = 'published'
  and exists (
    select 1 from public.universities u where u.id = university_id and u.is_active
  )
);
create policy student_packs_admin_read_all on public.student_packs for select to authenticated
using ((select private.is_admin()));

drop policy if exists student_pack_components_public_read on public.student_pack_components;
create policy student_pack_components_public_read on public.student_pack_components for select to anon, authenticated
using (
  exists (
    select 1 from public.student_packs sp
    join public.universities u on u.id = sp.university_id
    where sp.id = pack_id and sp.publication_status = 'published' and u.is_active
  )
);
create policy student_pack_components_admin_read_all on public.student_pack_components for select to authenticated
using ((select private.is_admin()));

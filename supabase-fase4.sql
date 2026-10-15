-- ELITE ACHIEVEMENT ACADEMY · FASE 4
-- Ejecutar completo en Supabase > SQL Editor.
-- Los registros nuevos siempre empiezan como student; teacher/admin se asignan manualmente.
create extension if not exists pgcrypto;
create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default '', grade text not null default '',
 role text not null default 'student' check (role in ('student','teacher','admin')),
 created_at timestamptz not null default now()
);
create table if not exists public.teacher_students (
 teacher_id uuid not null references public.profiles(id) on delete cascade,
 student_id uuid not null references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(teacher_id,student_id), check(teacher_id<>student_id)
);
create table if not exists public.progress_records (
 id uuid primary key default gen_random_uuid(), student_id uuid not null references public.profiles(id) on delete cascade,
 subject text not null check(subject in ('math','english','science','reading','mixed')),
 activity text not null default '', score integer not null check(score>=0), total integer not null check(total>0 and score<=total),
 points integer not null default 0 check(points>=0), created_at timestamptz not null default now()
);
create index if not exists progress_records_student_created_idx on public.progress_records(student_id,created_at desc);
create index if not exists teacher_students_student_idx on public.teacher_students(student_id);
create or replace function public.current_profile_role() returns text language sql stable security definer set search_path=public
as $$ select role from public.profiles where id=auth.uid() $$;
create or replace function public.can_view_student(target_student uuid) returns boolean language sql stable security definer set search_path=public
as $$ select auth.uid()=target_student or public.current_profile_role()='admin' or (public.current_profile_role()='teacher' and exists(select 1 from public.teacher_students ts where ts.teacher_id=auth.uid() and ts.student_id=target_student)) $$;
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public
as $$ begin insert into public.profiles(id,full_name,grade,role) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),coalesce(new.raw_user_meta_data->>'grade',''),'student') on conflict(id) do nothing; return new; end; $$;
drop trigger if exists on_auth_user_created_eaa on auth.users;
create trigger on_auth_user_created_eaa after insert on auth.users for each row execute procedure public.handle_new_user();
alter table public.profiles enable row level security; alter table public.teacher_students enable row level security; alter table public.progress_records enable row level security;
drop policy if exists "profiles read own or assigned" on public.profiles;
create policy "profiles read own or assigned" on public.profiles for select to authenticated using(id=auth.uid() or public.current_profile_role()='admin' or (public.current_profile_role()='teacher' and exists(select 1 from public.teacher_students ts where ts.teacher_id=auth.uid() and ts.student_id=profiles.id)));
drop policy if exists "read relevant teacher student links" on public.teacher_students;
create policy "read relevant teacher student links" on public.teacher_students for select to authenticated using(teacher_id=auth.uid() or student_id=auth.uid() or public.current_profile_role()='admin');
drop policy if exists "admins manage teacher student links" on public.teacher_students;
create policy "admins manage teacher student links" on public.teacher_students for all to authenticated using(public.current_profile_role()='admin') with check(public.current_profile_role()='admin');
drop policy if exists "read authorized progress" on public.progress_records;
create policy "read authorized progress" on public.progress_records for select to authenticated using(public.can_view_student(student_id));
drop policy if exists "students insert own progress" on public.progress_records;
create policy "students insert own progress" on public.progress_records for insert to authenticated with check(student_id=auth.uid() and public.current_profile_role()='student');
grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;
grant select on public.progress_records to authenticated;
grant select,insert,update,delete on public.teacher_students to authenticated;

-- La puntuación se calcula en la base de datos; el navegador no puede enviar puntos arbitrarios.
create or replace function public.record_quiz_answer(question_number integer, selected_option integer)
returns void language plpgsql security definer set search_path=public
as $$
declare v_subject text; v_correct integer; v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if public.current_profile_role() <> 'student' then raise exception 'Only students can submit quiz answers'; end if;
  if selected_option < 0 or selected_option > 3 then raise exception 'Invalid answer option'; end if;
  case question_number
    when 1 then v_subject := 'math'; v_correct := 2;
    when 2 then v_subject := 'english'; v_correct := 1;
    when 3 then v_subject := 'science'; v_correct := 1;
    when 4 then v_subject := 'reading'; v_correct := 0;
    when 5 then v_subject := 'math'; v_correct := 2;
    else raise exception 'Invalid question number';
  end case;
  insert into public.progress_records(student_id,subject,activity,score,total,points)
  values(v_uid,v_subject,'Quiz general · pregunta '||question_number,case when selected_option=v_correct then 1 else 0 end,1,case when selected_option=v_correct then 10 else 0 end);
end;
$$;
revoke all on function public.record_quiz_answer(integer,integer) from public, anon;
grant execute on function public.record_quiz_answer(integer,integer) to authenticated;
-- Tras registrar y confirmar tu cuenta, copia el UUID desde Authentication > Users.
-- Primer administrador (solo una cuenta que controles): update public.profiles set role='admin' where id='UUID_ADMIN';
-- Promover profesor: update public.profiles set role='teacher' where id='UUID_DOCENTE';
-- Vincular estudiante al profesor: insert into public.teacher_students(teacher_id,student_id) values('UUID_DOCENTE','UUID_ESTUDIANTE');

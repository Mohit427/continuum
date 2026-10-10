-- Continuum: Continuity of Care Passport
-- Run once in Supabase SQL editor (or `supabase db push`).

create extension if not exists pgcrypto;

-- ───────────────────────── Profiles & roles ─────────────────────────
do $$ begin
  create type user_role as enum ('patient', 'doctor', 'lab');
exception when duplicate_object then null; end $$;

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  role user_role not null,
  full_name text not null,
  email text,
  dob date,
  sex text,
  blood_group text,
  phone text,
  health_id text unique,
  emergency_contact jsonb,            -- {name, relation, phone}
  specialty text,                     -- doctor
  registration_no text,               -- doctor / lab accreditation
  organization text,                  -- doctor clinic / lab name
  verified boolean not null default false,
  emergency_settings jsonb not null default '{"break_glass": true}'::jsonb,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Clinical record ─────────────────────────
create table if not exists providers (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references profiles on delete cascade,
  name text not null,
  normalized_name text not null,
  specialty text,
  facility text,
  doctor_profile_id uuid references profiles on delete set null,
  created_at timestamptz not null default now(),
  unique (patient_id, normalized_name)
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references profiles on delete cascade,
  storage_path text not null,
  file_name text,
  sha256 text not null,
  mime text not null,
  doc_type text check (doc_type in ('prescription','lab_report','discharge_summary','imaging_report','other')),
  status text not null default 'processing'
    check (status in ('uploaded','processing','needs_review','confirmed','failed','pending_patient')),
  extracted_json jsonb,
  overall_confidence real,
  name_on_doc text,
  name_mismatch boolean not null default false,
  duplicate_of uuid references documents on delete set null,
  doc_date date,
  provider_id uuid references providers on delete set null,
  facility text,
  error text,
  uploaded_by uuid references profiles on delete set null,
  source text not null default 'patient' check (source in ('patient','lab','doctor','seed')),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (patient_id, sha256)
);

create table if not exists encounters (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references profiles on delete cascade,
  date date not null,
  provider_id uuid references providers on delete set null,
  document_id uuid references documents on delete cascade,
  kind text not null default 'consultation',   -- consultation | lab | admission | note
  complaints text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists conditions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references profiles on delete cascade,
  name text not null,
  icd10 text,
  status text not null default 'active' check (status in ('active','resolved')),
  onset_date date,
  provider_id uuid references providers on delete set null,
  source_document_id uuid references documents on delete cascade,
  confidence real,
  created_at timestamptz not null default now()
);

create table if not exists medications (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references profiles on delete cascade,
  raw_name text not null,
  generic text,
  drug_class text,
  atc text,
  strength text,
  dose text,
  frequency text,
  route text,
  duration_days int,
  start_date date,
  end_date date,
  status text not null default 'active' check (status in ('active','stopped')),
  prescriber_id uuid references providers on delete set null,
  source_document_id uuid references documents on delete cascade,
  confidence real,
  verified_by uuid references profiles on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists allergies (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references profiles on delete cascade,
  substance text not null,
  allergen_class text,
  reaction text,
  severity text default 'moderate' check (severity in ('mild','moderate','severe','life-threatening')),
  source_document_id uuid references documents on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists lab_results (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references profiles on delete cascade,
  test_name text not null,
  test_key text,                       -- canonical key from loinc_map (e.g. hba1c)
  loinc text,
  category text not null default 'lab' check (category in ('lab','vital')),
  value numeric,
  value_text text,
  unit text,
  ref_low numeric,
  ref_high numeric,
  flag text,                           -- H | L | N
  taken_at date not null,
  provider_id uuid references providers on delete set null,
  source_document_id uuid references documents on delete cascade,
  confidence real,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Blind Spot alerts ─────────────────────────
create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references profiles on delete cascade,
  type text not null,
  severity text not null check (severity in ('info','review','high')),
  title text not null,
  body text not null,
  evidence jsonb not null default '[]'::jsonb,
  meta jsonb,
  cross_provider boolean not null default false,
  rule_id text,
  ref text,
  fingerprint text not null,
  status text not null default 'open' check (status in ('open','acknowledged','dismissed','resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (patient_id, fingerprint)
);

-- ───────────────────────── Consent & sharing ─────────────────────────
create table if not exists access_requests (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references profiles on delete cascade,
  patient_id uuid not null references profiles on delete cascade,
  requested_scope jsonb not null,
  purpose text not null,
  duration_hours int not null default 24,
  status text not null default 'pending' check (status in ('pending','approved','denied','cancelled')),
  grant_id uuid,
  responded_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists grants (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references profiles on delete cascade,
  kind text not null check (kind in ('doctor','link','emergency','caregiver','break_glass')),
  grantee_id uuid references profiles on delete cascade,
  label text,
  token_hash text unique,
  token_enc text,                     -- AES-GCM encrypted token so the patient can re-display their QR
  scope jsonb not null,               -- {categories: [...], lens: 'cardiology', date_from: '2025-01-01'}
  purpose text not null,
  expires_at timestamptz,             -- null = no expiry (emergency card)
  revoked_at timestamptz,
  created_from_request uuid references access_requests on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists access_logs (
  id bigint generated always as identity primary key,
  patient_id uuid not null references profiles on delete cascade,
  grant_id uuid references grants on delete set null,
  actor_id uuid references profiles on delete set null,
  actor_label text not null,
  action text not null,
  detail text,
  ip text,
  user_agent text,
  at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists doctor_notes (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references profiles on delete cascade,
  doctor_id uuid not null references profiles on delete cascade,
  grant_id uuid references grants on delete set null,
  note text not null,
  new_prescriptions jsonb not null default '[]'::jsonb,
  encounter_id uuid references encounters on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists test_checks (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references profiles on delete cascade,
  doctor_id uuid references profiles on delete set null,
  test_key text not null,
  reused boolean not null,
  saved_inr int not null default 0,
  at timestamptz not null default now()
);

create table if not exists summaries (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references profiles on delete cascade,
  cache_key text not null,
  content jsonb not null,
  created_at timestamptz not null default now(),
  unique (patient_id, cache_key)
);

-- Columns added after the first version (safe to re-run the whole file).
alter table alerts add column if not exists meta jsonb;
alter table grants add column if not exists token_enc text;

create index if not exists idx_meds_patient on medications(patient_id);
create index if not exists idx_labs_patient on lab_results(patient_id, test_key, taken_at);
create index if not exists idx_alerts_patient on alerts(patient_id, status);
create index if not exists idx_grants_grantee on grants(grantee_id) where revoked_at is null;
create index if not exists idx_logs_patient on access_logs(patient_id, at desc);
create index if not exists idx_notif_user on notifications(user_id, created_at desc);

-- ───────────────────────── Access gate ─────────────────────────
-- True when the caller is the patient, or holds an active, unexpired, unrevoked
-- grant from that patient whose scope covers the category.
create or replace function public.can_read(p_patient uuid, p_category text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select p_patient = auth.uid()
      or exists (
        select 1 from grants g
        where g.patient_id = p_patient
          and g.grantee_id = auth.uid()
          and g.revoked_at is null
          and (g.expires_at is null or g.expires_at > now())
          and (g.scope->'categories' ? p_category or g.scope->'categories' ? 'all')
      );
$$;

-- ───────────────────────── Row Level Security ─────────────────────────
alter table profiles enable row level security;
alter table providers enable row level security;
alter table documents enable row level security;
alter table encounters enable row level security;
alter table conditions enable row level security;
alter table medications enable row level security;
alter table allergies enable row level security;
alter table lab_results enable row level security;
alter table alerts enable row level security;
alter table access_requests enable row level security;
alter table grants enable row level security;
alter table access_logs enable row level security;
alter table notifications enable row level security;
alter table doctor_notes enable row level security;
alter table test_checks enable row level security;
alter table summaries enable row level security;

-- profiles: self; doctors with an active grant can read the patient's profile;
-- patients can read profiles of doctors who requested / hold grants.
drop policy if exists profiles_self on profiles;
create policy profiles_self on profiles for select using (
  id = auth.uid()
  or public.can_read(id, 'profile')
  or exists (select 1 from grants g where g.patient_id = id and g.grantee_id = auth.uid() and g.revoked_at is null and (g.expires_at is null or g.expires_at > now()))
  or exists (select 1 from access_requests r where r.doctor_id = profiles.id and r.patient_id = auth.uid())
  or exists (select 1 from grants g where g.grantee_id = profiles.id and g.patient_id = auth.uid())
);
drop policy if exists profiles_update_self on profiles;
create policy profiles_update_self on profiles for update using (id = auth.uid());

-- Clinical tables: read via can_read; patient owns writes.
do $$
declare t text; c text;
begin
  for t, c in select * from (values
    ('providers','all'), ('documents','documents'), ('encounters','encounters'),
    ('conditions','conditions'), ('medications','medications'), ('allergies','allergies'),
    ('lab_results','labs'), ('alerts','alerts')
  ) as v(t, c) loop
    execute format('drop policy if exists %1$s_read on %1$s', t);
    execute format('create policy %1$s_read on %1$s for select using (public.can_read(patient_id, %2$L))', t, c);
    execute format('drop policy if exists %1$s_owner_write on %1$s', t);
    execute format('create policy %1$s_owner_write on %1$s for all using (patient_id = auth.uid()) with check (patient_id = auth.uid())', t);
  end loop;
end $$;

-- Provider names (who prescribed / ordered what) are needed to read any category.
drop policy if exists providers_any_grant on providers;
create policy providers_any_grant on providers for select using (
  exists (select 1 from grants g where g.patient_id = providers.patient_id and g.grantee_id = auth.uid()
          and g.revoked_at is null and (g.expires_at is null or g.expires_at > now()))
);

-- Allergies are always visible to any active grantee (safety-critical).
drop policy if exists allergies_any_grant on allergies;
create policy allergies_any_grant on allergies for select using (
  exists (select 1 from grants g where g.patient_id = allergies.patient_id and g.grantee_id = auth.uid()
          and g.revoked_at is null and (g.expires_at is null or g.expires_at > now()))
);

drop policy if exists req_read on access_requests;
create policy req_read on access_requests for select using (doctor_id = auth.uid() or patient_id = auth.uid());

drop policy if exists grants_read on grants;
create policy grants_read on grants for select using (patient_id = auth.uid() or grantee_id = auth.uid());

-- Audit log: patients read their own; nobody updates or deletes (no policies for it).
drop policy if exists logs_read on access_logs;
create policy logs_read on access_logs for select using (patient_id = auth.uid());

drop policy if exists notif_rw on notifications;
create policy notif_rw on notifications for select using (user_id = auth.uid());
drop policy if exists notif_update on notifications;
create policy notif_update on notifications for update using (user_id = auth.uid());

drop policy if exists notes_read on doctor_notes;
create policy notes_read on doctor_notes for select using (doctor_id = auth.uid() or public.can_read(patient_id, 'encounters'));

drop policy if exists checks_read on test_checks;
create policy checks_read on test_checks for select using (doctor_id = auth.uid() or patient_id = auth.uid());

-- summaries: server only (service role).

-- ───────────────────────── Realtime ─────────────────────────
do $$ begin
  alter publication supabase_realtime add table notifications, access_requests, grants, alerts, documents;
exception when duplicate_object then null; end $$;

-- ───────────────────────── Storage ─────────────────────────
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;
-- No storage policies: all object access goes through server-issued signed URLs.

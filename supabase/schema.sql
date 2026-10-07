-- ============================================================
-- HealthVault AI — Supabase Schema 
-- ============================================================

-- Enabling UUID generation 
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------
-- 1. users
-- ------------------------------------------------------------
create table users (
  user_id       uuid primary key default uuid_generate_v4(),
  name          text not null,
  email         text not null unique,
  phone         text,
  date_of_birth date,
  gender        text,
  blood_group   text,
  created_at    timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2. health_profiles (kept separate from users so it can grow
--    without touching core identity fields; 1:1 with users)
-- ------------------------------------------------------------
create table health_profiles (
  profile_id     uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references users(user_id) on delete cascade,
  height_cm      numeric,
  weight_kg      numeric,
  known_allergies text,
  chronic_conditions text,
  emergency_contact_name text,
  emergency_contact_phone text,
  updated_at     timestamptz not null default now(),
  unique (user_id)
);

-- ------------------------------------------------------------
-- 3. medical_reports
-- ------------------------------------------------------------
create table medical_reports (
  report_id      uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references users(user_id) on delete cascade,
  report_type    text,               -- e.g. "Blood Test"
  report_date    date,
  file_url       text,               -- Supabase Storage public/signed URL
  ocr_raw_text   text,               -- raw OCR output, kept for audit/debug
  ai_summary     text,               -- plain-language summary
  important_findings jsonb,          -- array of strings
  follow_up      jsonb,              -- array of strings
  uncertain_information jsonb,       -- array of strings
  status         text not null default 'processing', -- processing | completed | failed
  created_at     timestamptz not null default now()
);

create index idx_medical_reports_user on medical_reports(user_id);
create index idx_medical_reports_date on medical_reports(report_date);

-- ------------------------------------------------------------
-- 4. health_parameters (one row per extracted parameter per report)
-- ------------------------------------------------------------
create table health_parameters (
  parameter_id     uuid primary key default uuid_generate_v4(),
  report_id        uuid not null references medical_reports(report_id) on delete cascade,
  user_id          uuid not null references users(user_id) on delete cascade,
  name             text not null,      -- e.g. "Hemoglobin"
  value            numeric,
  unit             text,
  reference_range  text,
  status           text,               -- normal | high | low | unknown
  measured_date    date,
  created_at       timestamptz not null default now()
);

create index idx_health_parameters_user_name on health_parameters(user_id, name);
create index idx_health_parameters_report on health_parameters(report_id);

-- ------------------------------------------------------------
-- 5. medications
-- ------------------------------------------------------------
create table medications (
  medication_id  uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references users(user_id) on delete cascade,
  medicine_name  text not null,
  dosage         text,
  frequency      text,          -- e.g. "Twice daily"
  reminder_time  time,          -- local time of day to send reminder
  start_date     date,
  end_date       date,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now()
);

create index idx_medications_user on medications(user_id);
create index idx_medications_active_time on medications(is_active, reminder_time);

-- ------------------------------------------------------------
-- 6. appointments
-- ------------------------------------------------------------
create table appointments (
  appointment_id uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references users(user_id) on delete cascade,
  doctor_name    text,
  hospital       text,
  appointment_date date not null,
  appointment_time  time not null,
  purpose        text,
  notes          text,
  status         text not null default 'upcoming', -- upcoming | completed | cancelled
  created_at     timestamptz not null default now()
);

create index idx_appointments_user on appointments(user_id);
create index idx_appointments_datetime on appointments(appointment_date, appointment_time);

-- ------------------------------------------------------------
-- 7. doctor_reviews
-- ------------------------------------------------------------
create table doctor_reviews (
  review_id     uuid primary key default uuid_generate_v4(),
  report_id     uuid not null references medical_reports(report_id) on delete cascade,
  doctor_name   text not null,
  review        text not null,
  created_at    timestamptz not null default now()
);

create index idx_doctor_reviews_report on doctor_reviews(report_id);

-- ------------------------------------------------------------
-- 8. notifications (log of reminders sent, to prevent duplicates)
-- ------------------------------------------------------------
create table notifications (
  notification_id uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references users(user_id) on delete cascade,
  type            text not null,   -- "medication_reminder" | "appointment_reminder"
  reference_id    uuid not null,   -- medication_id or appointment_id
  sent_for_date   date not null,   -- the calendar date this reminder covers (dedup key)
  sent_at         timestamptz not null default now(),
  unique (type, reference_id, sent_for_date)
);

create index idx_notifications_user on notifications(user_id);



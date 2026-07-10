create table if not exists hf_cases (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  input jsonb not null,
  engine_output jsonb not null,
  narrative text,
  clinician_notes text
);

alter table hf_cases enable row level security;

-- Adjust this policy to your auth model. This permissive policy is only
-- appropriate if the app itself is access-controlled (e.g. behind auth
-- middleware) and the service role key is used server-side only.
create policy "service role full access" on hf_cases
  for all
  using (true)
  with check (true);

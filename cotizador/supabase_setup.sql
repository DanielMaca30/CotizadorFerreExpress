-- ============================================================
--  FerreExpress · Cotizador — Esquema de sincronización en la nube
--  Ejecuta TODO este archivo en Supabase → SQL Editor → New query → Run
-- ============================================================

-- 1) Cotizaciones (una fila por cotización, contenido completo en `data`)
create table if not exists public.cotizaciones (
  id         text primary key,
  org        text not null default 'ferreexpress',
  numero     text,
  updated_at timestamptz not null default now(),
  data       jsonb not null
);
create index if not exists cotizaciones_org_idx on public.cotizaciones (org, updated_at desc);

-- 2) Configuración compartida (empresa, productos frecuentes, etc.)
create table if not exists public.config (
  org        text not null default 'ferreexpress',
  key        text not null,
  value      jsonb,
  updated_at timestamptz not null default now(),
  primary key (org, key)
);

-- 3) Contador para numeración consecutiva y sin choques entre PCs
create table if not exists public.counters (
  org text primary key,
  n   integer not null default 31   -- el primer número asignado será 32 → COT-032
);

-- 3b) Papelera: IDs de cotizaciones borradas (para que el borrado se propague
--      entre PCs sin riesgo de resucitar ni de perder datos)
create table if not exists public.borrados (
  org text not null default 'ferreexpress',
  id  text not null,
  at  timestamptz not null default now(),
  primary key (org, id)
);

-- 4) Función atómica: entrega el siguiente número de forma segura
create or replace function public.next_cotizacion_numero(p_org text)
returns integer
language plpgsql
as $$
declare v integer;
begin
  insert into public.counters(org, n) values (p_org, 31)
    on conflict (org) do nothing;
  update public.counters set n = n + 1 where org = p_org returning n into v;
  return v;
end;
$$;

-- 4b) Asegura que el contador no quede por debajo de los números que ya existían
--     (evita repetir COT-XXX al migrar cotizaciones viejas del PC a la nube)
create or replace function public.ensure_cotizacion_counter(p_org text, p_min integer)
returns integer
language plpgsql
as $$
declare v integer;
begin
  insert into public.counters(org, n) values (p_org, greatest(p_min, 31))
    on conflict (org) do update set n = greatest(public.counters.n, p_min);
  select n into v from public.counters where org = p_org;
  return v;
end;
$$;

-- ============================================================
--  Seguridad (RLS)
--  Espacio de trabajo compartido por una sola empresa. La clave anónima
--  (anon) queda con acceso de lectura/escritura a estas tablas.
--  Para el uso interno de la ferretería es suficiente; si en el futuro
--  quieres control por usuario, se agrega Supabase Auth y políticas por rol.
-- ============================================================
alter table public.cotizaciones enable row level security;
alter table public.config       enable row level security;
alter table public.counters     enable row level security;
alter table public.borrados     enable row level security;

drop policy if exists cot_all    on public.cotizaciones;
drop policy if exists config_all on public.config;
drop policy if exists count_all  on public.counters;
drop policy if exists borr_all   on public.borrados;

create policy cot_all    on public.cotizaciones for all
  to anon, authenticated using (true) with check (true);
create policy config_all on public.config       for all
  to anon, authenticated using (true) with check (true);
create policy count_all  on public.counters     for all
  to anon, authenticated using (true) with check (true);
create policy borr_all   on public.borrados     for all
  to anon, authenticated using (true) with check (true);

-- Permitir ejecutar las funciones con la clave anónima
grant execute on function public.next_cotizacion_numero(text) to anon, authenticated;
grant execute on function public.ensure_cotizacion_counter(text, integer) to anon, authenticated;

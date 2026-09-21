create table if not exists public.user_profile_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null default '',
  email text not null default '',
  idade smallint check (idade is null or idade between 13 and 120),
  genero text not null default '',
  telefone text not null default '',
  uso_principal text not null default 'Cidade',
  passageiros text not null default '3 ou 4',
  rodagem_mensal text not null default '',
  orcamento text not null default '',
  prioridades jsonb not null default '[]'::jsonb,
  compartilha_com_concessionaria boolean not null default false,
  recorded_at timestamptz not null default now()
);

create index if not exists user_profile_history_user_recorded_idx
  on public.user_profile_history (user_id, recorded_at desc);

alter table public.user_profile_history enable row level security;

drop policy if exists "Users can read their own profile history" on public.user_profile_history;
create policy "Users can read their own profile history"
  on public.user_profile_history for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own profile history" on public.user_profile_history;
create policy "Users can insert their own profile history"
  on public.user_profile_history for insert
  with check (auth.uid() = user_id);

insert into public.user_profile_history (
  user_id, nome, email, idade, genero, telefone, uso_principal,
  passageiros, rodagem_mensal, orcamento, prioridades,
  compartilha_com_concessionaria, recorded_at
)
select
  p.id, p.nome, p.email, p.idade, p.genero, p.telefone, p.uso_principal,
  p.passageiros, p.rodagem_mensal, p.orcamento, p.prioridades,
  p.compartilha_com_concessionaria, coalesce(p.created_at, now())
from public.profiles p
where not exists (
  select 1
  from public.user_profile_history h
  where h.user_id = p.id
);

create table if not exists public.user_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, vehicle_id)
);

alter table public.user_favorites enable row level security;

drop policy if exists "Users can read their own favorites" on public.user_favorites;
create policy "Users can read their own favorites"
  on public.user_favorites for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own favorites" on public.user_favorites;
create policy "Users can insert their own favorites"
  on public.user_favorites for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own favorites" on public.user_favorites;
create policy "Users can delete their own favorites"
  on public.user_favorites for delete
  using (auth.uid() = user_id);

create table if not exists public.vehicle_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id text not null,
  vehicle_name text not null default '',
  event_type text not null check (event_type in ('view', 'favorite', 'unfavorite', 'compare', 'click', 'contact')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists vehicle_events_user_created_idx
  on public.vehicle_events (user_id, created_at desc);
create index if not exists vehicle_events_vehicle_event_idx
  on public.vehicle_events (vehicle_id, event_type, created_at desc);

alter table public.vehicle_events enable row level security;

drop policy if exists "Users can read their own vehicle events" on public.vehicle_events;
create policy "Users can read their own vehicle events"
  on public.vehicle_events for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own vehicle events" on public.vehicle_events;
create policy "Users can insert their own vehicle events"
  on public.vehicle_events for insert
  with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  perfil_id uuid;
begin
  insert into public.profiles (id, nome, email, idade, genero)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', ''),
    coalesce(new.email, ''),
    nullif(new.raw_user_meta_data ->> 'idade', '')::smallint,
    coalesce(new.raw_user_meta_data ->> 'genero', '')
  )
  on conflict (id) do update set
    nome = excluded.nome,
    email = excluded.email,
    idade = excluded.idade,
    genero = excluded.genero,
    updated_at = now()
  returning id into perfil_id;

  insert into public.user_profile_history (user_id, nome, email, idade, genero)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', ''),
    coalesce(new.email, ''),
    nullif(new.raw_user_meta_data ->> 'idade', '')::smallint,
    coalesce(new.raw_user_meta_data ->> 'genero', '')
  );
  return new;
end;
$$;

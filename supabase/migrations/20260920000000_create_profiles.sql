create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
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
  carros_favoritos jsonb not null default '[]'::jsonb,
  carros_comparados jsonb not null default '[]'::jsonb,
  compartilha_com_concessionaria boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
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
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

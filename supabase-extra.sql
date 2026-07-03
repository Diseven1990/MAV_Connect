-- Marketing Update V3.3 | Supabase
-- A tabela principal continua a ser public.noticias.
-- Estas tabelas são apenas para estatísticas e reações.

create table if not exists public.visualizacoes (
  id uuid primary key default gen_random_uuid(),
  conteudo_id uuid not null,
  device_id text not null,
  created_at timestamptz default now()
);

create table if not exists public.reacoes (
  id uuid primary key default gen_random_uuid(),
  conteudo_id uuid not null,
  device_id text not null,
  created_at timestamptz default now()
);

alter table public.visualizacoes enable row level security;
alter table public.reacoes enable row level security;

drop policy if exists "Ler visualizacoes" on public.visualizacoes;
create policy "Ler visualizacoes"
on public.visualizacoes
for select
to anon
using (true);

drop policy if exists "Inserir visualizacoes" on public.visualizacoes;
create policy "Inserir visualizacoes"
on public.visualizacoes
for insert
to anon
with check (true);

drop policy if exists "Ler reacoes" on public.reacoes;
create policy "Ler reacoes"
on public.reacoes
for select
to anon
using (true);

drop policy if exists "Inserir reacoes" on public.reacoes;
create policy "Inserir reacoes"
on public.reacoes
for insert
to anon
with check (true);

create unique index if not exists reacoes_unicas
on public.reacoes (conteudo_id, device_id);

create index if not exists visualizacoes_conteudo_id_idx
on public.visualizacoes (conteudo_id);

create index if not exists reacoes_conteudo_id_idx
on public.reacoes (conteudo_id);

-- Memora initial schema: decks, cards (with SRS state) and review history.

create type public.study_level as enum ('high_school', 'university', 'professional');
create type public.card_kind as enum ('basic', 'mcq');
create type public.review_rating as enum ('again', 'hard', 'good', 'easy');

create table public.decks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade default auth.uid(),
  title       text not null check (char_length(title) between 1 and 200),
  subject     text,
  level       public.study_level not null default 'university',
  exam_date   date,
  created_at  timestamptz not null default now()
);

create table public.cards (
  id            uuid primary key default gen_random_uuid(),
  deck_id       uuid not null references public.decks (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade default auth.uid(),
  kind          public.card_kind not null default 'basic',
  front         text not null,
  back          text not null,
  -- For multiple-choice cards: wrong answers shown alongside `back`.
  distractors   text[] not null default '{}',
  -- Passage from the student's notes the card was generated from.
  source_quote  text,
  -- Spaced-repetition state (see src/lib/srs.ts).
  ease          real not null default 2.5,
  interval_days integer not null default 0,
  repetitions   integer not null default 0,
  lapses        integer not null default 0,
  due_at        timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

create index cards_deck_due_idx on public.cards (deck_id, due_at);
create index cards_user_due_idx on public.cards (user_id, due_at);

create table public.reviews (
  id           uuid primary key default gen_random_uuid(),
  card_id      uuid not null references public.cards (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade default auth.uid(),
  rating       public.review_rating not null,
  reviewed_at  timestamptz not null default now()
);

create index reviews_user_time_idx on public.reviews (user_id, reviewed_at desc);

-- Row-level security: every user sees only their own rows.
alter table public.decks   enable row level security;
alter table public.cards   enable row level security;
alter table public.reviews enable row level security;

create policy "own decks" on public.decks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own cards" on public.cards
  for all using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.decks d where d.id = deck_id and d.user_id = auth.uid())
  );

create policy "own reviews" on public.reviews
  for all using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.cards c where c.id = card_id and c.user_id = auth.uid())
  );

-- Deck list with counts, used by the home screen.
create view public.deck_stats with (security_invoker = true) as
select
  d.*,
  count(c.id)::int                                        as card_count,
  count(c.id) filter (where c.due_at <= now())::int       as due_count,
  count(c.id) filter (where c.repetitions = 0)::int       as new_count
from public.decks d
left join public.cards c on c.deck_id = d.id
group by d.id;

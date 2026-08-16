-- ─────────── enums ───────────
CREATE TYPE public.attendance_status AS ENUM ('ATTEND','LATE','MAYBE','ABSENT','NONE');
CREATE TYPE public.score_source AS ENUM ('MANUAL','GESTURE','AI');
CREATE TYPE public.match_status AS ENUM ('LIVE','DONE');
CREATE TYPE public.match_side AS ENUM ('A','B');
CREATE TYPE public.finance_kind AS ENUM ('INCOME','EXPENSE');
CREATE TYPE public.payment_method AS ENUM ('BANK_TRANSFER','CARD');
CREATE TYPE public.payment_status AS ENUM ('PENDING','PAID','CANCELLED','REFUNDED','FAILED');
CREATE TYPE public.payment_provider AS ENUM ('DEMO_BANK','TOSS');
CREATE TYPE public.booking_status AS ENUM ('BOOKED','CANCELLED','COMPLETED');
CREATE TYPE public.video_status AS ENUM ('UPLOADING','READY','FAILED');

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  invite_code TEXT NOT NULL UNIQUE,
  emoji TEXT NOT NULL DEFAULT '🏸',
  court_count INT NOT NULL DEFAULT 2,
  default_target INT NOT NULL DEFAULT 21,
  session_label TEXT NOT NULL DEFAULT '정기 운동',
  session_time TEXT NOT NULL DEFAULT '19:00 - 22:00',
  lessons_enabled BOOLEAN NOT NULL DEFAULT true,
  monthly_dues INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clubs TO authenticated;
GRANT ALL ON public.clubs TO service_role;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.club_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  name TEXT NOT NULL,
  level SMALLINT NOT NULL DEFAULT 3 CHECK (level BETWEEN 1 AND 5),
  gender TEXT NOT NULL DEFAULT 'M' CHECK (gender IN ('M','F')),
  is_guest BOOLEAN NOT NULL DEFAULT false,
  invited_by UUID REFERENCES public.club_members(id) ON DELETE SET NULL,
  games INT NOT NULL DEFAULT 0,
  wins INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX club_members_club_idx ON public.club_members(club_id);
CREATE UNIQUE INDEX club_members_user_unique ON public.club_members(club_id, user_id) WHERE user_id IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_members TO authenticated;
GRANT ALL ON public.club_members TO service_role;
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_club_member(_club_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.club_members m
    WHERE m.club_id = _club_id AND m.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.clubs c
    WHERE c.id = _club_id AND c.owner_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.is_club_owner(_club_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clubs c
    WHERE c.id = _club_id AND c.owner_id = auth.uid()
  )
$$;

CREATE POLICY "members can view club" ON public.clubs FOR SELECT TO authenticated
  USING (public.is_club_member(id));
CREATE POLICY "create own club" ON public.clubs FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owner updates club" ON public.clubs FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owner deletes club" ON public.clubs FOR DELETE TO authenticated
  USING (owner_id = auth.uid());
CREATE TRIGGER clubs_updated_at BEFORE UPDATE ON public.clubs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "members view roster" ON public.club_members FOR SELECT TO authenticated
  USING (public.is_club_member(club_id));
CREATE POLICY "join as self or owner adds" ON public.club_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_club_owner(club_id));
CREATE POLICY "update roster" ON public.club_members FOR UPDATE TO authenticated
  USING (public.is_club_member(club_id)) WITH CHECK (public.is_club_member(club_id));
CREATE POLICY "delete roster" ON public.club_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_club_owner(club_id));
CREATE TRIGGER club_members_updated_at BEFORE UPDATE ON public.club_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.club_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'mint',
  permissions TEXT[] NOT NULL DEFAULT '{}',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX club_roles_club_idx ON public.club_roles(club_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_roles TO authenticated;
GRANT ALL ON public.club_roles TO service_role;
ALTER TABLE public.club_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view roles" ON public.club_roles FOR SELECT TO authenticated
  USING (public.is_club_member(club_id));
CREATE POLICY "owner manages roles" ON public.club_roles FOR ALL TO authenticated
  USING (public.is_club_owner(club_id)) WITH CHECK (public.is_club_owner(club_id));
CREATE TRIGGER club_roles_updated_at BEFORE UPDATE ON public.club_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.member_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.club_members(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.club_roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (member_id, role_id)
);
CREATE INDEX member_roles_club_idx ON public.member_roles(club_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_roles TO authenticated;
GRANT ALL ON public.member_roles TO service_role;
ALTER TABLE public.member_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view assignments" ON public.member_roles FOR SELECT TO authenticated
  USING (public.is_club_member(club_id));
CREATE POLICY "owner manages assignments" ON public.member_roles FOR ALL TO authenticated
  USING (public.is_club_owner(club_id)) WITH CHECK (public.is_club_owner(club_id));

CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.club_members(id) ON DELETE CASCADE,
  session_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul')::date,
  status public.attendance_status NOT NULL DEFAULT 'NONE',
  checked_in BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (member_id, session_date)
);
CREATE INDEX attendance_club_date_idx ON public.attendance(club_id, session_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "club scoped attendance" ON public.attendance FOR ALL TO authenticated
  USING (public.is_club_member(club_id)) WITH CHECK (public.is_club_member(club_id));
CREATE TRIGGER attendance_updated_at BEFORE UPDATE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.queue_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.club_members(id) ON DELETE CASCADE,
  since TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (club_id, member_id)
);
CREATE INDEX queue_entries_club_idx ON public.queue_entries(club_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.queue_entries TO authenticated;
GRANT ALL ON public.queue_entries TO service_role;
ALTER TABLE public.queue_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "club scoped queue" ON public.queue_entries FOR ALL TO authenticated
  USING (public.is_club_member(club_id)) WITH CHECK (public.is_club_member(club_id));

CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  court_index INT NOT NULL,
  team_a UUID[] NOT NULL DEFAULT '{}',
  team_b UUID[] NOT NULL DEFAULT '{}',
  target INT NOT NULL DEFAULT 21,
  score_a INT NOT NULL DEFAULT 0,
  score_b INT NOT NULL DEFAULT 0,
  status public.match_status NOT NULL DEFAULT 'LIVE',
  winner public.match_side,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX matches_club_idx ON public.matches(club_id, started_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.matches TO authenticated;
GRANT ALL ON public.matches TO service_role;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "club scoped matches" ON public.matches FOR ALL TO authenticated
  USING (public.is_club_member(club_id)) WITH CHECK (public.is_club_member(club_id));
CREATE TRIGGER matches_updated_at BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.score_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  side public.match_side NOT NULL,
  source public.score_source NOT NULL DEFAULT 'MANUAL',
  confidence REAL,
  confirmed BOOLEAN NOT NULL DEFAULT true,
  corrected BOOLEAN NOT NULL DEFAULT false,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX score_events_match_idx ON public.score_events(match_id, occurred_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.score_events TO authenticated;
GRANT ALL ON public.score_events TO service_role;
ALTER TABLE public.score_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "club scoped score events" ON public.score_events FOR ALL TO authenticated
  USING (public.is_club_member(club_id)) WITH CHECK (public.is_club_member(club_id));

CREATE TABLE public.finance_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  kind public.finance_kind NOT NULL,
  label TEXT NOT NULL,
  amount INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX finance_entries_club_idx ON public.finance_entries(club_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_entries TO authenticated;
GRANT ALL ON public.finance_entries TO service_role;
ALTER TABLE public.finance_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view finance" ON public.finance_entries FOR SELECT TO authenticated
  USING (public.is_club_member(club_id));
CREATE POLICY "owner manages finance" ON public.finance_entries FOR ALL TO authenticated
  USING (public.is_club_owner(club_id)) WITH CHECK (public.is_club_owner(club_id));
CREATE TRIGGER finance_entries_updated_at BEFORE UPDATE ON public.finance_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.coaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  specialties TEXT[] NOT NULL DEFAULT '{}',
  level_label TEXT NOT NULL DEFAULT '',
  intro TEXT NOT NULL DEFAULT '',
  duration_min INT NOT NULL DEFAULT 60,
  price INT NOT NULL DEFAULT 30000,
  weekdays SMALLINT[] NOT NULL DEFAULT '{}',
  start_hour INT NOT NULL DEFAULT 19,
  end_hour INT NOT NULL DEFAULT 22,
  settlement_account TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX coaches_club_idx ON public.coaches(club_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coaches TO authenticated;
GRANT ALL ON public.coaches TO service_role;
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view coaches" ON public.coaches FOR SELECT TO authenticated
  USING (public.is_club_member(club_id));
CREATE POLICY "owner manages coaches" ON public.coaches FOR ALL TO authenticated
  USING (public.is_club_owner(club_id)) WITH CHECK (public.is_club_owner(club_id));
CREATE TRIGGER coaches_updated_at BEFORE UPDATE ON public.coaches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.lesson_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.club_members(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  price INT NOT NULL,
  status public.booking_status NOT NULL DEFAULT 'BOOKED',
  payment_method public.payment_method NOT NULL DEFAULT 'BANK_TRANSFER',
  payment_status public.payment_status NOT NULL DEFAULT 'PENDING',
  provider public.payment_provider NOT NULL DEFAULT 'DEMO_BANK',
  transaction_ref TEXT,
  order_id TEXT UNIQUE,
  payment_key TEXT,
  depositor_name TEXT,
  failure_code TEXT,
  failure_message TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX lesson_bookings_club_idx ON public.lesson_bookings(club_id, start_at);
CREATE UNIQUE INDEX lesson_bookings_no_double ON public.lesson_bookings(coach_id, start_at)
  WHERE status <> 'CANCELLED';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_bookings TO authenticated;
GRANT ALL ON public.lesson_bookings TO service_role;
ALTER TABLE public.lesson_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "club scoped bookings" ON public.lesson_bookings FOR ALL TO authenticated
  USING (public.is_club_member(club_id)) WITH CHECK (public.is_club_member(club_id));
CREATE TRIGGER lesson_bookings_updated_at BEFORE UPDATE ON public.lesson_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES public.lesson_bookings(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  method public.payment_method NOT NULL,
  status public.payment_status NOT NULL DEFAULT 'PENDING',
  provider public.payment_provider NOT NULL DEFAULT 'DEMO_BANK',
  transaction_ref TEXT NOT NULL DEFAULT '',
  order_id TEXT,
  payment_key TEXT,
  depositor_name TEXT,
  failure_code TEXT,
  failure_message TEXT,
  receipt_url TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX payments_club_idx ON public.payments(club_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "club scoped payments" ON public.payments FOR ALL TO authenticated
  USING (public.is_club_member(club_id)) WITH CHECK (public.is_club_member(club_id));
CREATE TRIGGER payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.match_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  uploaded_by UUID REFERENCES auth.users ON DELETE SET NULL,
  storage_path TEXT NOT NULL,
  duration_sec INT,
  size_bytes BIGINT,
  status public.video_status NOT NULL DEFAULT 'UPLOADING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX match_videos_club_idx ON public.match_videos(club_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_videos TO authenticated;
GRANT ALL ON public.match_videos TO service_role;
ALTER TABLE public.match_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "club scoped videos" ON public.match_videos FOR ALL TO authenticated
  USING (public.is_club_member(club_id)) WITH CHECK (public.is_club_member(club_id));
CREATE TRIGGER match_videos_updated_at BEFORE UPDATE ON public.match_videos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();;

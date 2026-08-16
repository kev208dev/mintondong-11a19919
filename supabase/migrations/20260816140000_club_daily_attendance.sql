-- 날짜별 출석 응답. 운동 일정/session과 독립적으로 하루에 한 건만 저장한다.
CREATE TABLE IF NOT EXISTS public.club_daily_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ATTENDING', 'NOT_ATTENDING', 'UNDECIDED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (club_id, user_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS club_daily_attendance_date_idx
  ON public.club_daily_attendance (club_id, attendance_date);
CREATE INDEX IF NOT EXISTS club_daily_attendance_user_idx
  ON public.club_daily_attendance (user_id, attendance_date DESC);

GRANT SELECT, INSERT, UPDATE ON public.club_daily_attendance TO authenticated;
GRANT ALL ON public.club_daily_attendance TO service_role;
ALTER TABLE public.club_daily_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members view daily attendance"
  ON public.club_daily_attendance FOR SELECT TO authenticated
  USING (public.is_club_member(club_id));

CREATE POLICY "members write own daily attendance"
  ON public.club_daily_attendance FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_club_member(club_id));

CREATE POLICY "members update own daily attendance"
  ON public.club_daily_attendance FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_club_owner(club_id))
  WITH CHECK (user_id = auth.uid() OR public.is_club_owner(club_id));

CREATE TRIGGER club_daily_attendance_updated_at
  BEFORE UPDATE ON public.club_daily_attendance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

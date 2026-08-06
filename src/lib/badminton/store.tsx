import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { applyPoint, autoAssign, uid, undoPoint } from "./engine";
import {
  ALL_PERMISSIONS,
  defaultRolePresets,
  normalizeRoleName,
  unionPermissions,
  type PermissionKey,
  type RoleDefinition,
} from "./permissions";
import { DEMO_INVITE, SEED_STATE } from "./seed";
import type {
  AppState,
  AttendanceStatus,
  ClubState,
  Coach,
  FinanceEntry,
  LessonBooking,
  Level,
  Match,
  Payment,
  PaymentMethod,
  ScoreSource,
} from "./types";

const STORAGE_KEY = "badminton-club-state-v2";

export interface BookingDraftInput {
  coachId: string;
  startAt: number;
  method: PaymentMethod;
  depositorName?: string;
}

export interface RoleDraft {
  name: string;
  description?: string;
  color?: string;
  permissions: PermissionKey[];
}


interface Ctx {
  state: AppState;
  club: ClubState;
  clubs: ClubState[];
  switchClub: (id: string) => void;
  setAttendance: (memberId: string, status: AttendanceStatus) => void;
  toggleCheckIn: (memberId: string) => void;
  addGuest: (name: string, level: Level) => void;
  removeGuest: (id: string) => void;
  setCourtCount: (n: number) => void;
  setDefaultTarget: (n: number) => void;
  enqueue: (id: string) => void;
  dequeue: (id: string) => void;
  startMatch: (courtIndex: number, target?: number) => string | null;
  addPoint: (matchId: string, side: "A" | "B", source?: ScoreSource) => void;
  undo: (matchId: string) => void;
  finishMatch: (matchId: string) => void;
  cancelMatch: (matchId: string) => void;
  createClub: (name: string, location: string) => string;
  joinClub: (code: string) => { ok: boolean; message: string };
  leaveClub: (id: string) => void;
  renameClub: (name: string, location: string) => void;
  /** 레슨 (클럽 단위) */
  setLessonsEnabled: (on: boolean) => void;
  updateCoach: (coachId: string, patch: Partial<Coach>) => void;
  bookLesson: (input: BookingDraftInput) => LessonBooking;
  cancelBooking: (bookingId: string) => void;
  /** 토스 결제창을 열기 전에 슬롯을 선점하는 대기(PENDING) 예약 */
  createPendingCardBooking: (input: {
    coachId: string;
    startAt: number;
    orderId: string;
  }) => LessonBooking;
  attachOrderToken: (clubId: string, bookingId: string, orderToken: string) => void;
  findBooking: (bookingId: string) => { clubId: string; booking: LessonBooking } | null;
  markBookingPaid: (
    clubId: string,
    bookingId: string,
    info: { paymentKey: string; orderId: string; receiptUrl: string | null },
  ) => void;
  failBooking: (
    clubId: string,
    bookingId: string,
    info: { code: string; message: string },
  ) => void;
  refundBooking: (clubId: string, bookingId: string) => void;
  /* ─────── 역할 · 권한 (클럽 단위) ─────── */
  /** 현재 클럽에서 내 멤버 id */
  meMemberId: string;
  isOwner: boolean;
  myPermissions: PermissionKey[];
  can: (permission: PermissionKey) => boolean;
  hasAnyPermission: (permissions: PermissionKey[]) => boolean;
  getEffectivePermissions: (memberId: string, clubId?: string) => PermissionKey[];
  getMemberRoles: (memberId: string, clubId?: string) => RoleDefinition[];
  /** 보호된 소유자 여부: 소유자의 역할 배정은 변경할 수 없다. */
  isProtectedOwner: (memberId: string, clubId?: string) => boolean;
  createRole: (draft: RoleDraft) => { ok: boolean; message: string };
  updateRole: (roleId: string, draft: Partial<RoleDraft>) => { ok: boolean; message: string };
  duplicateRole: (roleId: string) => { ok: boolean; message: string };
  deleteRole: (roleId: string) => { ok: boolean; message: string };
  setMemberRoles: (memberId: string, roleIds: string[]) => { ok: boolean; message: string };
  /* ─────── 자금 · 회비 (데모) ─────── */
  setMonthlyDues: (amount: number) => void;
  addFinanceEntry: (entry: Omit<FinanceEntry, "id" | "createdAt">) => void;
  removeFinanceEntry: (id: string) => void;
}

const StoreContext = createContext<Ctx | null>(null);

/** 저장된 상태에 레슨 필드가 없을 수 있어(구버전) 기본값으로 보정한다. */
function normalize(state: AppState): AppState {
  const clubs: Record<string, ClubState> = {};
  for (const [id, c] of Object.entries(state.clubs ?? {})) {
    const seeded = SEED_STATE.clubs[id];
    clubs[id] = {
      ...c,
      lessonsEnabled: c.lessonsEnabled ?? Boolean(seeded),
      coaches: c.coaches ?? seeded?.coaches ?? [],
      // 구버전 localStorage 호환: provider/토스 필드 기본값 보정
      bookings: (c.bookings ?? []).map((b) => ({
        ...b,
        provider: b.provider ?? "DEMO_BANK",
        orderId: b.orderId ?? null,
        paymentKey: b.paymentKey ?? null,
        orderToken: b.orderToken ?? null,
        failureCode: b.failureCode ?? null,
        failureMessage: b.failureMessage ?? null,
      })),
      payments: (c.payments ?? []).map((p) => ({
        ...p,
        provider: p.provider ?? "DEMO_BANK",
        orderId: p.orderId ?? null,
        paymentKey: p.paymentKey ?? null,
        failureCode: p.failureCode ?? null,
        failureMessage: p.failureMessage ?? null,
        receiptUrl: p.receiptUrl ?? null,
      })),
      /* 역할·권한 마이그레이션 (구버전 localStorage 호환)
       * 기존 데이터(출석/경기/레슨/예약/기록)는 절대 초기화하지 않는다.
       * 역할 정의가 없으면 프리셋을 주입하고, 소유자는 역할과 무관하게 전권을 갖는다. */
      roles: normalizeRoles(id, c.roles?.length ? c.roles : (seeded?.roles ?? defaultRolePresets(id))),
      memberRoles: migrateMemberRoles(id, c, seeded),
      finance: c.finance ?? seeded?.finance ?? { monthlyDues: 0, entries: [] },
    };
  }
  // 클럽이 하나도 없거나 순서/현재 클럽이 깨진 경우 스타터 상태로 안전하게 복구한다.
  const ids = Object.keys(clubs);
  if (ids.length === 0) return SEED_STATE;
  const order = (state.clubOrder ?? []).filter((id) => clubs[id]);
  for (const id of ids) if (!order.includes(id)) order.push(id);
  const currentClubId = clubs[state.currentClubId] ? state.currentClubId : order[0]!;
  const meId = state.meId ?? SEED_STATE.meId;
  return { ...state, clubs, clubOrder: order, currentClubId, meId };
}

/** 구버전/손상된 역할 데이터는 유효한 권한만 남기되 사용자 정의 내용은 보존한다. */
function normalizeRoles(clubId: string, roles: RoleDefinition[]): RoleDefinition[] {
  const valid = new Set<PermissionKey>(ALL_PERMISSIONS);
  const seen = new Set<string>();
  return roles.map((role, index) => {
    let id = role.id || `${clubId}-role-migrated-${index}`;
    while (seen.has(id)) id = `${id}-${index}`;
    seen.add(id);
    return {
      ...role,
      id,
      name: role.name?.trim() || `역할 ${index + 1}`,
      permissions: Array.from(new Set((role.permissions ?? []).filter((p) => valid.has(p)))),
      createdAt: role.createdAt ?? Date.now(),
    };
  });
}

/** 역할 배정이 없던 클럽의 멤버는 기본 '회원' 역할로 채운다. */
function migrateMemberRoles(
  clubId: string,
  c: ClubState,
  seeded: ClubState | undefined,
): Record<string, string[]> {
  const existing = c.memberRoles ?? seeded?.memberRoles ?? {};
  const roles = c.roles?.length ? c.roles : (seeded?.roles ?? defaultRolePresets(clubId));
  const fallback =
    roles.find((r) => r.id === `${clubId}-role-member`)?.id ?? roles[roles.length - 1]?.id;
  const next: Record<string, string[]> = { ...existing };
  for (const m of c.members ?? []) {
    const valid = (next[m.id] ?? []).filter((rid) => roles.some((r) => r.id === rid));
    next[m.id] = valid.length ? valid : fallback ? [fallback] : [];
  }
  return next;
}

function loadState(): AppState {
  if (typeof window === "undefined") return SEED_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return normalize(JSON.parse(raw) as AppState);
  } catch {
    /* ignore */
  }
  return SEED_STATE;
}


export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(SEED_STATE);

  useEffect(() => {
    setState(loadState());
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  const value = useMemo<Ctx>(() => {
    const patch = (clubId: string, fn: (c: ClubState) => ClubState) =>
      setState((prev) => {
        const target = prev.clubs[clubId];
        if (!target) return prev;
        return { ...prev, clubs: { ...prev.clubs, [clubId]: fn(target) } };
      });

    const current = () => state.clubs[state.currentClubId]!;
    const patchCurrent = (fn: (c: ClubState) => ClubState) => patch(state.currentClubId, fn);

    const club = current();

    const liveMatch = (c: ClubState, matchId: string) =>
      c.matches.find((m) => m.id === matchId);

    /* ─────────── 권한 계산 (클럽 단위) ───────────
     * NOTE(보안): 아래 검사는 프로토타입 UX 보호용이다. 백엔드/인증을 붙이는 순간
     * 같은 규칙을 서버 함수와 DB RLS에서 반드시 다시 검증해야 한다. */
    const clubOf = (clubId?: string) => (clubId ? state.clubs[clubId] : club);

    const memberIdIn = (c: ClubState) =>
      c.members.some((m) => m.id === state.meId) ? state.meId : `${c.club.id}-m0`;

    const getMemberRoles = (memberId: string, clubId?: string): RoleDefinition[] => {
      const c = clubOf(clubId);
      if (!c) return [];
      const ids = c.memberRoles[memberId] ?? [];
      return c.roles.filter((r) => ids.includes(r.id));
    };

    const getEffectivePermissions = (memberId: string, clubId?: string): PermissionKey[] => {
      const c = clubOf(clubId);
      if (!c) return [];
      // 소유자는 역할 설정과 무관하게 항상 전권 (클럽이 스스로 잠기는 상황 방지)
      if (c.club.ownedByMe && memberId === memberIdIn(c)) return ALL_PERMISSIONS;
      return unionPermissions(getMemberRoles(memberId, clubId));
    };

    /** 클럽 소유자 본인은 역할과 무관하게 전권을 갖는 보호된 슈퍼관리자다. */
    const isProtectedOwner = (memberId: string, clubId?: string) => {
      const c = clubOf(clubId);
      if (!c) return false;
      return Boolean(c.club.ownedByMe) && memberId === memberIdIn(c);
    };

    const meMemberId = memberIdIn(club);
    const isOwner = club.club.ownedByMe;
    const myPermissions = getEffectivePermissions(meMemberId);
    const can = (p: PermissionKey) => isOwner || myPermissions.includes(p);
    const hasAnyPermission = (ps: PermissionKey[]) => ps.some(can);

    /** 권한 없는 변경은 토스트로 거부한다 (숨김만으로 끝내지 않음). */
    const guard = (p: PermissionKey, action: () => void, message?: string) => {
      if (!can(p)) {
        toast.error(message ?? "이 작업을 수행할 권한이 없어요.");
        return;
      }
      action();
    };

    const nameTaken = (c: ClubState, name: string, exceptId?: string) =>
      c.roles.some(
        (r) => r.id !== exceptId && normalizeRoleName(r.name) === normalizeRoleName(name),
      );


    return {
      state,
      club,
      clubs: state.clubOrder.map((id) => state.clubs[id]!).filter(Boolean),
      switchClub: (id) => setState((p) => ({ ...p, currentClubId: id })),
      // 본인 출석/체크인은 항상 허용, 타인 대리 변경은 권한 필요
      setAttendance: (memberId, status) => {
        if (memberId !== meMemberId && !can("MANAGE_ATTENDANCE")) {
          toast.error("다른 멤버의 참석 상태를 변경할 권한이 없어요.");
          return;
        }
        patchCurrent((c) => ({
          ...c,
          attendance: { ...c.attendance, [memberId]: status },
        }));
      },
      toggleCheckIn: (memberId) => {
        if (memberId !== meMemberId && !can("CHECKIN_OTHERS")) {
          toast.error("다른 멤버를 대리 체크인할 권한이 없어요.");
          return;
        }
        patchCurrent((c) => {
          const isIn = c.checkedIn.includes(memberId);
          return {
            ...c,
            checkedIn: isIn ? c.checkedIn.filter((i) => i !== memberId) : [...c.checkedIn, memberId],
            queue: isIn
              ? c.queue.filter((q) => q.id !== memberId)
              : c.queue.some((q) => q.id === memberId)
                ? c.queue
                : [...c.queue, { id: memberId, since: Date.now() }],
            stats: c.stats[memberId] ? c.stats : { ...c.stats, [memberId]: { games: 0, wins: 0 } },
          };
        });
      },
      addGuest: (name, level) =>
        guard(
          "MANAGE_MEMBERS",
          () =>
            patchCurrent((c) => {
              const id = `${c.club.id}-g${uid()}`;
              return {
                ...c,
                guests: [...c.guests, { id, name, level, gender: "M", isGuest: true }],
                attendance: { ...c.attendance, [id]: "ATTEND" },
                checkedIn: [...c.checkedIn, id],
                queue: [...c.queue, { id, since: Date.now() }],
                stats: { ...c.stats, [id]: { games: 0, wins: 0 } },
              };
            }),
          "게스트를 추가할 권한이 없어요.",
        ),
      removeGuest: (id) =>
        guard(
          "MANAGE_MEMBERS",
          () =>
            patchCurrent((c) => ({
              ...c,
              guests: c.guests.filter((g) => g.id !== id),
              checkedIn: c.checkedIn.filter((i) => i !== id),
              queue: c.queue.filter((q) => q.id !== id),
            })),
          "게스트를 삭제할 권한이 없어요.",
        ),
      setCourtCount: (n) =>
        guard(
          "MANAGE_COURTS",
          () => patchCurrent((c) => ({ ...c, courtCount: Math.max(1, Math.min(12, n)) })),
          "코트 수를 변경할 권한이 없어요.",
        ),
      setDefaultTarget: (n) =>
        guard(
          "MANAGE_COURTS",
          () => patchCurrent((c) => ({ ...c, defaultTarget: n })),
          "기본 점수제를 변경할 권한이 없어요.",
        ),
      enqueue: (id) => {
        if (id !== meMemberId && !can("MANAGE_COURTS")) {
          toast.error("대기열을 변경할 권한이 없어요.");
          return;
        }
        patchCurrent((c) =>
          c.queue.some((q) => q.id === id)
            ? c
            : { ...c, queue: [...c.queue, { id, since: Date.now() }] },
        );
      },
      dequeue: (id) => {
        if (id !== meMemberId && !can("MANAGE_COURTS")) {
          toast.error("대기열을 변경할 권한이 없어요.");
          return;
        }
        patchCurrent((c) => ({ ...c, queue: c.queue.filter((q) => q.id !== id) }));
      },
      startMatch: (courtIndex, target) => {
        if (!can("CREATE_MATCHES")) {
          toast.error("경기를 배정할 권한이 없어요.");
          return null;
        }
        const c = current();
        const assignment = autoAssign(c);
        if (!assignment) return null;
        const id = uid();
        const match: Match = {
          id,
          courtIndex,
          teamA: assignment.teamA,
          teamB: assignment.teamB,
          target: target ?? c.defaultTarget,
          scoreA: 0,
          scoreB: 0,
          events: [],
          status: "LIVE",
          startedAt: Date.now(),
          endedAt: null,
          winner: null,
        };
        const playing = [...assignment.teamA, ...assignment.teamB];
        patchCurrent((cur) => ({
          ...cur,
          matches: [match, ...cur.matches],
          queue: cur.queue.filter((q) => !playing.includes(q.id)),
        }));
        return id;
      },
      addPoint: (matchId, side, source = "MANUAL") =>
        guard(
          "EDIT_SCORES",
          () =>
            patchCurrent((c) => ({
              ...c,
              matches: c.matches.map((m) => (m.id === matchId ? applyPoint(m, side, source) : m)),
            })),
          "점수를 입력할 권한이 없어요.",
        ),
      undo: (matchId) =>
        guard(
          "EDIT_SCORES",
          () =>
            patchCurrent((c) => ({
              ...c,
              matches: c.matches.map((m) => (m.id === matchId ? undoPoint(m) : m)),
            })),
          "점수를 수정할 권한이 없어요.",
        ),
      finishMatch: (matchId) => {
        if (!can("FINISH_MATCHES")) {
          toast.error("경기를 종료할 권한이 없어요.");
          return;
        }
        patchCurrent((c) => {
          const m = liveMatch(c, matchId);
          if (!m) return c;
          const winner = m.winner ?? (m.scoreA >= m.scoreB ? "A" : "B");
          const winners = winner === "A" ? m.teamA : m.teamB;
          const all = [...m.teamA, ...m.teamB];
          const stats = { ...c.stats };
          for (const id of all) {
            const prev = stats[id] ?? { games: 0, wins: 0 };
            stats[id] = {
              games: prev.games + 1,
              wins: prev.wins + (winners.includes(id) ? 1 : 0),
            };
          }
          const back = all.filter((id) => c.checkedIn.includes(id));
          return {
            ...c,
            stats,
            matches: c.matches.map((x) =>
              x.id === matchId ? { ...x, status: "DONE", winner, endedAt: Date.now() } : x,
            ),
            queue: [
              ...c.queue.filter((q) => !all.includes(q.id)),
              ...back.map((id) => ({ id, since: Date.now() })),
            ],
          };
        });
      },
      cancelMatch: (matchId) => {
        if (!can("CREATE_MATCHES")) {
          toast.error("경기를 취소할 권한이 없어요.");
          return;
        }
        patchCurrent((c) => {
          const m = liveMatch(c, matchId);
          if (!m) return c;
          const all = [...m.teamA, ...m.teamB].filter((id) => c.checkedIn.includes(id));
          return {
            ...c,
            matches: c.matches.filter((x) => x.id !== matchId),
            queue: [
              ...c.queue.filter((q) => !all.includes(q.id)),
              ...all.map((id) => ({ id, since: Date.now() })),
            ],
          };
        });
      },
      createClub: (name, location) => {
        const id = `club-${uid()}`;
        const code = `${name.replace(/\s/g, "").slice(0, 3).toUpperCase() || "CLB"}${Math.floor(
          Math.random() * 90 + 10,
        )}`;
        const fresh: ClubState = {
          club: { id, name, location, inviteCode: code, ownedByMe: true, emoji: "🏸" },
          members: [{ id: `${id}-m0`, name: "나 (개설자)", level: 3, gender: "M" }],
          guests: [],
          attendance: { [`${id}-m0`]: "ATTEND" },
          checkedIn: [`${id}-m0`],
          courtCount: 2,
          queue: [{ id: `${id}-m0`, since: Date.now() }],
          matches: [],
          stats: { [`${id}-m0`]: { games: 0, wins: 0 } },
          defaultTarget: 21,
          sessionLabel: "첫 운동 일정",
          sessionTime: "19:00 – 21:00",
          lessonsEnabled: false,
          coaches: [],
          bookings: [],
          payments: [],
          // 새 클럽은 편집 가능한 기본 역할 프리셋으로 시작하고, 개설자는 회장 역할 + 소유자 전권
          roles: defaultRolePresets(id),
          memberRoles: { [`${id}-m0`]: [`${id}-role-president`] },
          finance: { monthlyDues: 0, entries: [] },
        };
        setState((p) => ({
          ...p,
          clubs: { ...p.clubs, [id]: fresh },
          clubOrder: [...p.clubOrder, id],
          currentClubId: id,
        }));
        return code;
      },
      joinClub: (code) => {
        const upper = code.trim().toUpperCase();
        const seedId = DEMO_INVITE[upper];
        if (seedId) {
          if (state.clubs[seedId]) {
            setState((p) => ({
              ...p,
              clubOrder: p.clubOrder.includes(seedId) ? p.clubOrder : [...p.clubOrder, seedId],
              currentClubId: seedId,
            }));
            return { ok: true, message: "이미 가입된 클럽으로 이동했어요." };
          }
          const seedClub = SEED_STATE.clubs[seedId]!;
          setState((p) => ({
            ...p,
            clubs: { ...p.clubs, [seedId]: seedClub },
            clubOrder: [...p.clubOrder, seedId],
            currentClubId: seedId,
          }));
          return { ok: true, message: `${seedClub.club.name}에 가입했어요.` };
        }
        const found = Object.values(state.clubs).find((c) => c.club.inviteCode === upper);
        if (found) {
          setState((p) => ({ ...p, currentClubId: found.club.id }));
          return { ok: true, message: "이미 가입된 클럽이에요." };
        }
        return { ok: false, message: "초대 코드를 찾을 수 없어요. (데모: RALLY26)" };
      },
      leaveClub: (id) =>
        setState((p) => {
          const target = p.clubs[id];
          if (!target || target.club.ownedByMe) return p;
          const order = p.clubOrder.filter((x) => x !== id);
          const clubs = { ...p.clubs };
          delete clubs[id];
          return {
            ...p,
            clubs,
            clubOrder: order,
            currentClubId: p.currentClubId === id ? (order[0] ?? "") : p.currentClubId,
          };
        }),
      renameClub: (name, location) =>
        guard(
          "MANAGE_CLUB_SETTINGS",
          () => patchCurrent((c) => ({ ...c, club: { ...c.club, name, location } })),
          "클럽 설정을 변경할 권한이 없어요.",
        ),

      setLessonsEnabled: (on) =>
        guard(
          "MANAGE_LESSONS",
          () => patchCurrent((c) => ({ ...c, lessonsEnabled: on })),
          "레슨 운영을 변경할 권한이 없어요.",
        ),
      updateCoach: (coachId, p) =>
        guard(
          "MANAGE_COACHES",
          () =>
            patchCurrent((c) => ({
              ...c,
              coaches: c.coaches.map((co) => (co.id === coachId ? { ...co, ...p } : co)),
            })),
          "코치 정보를 변경할 권한이 없어요.",
        ),
      /**
       * 데모 결제 예약 생성.
       * NOTE(향후 실결제 연동 지점): 지금은 클라이언트에서 즉시 상태를 확정하지만,
       * 실제로는 서버가 PG 결제요청을 만들고 → PG webhook/조회로 승인 여부를 검증한 뒤
       * paymentStatus를 PAID로 전환해야 한다. 카드 정보는 절대 여기로 들어오지 않는다.
       */
      bookLesson: ({ coachId, startAt, method, depositorName }) => {
        const c = current();
        const coach = c.coaches.find((x) => x.id === coachId);
        if (!coach) throw new Error("코치를 찾을 수 없어요.");
        const endAt = startAt + coach.durationMin * 60_000;
        const occupied = c.bookings.some(
          (booking) =>
            booking.coachId === coachId &&
            booking.status === "BOOKED" &&
            startAt < booking.endAt &&
            endAt > booking.startAt,
        );
        if (occupied) throw new Error("이미 예약된 시간이에요.");
        const bookingId = `bk-${uid()}`;
        const txRef = `DEMO-${uid().toUpperCase()}`;
        const paid = method === "CARD";
        const at = Date.now();
        const booking: LessonBooking = {
          bookingId,
          clubId: c.club.id,
          coachId,
          memberId: state.meId,
          startAt,
          endAt,
          price: coach.price,
          status: "BOOKED",
          paymentMethod: method,
          paymentStatus: paid ? "PAID" : "PENDING",
          transactionRef: txRef,
          paidAt: paid ? at : null,
          depositorName: depositorName ?? null,
          createdAt: at,
          provider: "DEMO_BANK",
          orderId: null,
          paymentKey: null,
          orderToken: null,
          failureCode: null,
          failureMessage: null,
        };
        const payment: Payment = {
          id: `pay-${uid()}`,
          bookingId,
          clubId: c.club.id,
          amount: coach.price,
          method,
          status: paid ? "PAID" : "PENDING",
          transactionRef: txRef,
          depositorName: depositorName ?? null,
          createdAt: at,
          paidAt: paid ? at : null,
          provider: "DEMO_BANK",
          orderId: null,
          paymentKey: null,
          failureCode: null,
          failureMessage: null,
          receiptUrl: null,
        };
        patchCurrent((cur) => ({
          ...cur,
          bookings: [booking, ...cur.bookings],
          payments: [payment, ...cur.payments],
        }));
        return booking;
      },
      /** 취소는 기록을 삭제하지 않고 상태만 전이시킨다(감사 추적 유지). */
      cancelBooking: (bookingId) =>
        patchCurrent((c) => {
          const b = c.bookings.find((x) => x.bookingId === bookingId);
          if (!b || b.status !== "BOOKED") return c;
          if (b.memberId !== state.meId && !can("MANAGE_LESSON_BOOKINGS")) {
            toast.error("다른 멤버의 예약을 취소할 권한이 없어요.");
            return c;
          }
          const nextPay = b.paymentStatus === "PAID" ? "REFUNDED" : "CANCELLED";
          return {
            ...c,
            bookings: c.bookings.map((x) =>
              x.bookingId === bookingId
                ? { ...x, status: "CANCELLED", paymentStatus: nextPay }
                : x,
            ),
            payments: c.payments.map((p) =>
              p.bookingId === bookingId ? { ...p, status: nextPay } : p,
            ),
          };
        }),
      /* ─────── 토스페이먼츠(테스트) 결제 라이프사이클 ───────
       * NOTE(프로덕션): 예약/주문은 서버 DB에 저장하고 DB를 진실의 원천으로 삼아야 한다.
       * 지금은 프로토타입이라 로컬 상태 + 서버 HMAC 주문 토큰으로 무결성을 보장한다.
       */
      createPendingCardBooking: ({ coachId, startAt, orderId }) => {
        const c = current();
        const coach = c.coaches.find((x) => x.id === coachId);
        if (!coach) throw new Error("코치를 찾을 수 없어요.");
        const endAt = startAt + coach.durationMin * 60_000;
        const occupied = c.bookings.some(
          (booking) =>
            booking.coachId === coachId &&
            booking.status === "BOOKED" &&
            startAt < booking.endAt &&
            endAt > booking.startAt,
        );
        if (occupied) throw new Error("이미 예약된 시간이에요.");
        const at = Date.now();
        const bookingId = `bk-${uid()}`;
        const booking: LessonBooking = {
          bookingId,
          clubId: c.club.id,
          coachId,
          memberId: state.meId,
          startAt,
          endAt,
          price: coach.price,
          // 결제창을 여는 즉시 슬롯을 선점해 중복 예약을 막는다.
          status: "BOOKED",
          paymentMethod: "CARD",
          paymentStatus: "PENDING",
          transactionRef: null,
          paidAt: null,
          depositorName: null,
          createdAt: at,
          provider: "TOSS",
          orderId,
          paymentKey: null,
          orderToken: null,
          failureCode: null,
          failureMessage: null,
        };
        const payment: Payment = {
          id: `pay-${uid()}`,
          bookingId,
          clubId: c.club.id,
          amount: coach.price,
          method: "CARD",
          status: "PENDING",
          transactionRef: orderId,
          depositorName: null,
          createdAt: at,
          paidAt: null,
          provider: "TOSS",
          orderId,
          paymentKey: null,
          failureCode: null,
          failureMessage: null,
          receiptUrl: null,
        };
        patchCurrent((cur) => ({
          ...cur,
          bookings: [booking, ...cur.bookings],
          payments: [payment, ...cur.payments],
        }));
        return booking;
      },
      attachOrderToken: (clubId, bookingId, orderToken) =>
        patch(clubId, (c) => ({
          ...c,
          bookings: c.bookings.map((b) =>
            b.bookingId === bookingId ? { ...b, orderToken } : b,
          ),
        })),
      findBooking: (bookingId) => {
        for (const [clubId, c] of Object.entries(state.clubs)) {
          const booking = c.bookings.find((b) => b.bookingId === bookingId);
          if (booking) return { clubId, booking };
        }
        return null;
      },
      markBookingPaid: (clubId, bookingId, info) =>
        patch(clubId, (c) => {
          const at = Date.now();
          return {
            ...c,
            bookings: c.bookings.map((b) =>
              b.bookingId === bookingId
                ? {
                    ...b,
                    status: "BOOKED" as const,
                    paymentStatus: "PAID" as const,
                    paymentKey: info.paymentKey,
                    orderId: info.orderId,
                    transactionRef: info.paymentKey,
                    paidAt: at,
                    failureCode: null,
                    failureMessage: null,
                  }
                : b,
            ),
            payments: c.payments.map((p) =>
              p.bookingId === bookingId
                ? {
                    ...p,
                    status: "PAID" as const,
                    paymentKey: info.paymentKey,
                    orderId: info.orderId,
                    transactionRef: info.paymentKey,
                    receiptUrl: info.receiptUrl,
                    paidAt: at,
                  }
                : p,
            ),
          };
        }),
      /** 결제 실패/취소: 슬롯은 풀어주고 결제 기록은 남긴다(삭제하지 않음). */
      failBooking: (clubId, bookingId, info) =>
        patch(clubId, (c) => ({
          ...c,
          bookings: c.bookings.map((b) =>
            b.bookingId === bookingId && b.paymentStatus !== "PAID"
              ? {
                  ...b,
                  status: "CANCELLED" as const,
                  paymentStatus: "FAILED" as const,
                  failureCode: info.code,
                  failureMessage: info.message,
                }
              : b,
          ),
          payments: c.payments.map((p) =>
            p.bookingId === bookingId && p.status !== "PAID"
              ? {
                  ...p,
                  status: "FAILED" as const,
                  failureCode: info.code,
                  failureMessage: info.message,
                }
              : p,
          ),
        })),
      /** 토스 테스트 취소가 성공한 뒤에만 호출한다. */
      refundBooking: (clubId, bookingId) =>
        patch(clubId, (c) => ({
          ...c,
          bookings: c.bookings.map((b) =>
            b.bookingId === bookingId
              ? { ...b, status: "CANCELLED" as const, paymentStatus: "REFUNDED" as const }
              : b,
          ),
          payments: c.payments.map((p) =>
            p.bookingId === bookingId ? { ...p, status: "REFUNDED" as const } : p,
          ),
        })),

      /* ─────────── 역할 · 권한 ───────────
       * NOTE(보안): 프로덕션에서는 아래 모든 검사를 서버 함수 + DB RLS에서 재검증해야 한다. */
      meMemberId,
      isOwner,
      myPermissions,
      can,
      hasAnyPermission,
      getEffectivePermissions,
      getMemberRoles,
      isProtectedOwner,
      createRole: (draft) => {
        if (!can("MANAGE_ROLES")) return { ok: false, message: "역할을 만들 권한이 없어요." };
        const name = draft.name.trim();
        if (!name) return { ok: false, message: "역할 이름을 입력해 주세요." };
        if (nameTaken(club, name)) return { ok: false, message: "같은 이름의 역할이 이미 있어요." };
        // 권한 상승 방지: MANAGE_ROLES는 이미 보유(또는 소유자)한 경우에만 부여 가능
        const permissions = draft.permissions.filter(
          (p) => p !== "MANAGE_ROLES" || isOwner || myPermissions.includes("MANAGE_ROLES"),
        );
        const role: RoleDefinition = {
          id: `${club.club.id}-role-${uid()}`,
          name,
          description: draft.description?.trim() || undefined,
          color: draft.color ?? "slate",
          // 사용자 정의 역할은 선택한 권한만 가진다. 기본 열람 권한은 '회원' 프리셋에만 포함된다.
          permissions: Array.from(new Set(permissions)),
          createdAt: Date.now(),
        };
        patchCurrent((c) => ({ ...c, roles: [...c.roles, role] }));
        return { ok: true, message: `'${name}' 역할을 만들었어요.` };
      },
      updateRole: (roleId, draft) => {
        if (!can("MANAGE_ROLES")) return { ok: false, message: "역할을 수정할 권한이 없어요." };
        const target = club.roles.find((r) => r.id === roleId);
        if (!target) return { ok: false, message: "역할을 찾을 수 없어요." };
        const name = draft.name?.trim() ?? target.name;
        if (!name) return { ok: false, message: "역할 이름을 입력해 주세요." };
        if (nameTaken(club, name, roleId))
          return { ok: false, message: "같은 이름의 역할이 이미 있어요." };
        const permissions = (draft.permissions ?? target.permissions).filter(
          (p) =>
            p !== "MANAGE_ROLES" ||
            isOwner ||
            myPermissions.includes("MANAGE_ROLES") ||
            target.permissions.includes("MANAGE_ROLES"),
        );
        patchCurrent((c) => ({
          ...c,
          roles: c.roles.map((r) =>
            r.id === roleId
              ? {
                  ...r,
                  name,
                  description:
                    draft.description === undefined
                      ? r.description
                      : draft.description.trim() || undefined,
                  color: draft.color ?? r.color,
                  permissions: Array.from(new Set(permissions)),
                }
              : r,
          ),
        }));
        return { ok: true, message: "역할을 저장했어요." };
      },
      duplicateRole: (roleId) => {
        if (!can("MANAGE_ROLES")) return { ok: false, message: "역할을 복제할 권한이 없어요." };
        const target = club.roles.find((r) => r.id === roleId);
        if (!target) return { ok: false, message: "역할을 찾을 수 없어요." };
        let name = `${target.name} 사본`;
        let n = 2;
        while (nameTaken(club, name)) name = `${target.name} 사본 ${n++}`;
        const copy: RoleDefinition = {
          ...target,
          id: `${club.club.id}-role-${uid()}`,
          name,
          isSystem: false,
          createdAt: Date.now(),
        };
        patchCurrent((c) => ({ ...c, roles: [...c.roles, copy] }));
        return { ok: true, message: `'${name}'으로 복제했어요.` };
      },
      deleteRole: (roleId) => {
        if (!can("MANAGE_ROLES")) return { ok: false, message: "역할을 삭제할 권한이 없어요." };
        const target = club.roles.find((r) => r.id === roleId);
        if (!target) return { ok: false, message: "역할을 찾을 수 없어요." };
        // 기본 역할은 이름·권한 수정만 허용하고 삭제는 막아 클럽이 스스로 잠기는 상황을 방지
        if (target.isSystem)
          return { ok: false, message: "기본 역할은 삭제할 수 없어요. 권한만 수정해 주세요." };
        patchCurrent((c) => {
          const memberRoles: Record<string, string[]> = {};
          for (const [mid, ids] of Object.entries(c.memberRoles)) {
            memberRoles[mid] = ids.filter((id) => id !== roleId);
          }
          return { ...c, roles: c.roles.filter((r) => r.id !== roleId), memberRoles };
        });
        return { ok: true, message: `'${target.name}' 역할을 삭제했어요.` };
      },
      setMemberRoles: (memberId, roleIds) => {
        if (!can("ASSIGN_ROLES")) return { ok: false, message: "역할을 부여할 권한이 없어요." };
        if (!club.members.some((member) => member.id === memberId))
          return { ok: false, message: "멤버를 찾을 수 없어요." };
        // 소유자는 강등·권한 회수 대상이 될 수 없다 (클럽 잠김 방지)
        if (isProtectedOwner(memberId))
          return { ok: false, message: "클럽 소유자의 역할은 변경할 수 없어요. 항상 전체 권한을 가져요." };
        const valid = Array.from(
          new Set(roleIds.filter((id) => club.roles.some((r) => r.id === id))),
        );
        const escalates = valid.some((id) =>
          club.roles.find((r) => r.id === id)?.permissions.includes("MANAGE_ROLES"),
        );
        if (escalates && !isOwner && !myPermissions.includes("MANAGE_ROLES"))
          return { ok: false, message: "역할 관리 권한이 포함된 역할은 부여할 수 없어요." };
        patchCurrent((c) => ({
          ...c,
          memberRoles: { ...c.memberRoles, [memberId]: valid },
        }));
        return { ok: true, message: "역할을 변경했어요." };
      },

      /* ─────────── 자금 · 회비 (로컬 데모) ───────────
       * NOTE: 실제 송금·정산 기능은 없다. 금액은 로컬 상태에만 기록된다. */
      setMonthlyDues: (amount) =>
        guard(
          "MANAGE_DUES",
          () =>
            patchCurrent((c) => ({
              ...c,
              finance: { ...c.finance, monthlyDues: Math.max(0, Math.round(amount)) },
            })),
          "회비를 변경할 권한이 없어요.",
        ),
      addFinanceEntry: (entry) =>
        guard(
          "MANAGE_FINANCE",
          () =>
            patchCurrent((c) => ({
              ...c,
              finance: {
                ...c.finance,
                entries: [
                  { ...entry, id: `fin-${uid()}`, createdAt: Date.now() },
                  ...c.finance.entries,
                ],
              },
            })),
          "수입·지출을 등록할 권한이 없어요.",
        ),
      removeFinanceEntry: (id) =>
        guard(
          "MANAGE_FINANCE",
          () =>
            patchCurrent((c) => ({
              ...c,
              finance: { ...c.finance, entries: c.finance.entries.filter((e) => e.id !== id) },
            })),
          "내역을 삭제할 권한이 없어요.",
        ),
    };

  }, [state]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

export function useTodayPlayers() {
  const { club } = useStore();
  const all = [...club.members, ...club.guests];
  const coming = all.filter((m) => {
    const s = club.attendance[m.id];
    return s === "ATTEND" || s === "LATE";
  });
  return {
    all,
    coming,
    checkedIn: all.filter((m) => club.checkedIn.includes(m.id)),
    counts: {
      ATTEND: all.filter((m) => club.attendance[m.id] === "ATTEND").length,
      LATE: all.filter((m) => club.attendance[m.id] === "LATE").length,
      MAYBE: all.filter((m) => club.attendance[m.id] === "MAYBE").length,
      ABSENT: all.filter((m) => club.attendance[m.id] === "ABSENT").length,
      NONE: all.filter((m) => (club.attendance[m.id] ?? "NONE") === "NONE").length,
    },
  };
}

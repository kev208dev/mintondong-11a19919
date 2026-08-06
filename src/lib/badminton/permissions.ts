/* ─────────────── 클럽별 커스텀 역할 · 권한 카탈로그 ───────────────
 * NOTE(보안 경계): 이 프로토타입의 권한 검사는 100% 클라이언트 로컬 상태 기반이다.
 * 실제 서비스에서는 반드시 서버(또는 DB RLS)에서 동일한 권한 규칙을 다시 검증해야 한다.
 * 클라이언트 검사는 UX(숨김/비활성)와 실수 방지용이며 신뢰 경계가 아니다.
 */

export type PermissionKey =
  // GENERAL
  | "VIEW_CLUB"
  | "MANAGE_CLUB_SETTINGS"
  | "MANAGE_ANNOUNCEMENTS"
  // MEMBERS
  | "VIEW_MEMBERS"
  | "INVITE_MEMBERS"
  | "MANAGE_MEMBERS"
  | "ASSIGN_ROLES"
  | "MANAGE_ROLES"
  // ATTENDANCE
  | "VIEW_ATTENDANCE"
  | "MANAGE_ATTENDANCE"
  | "CHECKIN_OTHERS"
  // GAMES
  | "VIEW_GAMES"
  | "MANAGE_COURTS"
  | "CREATE_MATCHES"
  | "EDIT_SCORES"
  | "FINISH_MATCHES"
  // LESSONS
  | "VIEW_LESSONS"
  | "MANAGE_LESSONS"
  | "MANAGE_COACHES"
  | "VIEW_LESSON_BOOKINGS"
  | "MANAGE_LESSON_BOOKINGS"
  // FINANCE
  | "VIEW_FINANCE"
  | "MANAGE_FINANCE"
  | "MANAGE_DUES"
  | "VIEW_PAYMENT_HISTORY"
  | "MANAGE_REFUNDS"
  // SMART COURT
  | "VIEW_SMART_COURT"
  | "MANAGE_SMART_COURT";

export interface PermissionGroup {
  key: string;
  label: string;
  items: { key: PermissionKey; label: string; desc: string }[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    key: "GENERAL",
    label: "일반",
    items: [
      { key: "VIEW_CLUB", label: "클럽 보기", desc: "클럽 화면에 접근" },
      { key: "MANAGE_CLUB_SETTINGS", label: "클럽 설정 관리", desc: "이름·장소·기본 설정 변경" },
      { key: "MANAGE_ANNOUNCEMENTS", label: "공지 관리", desc: "세션 일정·공지 문구 변경" },
    ],
  },
  {
    key: "MEMBERS",
    label: "멤버",
    items: [
      { key: "VIEW_MEMBERS", label: "멤버 보기", desc: "멤버 목록 열람" },
      { key: "INVITE_MEMBERS", label: "초대", desc: "초대 코드 확인·공유" },
      { key: "MANAGE_MEMBERS", label: "멤버 관리", desc: "게스트 추가·삭제, 멤버 정보 변경" },
      { key: "ASSIGN_ROLES", label: "역할 부여", desc: "기존 역할을 멤버에게 지정" },
      { key: "MANAGE_ROLES", label: "역할 정의 관리", desc: "역할 생성·삭제·권한 편집" },
    ],
  },
  {
    key: "ATTENDANCE",
    label: "출석",
    items: [
      { key: "VIEW_ATTENDANCE", label: "출석 보기", desc: "참석 현황 열람" },
      { key: "MANAGE_ATTENDANCE", label: "출석 대리 변경", desc: "다른 멤버 참석 상태 변경" },
      { key: "CHECKIN_OTHERS", label: "대리 체크인", desc: "다른 멤버 현장 체크인" },
    ],
  },
  {
    key: "GAMES",
    label: "경기",
    items: [
      { key: "VIEW_GAMES", label: "경기 보기", desc: "코트·대기열 열람" },
      { key: "MANAGE_COURTS", label: "코트 관리", desc: "코트 수·대기열 조정" },
      { key: "CREATE_MATCHES", label: "경기 배정", desc: "자동 복식 배정·경기 취소" },
      { key: "EDIT_SCORES", label: "점수 입력/수정", desc: "득점·되돌리기" },
      { key: "FINISH_MATCHES", label: "경기 종료", desc: "결과 확정 및 기록 반영" },
    ],
  },
  {
    key: "LESSONS",
    label: "레슨",
    items: [
      { key: "VIEW_LESSONS", label: "레슨 보기", desc: "코치·일정 열람 및 본인 예약" },
      { key: "MANAGE_LESSONS", label: "레슨 운영", desc: "레슨 기능 on/off, 일정 정책" },
      { key: "MANAGE_COACHES", label: "코치 관리", desc: "코치 요금·가능 시간 편집" },
      { key: "VIEW_LESSON_BOOKINGS", label: "예약 현황 보기", desc: "클럽 전체 예약 열람" },
      { key: "MANAGE_LESSON_BOOKINGS", label: "예약 관리", desc: "타인 예약 취소·조정" },
    ],
  },
  {
    key: "FINANCE",
    label: "자금 · 회비",
    items: [
      { key: "VIEW_FINANCE", label: "자금 보기", desc: "잔액·수입지출 열람" },
      { key: "MANAGE_FINANCE", label: "자금 관리", desc: "수입·지출 등록" },
      { key: "MANAGE_DUES", label: "회비 설정", desc: "월 회비 금액 변경" },
      { key: "VIEW_PAYMENT_HISTORY", label: "결제 내역 보기", desc: "레슨 결제 이력 열람" },
      { key: "MANAGE_REFUNDS", label: "환불 처리", desc: "결제 취소·환불 처리" },
    ],
  },
  {
    key: "SMART_COURT",
    label: "스마트 코트",
    items: [
      { key: "VIEW_SMART_COURT", label: "스마트 코트 보기", desc: "자동 채점 로드맵 열람" },
      { key: "MANAGE_SMART_COURT", label: "스마트 코트 설정", desc: "카메라·채점 모드 설정" },
    ],
  },
];

export const ALL_PERMISSIONS: PermissionKey[] = PERMISSION_GROUPS.flatMap((g) =>
  g.items.map((i) => i.key),
);

export const PERMISSION_LABEL: Record<PermissionKey, string> = Object.fromEntries(
  PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => [i.key, i.label])),
) as Record<PermissionKey, string>;

/** 모든 멤버가 기본으로 갖는 열람/자기 자신 관련 권한 */
export const BASE_MEMBER_PERMISSIONS: PermissionKey[] = [
  "VIEW_CLUB",
  "VIEW_MEMBERS",
  "VIEW_ATTENDANCE",
  "VIEW_GAMES",
  "VIEW_LESSONS",
  "VIEW_SMART_COURT",
];

export interface RoleDefinition {
  id: string;
  name: string;
  description?: string | undefined;
  color?: string | undefined;
  icon?: string | undefined;
  permissions: PermissionKey[];
  /** 프리셋으로 제공되는 기본 역할. 이름/권한은 수정 가능하지만 삭제는 제한한다. */
  isSystem?: boolean;
  createdAt: number;
}

export const ROLE_COLORS = [
  "primary",
  "amber",
  "sky",
  "violet",
  "rose",
  "slate",
] as const;

export const ROLE_COLOR_CLASS: Record<string, string> = {
  primary: "bg-primary text-primary-foreground",
  amber: "bg-amber-500 text-white",
  sky: "bg-sky-500 text-white",
  violet: "bg-violet-500 text-white",
  rose: "bg-rose-500 text-white",
  slate: "bg-slate-600 text-white",
};

export function roleBadgeClass(color?: string) {
  return ROLE_COLOR_CLASS[color ?? "slate"] ?? ROLE_COLOR_CLASS["slate"]!;
}

/** 회장: 역할 정의 관리를 제외한 사실상 모든 운영 권한 (소유자만 불변 전권) */
const PRESIDENT_PERMISSIONS: PermissionKey[] = [...ALL_PERMISSIONS];

/** 새 클럽 생성 시 제공되는 편집 가능한 기본 역할 프리셋 */
export function defaultRolePresets(clubId: string, createdAt = Date.now()): RoleDefinition[] {
  const r = (
    slug: string,
    name: string,
    description: string,
    color: string,
    permissions: PermissionKey[],
  ): RoleDefinition => ({
    id: `${clubId}-role-${slug}`,
    name,
    description,
    color,
    permissions: Array.from(new Set([...BASE_MEMBER_PERMISSIONS, ...permissions])),
    isSystem: true,
    createdAt,
  });

  return [
    r("president", "회장", "클럽 운영 전반을 총괄해요.", "primary", PRESIDENT_PERMISSIONS),
    r("treasurer", "총무", "회비와 자금을 관리해요.", "amber", [
      "VIEW_FINANCE",
      "MANAGE_FINANCE",
      "MANAGE_DUES",
      "VIEW_PAYMENT_HISTORY",
      "MANAGE_REFUNDS",
      "VIEW_MEMBERS",
      "VIEW_ATTENDANCE",
      "VIEW_LESSON_BOOKINGS",
    ]),
    r("staff", "운영진", "출석·코트·경기 운영을 담당해요.", "sky", [
      "MANAGE_ATTENDANCE",
      "CHECKIN_OTHERS",
      "MANAGE_MEMBERS",
      "INVITE_MEMBERS",
      "MANAGE_COURTS",
      "CREATE_MATCHES",
      "EDIT_SCORES",
      "FINISH_MATCHES",
      "MANAGE_ANNOUNCEMENTS",
    ]),
    r("coach", "코치", "레슨과 예약을 담당해요.", "violet", [
      "MANAGE_LESSONS",
      "MANAGE_COACHES",
      "VIEW_LESSON_BOOKINGS",
      "MANAGE_LESSON_BOOKINGS",
      "VIEW_MEMBERS",
    ]),
    r("member", "회원", "일반 회원 기본 권한이에요.", "slate", []),
  ];
}

export function normalizeRoleName(name: string) {
  return name.replace(/\s+/g, "").toLowerCase();
}

/** 여러 역할의 권한 합집합 */
export function unionPermissions(roles: RoleDefinition[]): PermissionKey[] {
  const set = new Set<PermissionKey>();
  for (const role of roles) for (const p of role.permissions) set.add(p);
  return Array.from(set);
}

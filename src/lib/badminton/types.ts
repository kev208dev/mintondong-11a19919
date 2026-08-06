import type { RoleDefinition } from "./permissions";

export type { PermissionKey, RoleDefinition } from "./permissions";

export type AttendanceStatus = "ATTEND" | "LATE" | "MAYBE" | "ABSENT" | "NONE";

export type Level = 1 | 2 | 3 | 4 | 5;

export interface Member {
  id: string;
  name: string;
  level: Level;
  gender: "M" | "F";
  isGuest?: boolean;
  invitedBy?: string;
}

export type ScoreSource = "MANUAL" | "GESTURE" | "AI";

export interface ScoreEvent {
  id: string;
  matchId: string;
  side: "A" | "B";
  source: ScoreSource;
  timestamp: number;
  confidence: number | null;
  confirmed: boolean;
  corrected: boolean;
}

export interface Match {
  id: string;
  courtIndex: number;
  teamA: string[];
  teamB: string[];
  target: number;
  scoreA: number;
  scoreB: number;
  events: ScoreEvent[];
  status: "LIVE" | "DONE";
  startedAt: number;
  endedAt: number | null;
  winner: "A" | "B" | null;
}

export interface PlayerStat {
  games: number;
  wins: number;
}

export interface Club {
  id: string;
  name: string;
  location: string;
  inviteCode: string;
  ownedByMe: boolean;
  emoji: string;
}

export interface FinanceEntry {
  id: string;
  kind: "INCOME" | "EXPENSE";
  label: string;
  amount: number;
  createdAt: number;
}

/** 데모 자금/회비 (실제 송금·정산 기능은 없음) */
export interface ClubFinance {
  monthlyDues: number;
  entries: FinanceEntry[];
}

export interface ClubState {
  club: Club;
  members: Member[];
  guests: Member[];
  attendance: Record<string, AttendanceStatus>;
  checkedIn: string[];
  courtCount: number;
  queue: { id: string; since: number }[];
  matches: Match[];
  stats: Record<string, PlayerStat>;
  defaultTarget: number;
  sessionLabel: string;
  sessionTime: string;
  /** 레슨(클럽별로 완전 분리) */
  lessonsEnabled: boolean;
  coaches: Coach[];
  bookings: LessonBooking[];
  payments: Payment[];
  /** 역할·권한 (클럽별로 완전 분리) */
  roles: RoleDefinition[];
  /** memberId → roleId[] (멤버십 메타데이터, 전역 저장 금지) */
  memberRoles: Record<string, string[]>;
  finance: ClubFinance;
}

export interface AppState {
  currentClubId: string;
  clubs: Record<string, ClubState>;
  clubOrder: string[];
  meId: string;
}

export const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = {
  ATTEND: "참석",
  LATE: "늦게 참석",
  MAYBE: "미정",
  ABSENT: "불참",
  NONE: "응답 없음",
};

export const LEVEL_LABEL: Record<Level, string> = {
  1: "입문",
  2: "초급",
  3: "중급",
  4: "상급",
  5: "선수",
};

/* ─────────────── 레슨 예약 · 데모 결제 모델 ───────────────
 * NOTE(결제 통합 경계): 아래 Payment/LessonBooking 모델은 실제 PG 연동을 염두에 둔
 * 형태이지만, 현재 구현은 100% 로컬 "데모 결제"다. 실제 서비스에서는
 *  - 계좌이체/카드 결제는 반드시 라이선스를 가진 PG(결제대행사)를 통해 처리하고
 *  - 결제 승인/입금 확인은 서버에서 검증하고 webhook으로 상태를 갱신하며
 *  - 카드번호 등 카드 자격정보는 절대 클라이언트 상태나 DB에 저장하지 않는다.
 * transactionRef는 향후 PG의 결제 식별자를 담는 자리다.
 */
export type PaymentMethod = "BANK_TRANSFER" | "CARD";
export type PaymentStatus = "PENDING" | "PAID" | "CANCELLED" | "REFUNDED" | "FAILED";
/** DEMO_BANK: 데모 계좌이체 · TOSS: 토스페이먼츠(테스트 모드) */
export type PaymentProvider = "DEMO_BANK" | "TOSS";
export type BookingStatus = "BOOKED" | "CANCELLED" | "COMPLETED";

export interface Coach {
  id: string;
  name: string;
  specialties: string[];
  levelLabel: string;
  intro: string;
  durationMin: number;
  price: number;
  /** 0=일 ... 6=토 */
  weekdays: number[];
  startHour: number;
  endHour: number;
  settlementAccount: string;
}

export interface LessonBooking {
  bookingId: string;
  clubId: string;
  coachId: string;
  memberId: string;
  startAt: number;
  endAt: number;
  price: number;
  status: BookingStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  transactionRef: string | null;
  paidAt: number | null;
  depositorName: string | null;
  createdAt: number;
  /** 결제 수단 제공자 (구버전 상태는 normalize에서 기본값 보정) */
  provider: PaymentProvider;
  orderId: string | null;
  paymentKey: string | null;
  /** 결제창 열기 전 서버가 발급한 주문 무결성 토큰 (프로토타입 한정) */
  orderToken: string | null;
  failureCode: string | null;
  failureMessage: string | null;
}

export interface Payment {
  id: string;
  bookingId: string;
  clubId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionRef: string;
  depositorName: string | null;
  createdAt: number;
  paidAt: number | null;
  provider: PaymentProvider;
  orderId: string | null;
  paymentKey: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  receiptUrl: string | null;
}

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: "결제 확인 대기",
  PAID: "결제 완료",
  CANCELLED: "결제 취소",
  REFUNDED: "환불 완료",
  FAILED: "결제 실패",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  BANK_TRANSFER: "계좌이체",
  CARD: "토스 카드/간편결제 (테스트)",
};

export const WEEKDAY_LABEL = ["일", "월", "화", "수", "목", "금", "토"] as const;

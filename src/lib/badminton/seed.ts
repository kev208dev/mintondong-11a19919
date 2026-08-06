import { defaultRolePresets } from "./permissions";
import type { AppState, ClubState, Coach, FinanceEntry, Level, Member } from "./types";

const now = Date.now();

function member(id: string, name: string, level: Level, gender: "M" | "F"): Member {
  return { id, name, level, gender };
}

function coach(
  clubId: string,
  i: number,
  name: string,
  specialties: string[],
  levelLabel: string,
  intro: string,
  price: number,
  weekdays: number[],
  startHour: number,
  endHour: number,
  settlementAccount: string,
): Coach {
  return {
    id: `${clubId}-c${i}`,
    name,
    specialties,
    levelLabel,
    intro,
    durationMin: 50,
    price,
    weekdays,
    startHour,
    endHour,
    settlementAccount,
  };
}

function buildClub(
  club: ClubState["club"],
  names: [string, Level, "M" | "F"][],
  opts: {
    courtCount: number;
    sessionLabel: string;
    sessionTime: string;
    attend: number;
    late: number;
    maybe: number;
    absent: number;
    checkIn: number;
    /** 멤버 인덱스 → 역할 슬러그 목록 (없으면 회원) */
    roleAssign?: Record<number, string[]>;
    monthlyDues: number;
    finance: [FinanceEntry["kind"], string, number][];
  },
  coaches: Coach[],
): ClubState {
  const members = names.map((n, i) => member(`${club.id}-m${i}`, n[0], n[1], n[2]));
  const attendance: ClubState["attendance"] = {};
  const stats: ClubState["stats"] = {};
  members.forEach((m, i) => {
    if (i < opts.attend) attendance[m.id] = "ATTEND";
    else if (i < opts.attend + opts.late) attendance[m.id] = "LATE";
    else if (i < opts.attend + opts.late + opts.maybe) attendance[m.id] = "MAYBE";
    else if (i < opts.attend + opts.late + opts.maybe + opts.absent) attendance[m.id] = "ABSENT";
    else attendance[m.id] = "NONE";
    stats[m.id] = { games: 0, wins: 0 };
  });
  const checkedIn = members.slice(0, opts.checkIn).map((m) => m.id);
  const roles = defaultRolePresets(club.id, now);
  const memberRoles: Record<string, string[]> = {};
  members.forEach((m, i) => {
    const slugs = opts.roleAssign?.[i] ?? ["member"];
    memberRoles[m.id] = slugs.map((s) => `${club.id}-role-${s}`);
  });
  return {
    club,
    members,
    guests: [],
    attendance,
    checkedIn,
    courtCount: opts.courtCount,
    queue: checkedIn.map((id, i) => ({ id, since: now - (opts.checkIn - i) * 60_000 })),
    matches: [],
    stats,
    defaultTarget: 21,
    sessionLabel: opts.sessionLabel,
    sessionTime: opts.sessionTime,
    lessonsEnabled: true,
    coaches,
    bookings: [],
    payments: [],
    roles,
    memberRoles,
    finance: {
      monthlyDues: opts.monthlyDues,
      entries: opts.finance.map(([kind, label, amount], i) => ({
        id: `${club.id}-fin${i}`,
        kind,
        label,
        amount,
        createdAt: now - (i + 1) * 86_400_000,
      })),
    },
  };
}


const rally = buildClub(
  {
    id: "rally",
    name: "랠리 배드민턴 클럽",
    location: "서울 강남구 대치체육관",
    inviteCode: "RALLY26",
    ownedByMe: true,
    emoji: "🏸",
  },
  [
    ["김민준", 4, "M"],
    ["이서연", 3, "F"],
    ["박지훈", 5, "M"],
    ["최유진", 3, "F"],
    ["정우성", 4, "M"],
    ["한소희", 2, "F"],
    ["오세훈", 3, "M"],
    ["윤지아", 4, "F"],
    ["강태현", 2, "M"],
    ["임채원", 3, "F"],
    ["신동혁", 5, "M"],
    ["서예린", 2, "F"],
  ],
  {
    courtCount: 3,
    sessionLabel: "수요일 정기 운동",
    sessionTime: "19:30 – 22:00",
    attend: 6,
    late: 2,
    maybe: 2,
    absent: 1,
    checkIn: 5,
    // 나(m0 김민준)는 클럽 소유자 → 역할과 무관하게 전권
    roleAssign: {
      0: ["president"],
      1: ["treasurer"],
      2: ["coach"],
      3: ["staff"],
    },
    monthlyDues: 25000,
    finance: [
      ["INCOME", "9월 회비 (12명)", 300000],
      ["EXPENSE", "대치체육관 대관료", 180000],
      ["EXPENSE", "셔틀콕 5통", 155000],
      ["INCOME", "게스트비 정산", 30000],
    ],
  },
  [
    coach(
      "rally",
      0,
      "정해성 코치",
      ["입문 자세교정", "그립/스윙"],
      "전 실업팀 · 지도 8년",
      "라켓을 처음 잡는 분도 3주면 클리어가 넘어갑니다. 기본 자세부터 천천히 잡아드려요.",
      35000,
      [1, 3, 5],
      18,
      22,
      "신한 110-234-567890 (랠리클럽 정산)",
    ),
    coach(
      "rally",
      1,
      "문지호 코치",
      ["클리어/드롭", "하이클리어 파워"],
      "생활체육 A급 지도자",
      "길게 안 넘어가는 클리어, 힘이 아니라 타점 문제입니다. 스윙 궤도부터 교정합니다.",
      45000,
      [2, 4, 6],
      19,
      22,
      "카카오 3333-01-2345678 (랠리클럽 정산)",
    ),
    coach(
      "rally",
      2,
      "오세라 코치",
      ["복식 로테이션", "전위 네트플레이"],
      "전국동호인대회 A조 우승",
      "복식은 실력보다 위치입니다. 파트너와의 로테이션 감각을 만들어 드려요.",
      55000,
      [0, 3, 6],
      10,
      18,
      "국민 604-01-334455 (랠리클럽 정산)",
    ),
  ],
);


const morning = buildClub(
  {
    id: "morning",
    name: "새벽셔틀 모임",
    location: "성남 분당 야탑체육관",
    inviteCode: "MORN07",
    ownedByMe: false,
    emoji: "🌅",
  },
  [
    ["장현우", 3, "M"],
    ["문가영", 4, "F"],
    ["배성민", 2, "M"],
    ["노윤서", 3, "F"],
    ["황준호", 4, "M"],
    ["조은지", 2, "F"],
    ["류지완", 3, "M"],
    ["백하늘", 3, "F"],
  ],
  {
    courtCount: 2,
    sessionLabel: "평일 새벽 운동",
    sessionTime: "06:00 – 08:00",
    attend: 4,
    late: 1,
    maybe: 2,
    absent: 1,
    checkIn: 4,
    // 새벽셔틀에서 나(m0)는 회장 — 소유자가 아니어도 역할 권한으로 운영
    roleAssign: { 0: ["president"], 1: ["treasurer"], 2: ["coach"], 3: ["staff"] },
    monthlyDues: 20000,
    finance: [
      ["INCOME", "9월 회비 (8명)", 160000],
      ["EXPENSE", "체육관 대관료", 120000],
      ["EXPENSE", "셔틀콕 3통", 93000],
    ],
  },
  [
    coach(
      "morning",
      0,
      "배윤성 코치",
      ["입문 자세교정", "풋워크 기초"],
      "지도 5년 · 새벽반 전담",
      "출근 전 50분, 기본기만 확실히 잡아드립니다. 초보자 환영.",
      30000,
      [1, 2, 3, 4, 5],
      6,
      9,
      "농협 302-1234-5678-01 (새벽셔틀 정산)",
    ),
    coach(
      "morning",
      1,
      "한도경 코치",
      ["스매시/풋워크", "체력 트레이닝"],
      "전 대학부 선수",
      "스매시 각도와 스텝을 함께 잡습니다. 땀 좀 흘리실 준비만 해오세요.",
      40000,
      [1, 3, 5],
      6,
      10,
      "토스 1000-2222-3333 (새벽셔틀 정산)",
    ),
    coach(
      "morning",
      2,
      "신미르 코치",
      ["복식 로테이션", "리시브 안정화"],
      "생활체육 지도자 2급",
      "리시브가 흔들리면 복식이 무너집니다. 수비부터 단단하게 만들어요.",
      45000,
      [2, 4, 6],
      7,
      11,
      "하나 158-910111-2233 (새벽셔틀 정산)",
    ),
  ],
);


const company = buildClub(
  {
    id: "company",
    name: "사내 동호회 셔틀콕",
    location: "판교 테크원 스포츠센터",
    inviteCode: "TECH88",
    ownedByMe: false,
    emoji: "🏢",
  },
  [
    ["권도윤", 2, "M"],
    ["심수빈", 3, "F"],
    ["고재현", 4, "M"],
    ["양다은", 2, "F"],
    ["표민석", 3, "M"],
    ["차예은", 4, "F"],
  ],
  {
    courtCount: 2,
    sessionLabel: "금요일 저녁 운동",
    sessionTime: "18:30 – 20:30",
    attend: 3,
    late: 1,
    maybe: 1,
    absent: 1,
    checkIn: 3,
    // 사내 동호회에서 나(m0)는 일반 회원 — 권한 제한 확인용
    roleAssign: { 0: ["member"], 1: ["treasurer"], 2: ["staff"], 3: ["coach"] },
    monthlyDues: 15000,
    finance: [
      ["INCOME", "9월 회비 (6명)", 90000],
      ["EXPENSE", "셔틀콕 2통", 62000],
    ],
  },
  [
    coach(
      "company",
      0,
      "표진우 코치",
      ["입문 자세교정", "룰/경기 운영"],
      "사내 동호회 전임 코치",
      "운동 안 해본 직원분들도 편하게. 라켓 잡는 법부터 시작합니다.",
      30000,
      [1, 3, 5],
      18,
      21,
      "우리 1002-345-678901 (셔틀콕 정산)",
    ),
    coach(
      "company",
      1,
      "차민아 코치",
      ["클리어/드롭", "스매시/풋워크"],
      "생활체육 지도자 · 지도 6년",
      "점심시간 짧게, 저녁엔 길게. 랠리를 오래 이어가는 법을 배웁니다.",
      42000,
      [2, 4],
      12,
      20,
      "카카오 3333-99-1122334 (셔틀콕 정산)",
    ),
    coach(
      "company",
      2,
      "노강훈 코치",
      ["복식 로테이션", "전술 코칭"],
      "직장부 대회 다수 입상",
      "사내 대회 대비 복식 전술 위주로 진행합니다. 2인 동반 신청 추천.",
      60000,
      [5, 6],
      10,
      18,
      "신한 110-999-888777 (셔틀콕 정산)",
    ),
  ],
);


export const SEED_STATE: AppState = {
  meId: "rally-m0",
  currentClubId: "rally",
  clubOrder: ["rally", "morning", "company"],
  clubs: { rally, morning, company },
};

export const DEMO_INVITE: Record<string, string> = {
  RALLY26: "rally",
  MORN07: "morning",
  TECH88: "company",
};

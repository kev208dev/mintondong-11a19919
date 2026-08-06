import { defaultRolePresets } from "./permissions";
import type { AppState, ClubState } from "./types";

const now = Date.now();

const MY_CLUB_ID = "my-club";
const ME_ID = `${MY_CLUB_ID}-m0`;

const myClub: ClubState = {
  club: {
    id: MY_CLUB_ID,
    name: "내 배드민턴 모임",
    location: "장소 미설정",
    inviteCode: "MYCLUB1",
    ownedByMe: true,
    emoji: "🏸",
  },
  members: [{ id: ME_ID, name: "나", level: 3, gender: "M" }],
  guests: [],
  attendance: { [ME_ID]: "ATTEND" },
  checkedIn: [],
  courtCount: 2,
  queue: [],
  matches: [],
  stats: { [ME_ID]: { games: 0, wins: 0 } },
  defaultTarget: 21,
  sessionLabel: "운동 일정 미설정",
  sessionTime: "시간 미설정",
  lessonsEnabled: false,
  coaches: [],
  bookings: [],
  payments: [],
  roles: defaultRolePresets(MY_CLUB_ID, now),
  memberRoles: { [ME_ID]: [`${MY_CLUB_ID}-role-president`] },
  finance: { monthlyDues: 0, entries: [] },
};

export const SEED_STATE: AppState = {
  meId: ME_ID,
  currentClubId: MY_CLUB_ID,
  clubOrder: [MY_CLUB_ID],
  clubs: { [MY_CLUB_ID]: myClub },
};

export const DEMO_INVITE: Record<string, string> = {};

/**
 * Educational-stage ordering for study groups.
 *
 * Groups sort by (stage, grade, roomTier, room, name): stage + grade are
 * parsed from the class name («الصف الأول الإعدادي» → إعدادي/1), the room
 * comes from the group's first session (real rooms alphabetically, then no
 * room, then «اونلاين»/online last). Names outside the pattern sort last.
 */

const DIACRITICS = /[\u064B-\u0652\u0670]/g;
const ARABIC_MAP: Record<string, string> = {
  أ: "ا",
  إ: "ا",
  آ: "ا",
  ة: "ه",
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
};
const ARABIC_RE = /[أإآة٠١٢٣٤٥٦٧٨٩]/g;

export function normalizeArabic(input: string): string {
  return input
    .toLowerCase()
    .replace(ARABIC_RE, (c) => ARABIC_MAP[c])
    .replace(DIACRITICS, "");
}

const STAGES: Array<{ index: number; words: string[] }> = [
  { index: 0, words: ["روضه", "حضان", "kg"] },
  { index: 1, words: ["ابتدائ"] },
  { index: 2, words: ["اعداد"] },
  { index: 3, words: ["ثانوي"] },
];

const ORDINALS: Array<{ grade: number; word: string }> = [
  { grade: 12, word: "الثاني عشر" },
  { grade: 11, word: "الحادي عشر" },
  { grade: 10, word: "العاشر" },
  { grade: 9, word: "التاسع" },
  { grade: 8, word: "الثامن" },
  { grade: 7, word: "السابع" },
  { grade: 6, word: "السادس" },
  { grade: 5, word: "الخامس" },
  { grade: 4, word: "الرابع" },
  { grade: 3, word: "الثالث" },
  { grade: 2, word: "الثاني" },
  { grade: 1, word: "الاول" },
  { grade: 1, word: "اولى" },
  { grade: 1, word: "اول" },
];

export interface GroupSortKey {
  stage: number;
  grade: number;
  roomTier: number;
  room: string;
  name: string;
}

export function groupSortKey(name: string, room?: string): GroupSortKey {
  const normalized = normalizeArabic(name);
  let stage = Number.POSITIVE_INFINITY;
  for (const s of STAGES) {
    if (s.words.some((w) => normalized.includes(w))) {
      stage = s.index;
      break;
    }
  }
  let grade = Number.POSITIVE_INFINITY;
  for (const o of ORDINALS) {
    if (normalized.includes(o.word)) {
      grade = o.grade;
      break;
    }
  }
  if (!Number.isFinite(grade)) {
    const digits = normalized.match(/\d{1,2}/);
    if (digits) grade = Number(digits[0]);
  }
  const trimmed = (room ?? "").trim();
  const roomNormalized = normalizeArabic(trimmed);
  let roomTier = 1;
  if (trimmed) {
    const isOnline = roomNormalized.includes("اونلاين") || roomNormalized.includes("online");
    roomTier = isOnline ? 2 : 0;
  }
  return { stage, grade, roomTier, room: roomNormalized, name };
}

function compareKeys(a: GroupSortKey, b: GroupSortKey): number {
  return (
    a.stage - b.stage ||
    a.grade - b.grade ||
    a.roomTier - b.roomTier ||
    a.room.localeCompare(b.room, "ar") ||
    a.name.localeCompare(b.name, "ar")
  );
}

export function compareGroupsByName(a: { name: string }, b: { name: string }): number {
  return compareKeys(groupSortKey(a.name), groupSortKey(b.name));
}

export function compareGroupsWithRoom(
  a: { name: string; room?: string },
  b: { name: string; room?: string },
): number {
  return compareKeys(groupSortKey(a.name, a.room), groupSortKey(b.name, b.room));
}

export function firstSessionRoom(
  sessions: Array<{ dayOfWeek: number; startTime: string; room: string | null }>,
): string | undefined {
  const first = [...sessions].sort(
    (a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime),
  )[0];
  return first?.room ? first.room : undefined;
}

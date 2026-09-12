/** أيام الحصص المحتسبة في وضع الحصص: حاضر+متأخر+غائب فقط (معذور لا يحسب)، بلا تكرار لليوم عبر اليومي وكشوف الجدول — نفس تعريف عداد الحصص. */
export function countedSessionDays(
  daily: Array<{ date: string; status: string }>,
  sheets: Array<{ date: string; status: string }>,
): number {
  const consuming = new Set(["present", "late", "absent"]);
  const days = new Set<string>();
  for (const row of [...daily, ...sheets]) if (consuming.has(row.status)) days.add(row.date);
  return days.size;
}

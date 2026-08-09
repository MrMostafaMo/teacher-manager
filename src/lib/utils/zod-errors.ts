import type { ZodError, ZodIssue } from "zod";

export function mapZodErrors(
  error: ZodError,
  resolve: (field: string, issue: ZodIssue) => string,
): Record<string, string> {
  const mapped: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "");
    if (mapped[field]) continue;
    mapped[field] = resolve(field, issue);
  }
  return mapped;
}

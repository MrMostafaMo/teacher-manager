import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { createRepository } from "@/lib/db/repository";
import { sessionExceptions, type SessionException } from "@/lib/db/schema";

/**
 * Repository for one-off schedule exceptions. The generic CRUD covers the
 * full-dump/insert/remove paths; `listForDates` serves the week grid and the
 * attendance/dashboard date lookups, and `clearForSessions` is used when
 * sessions disappear (SQLite FKs are off — no cascade).
 */
export const exceptionRepository = {
  ...createRepository(sessionExceptions),

  /** Exceptions for the given session ids restricted to the given dates. */
  listForDates: async (sessionIds: string[], dates: string[]): Promise<SessionException[]> => {
    if (sessionIds.length === 0 || dates.length === 0) return [];
    const rows = await db
      .select()
      .from(sessionExceptions)
      .where(
        and(
          inArray(sessionExceptions.sessionId, sessionIds),
          inArray(sessionExceptions.date, dates),
        ),
      )
      .orderBy(asc(sessionExceptions.date));
    return rows as unknown as SessionException[];
  },

  /** Delete every exception for the given session ids. */
  clearForSessions: async (sessionIds: string[]): Promise<void> => {
    if (sessionIds.length === 0) return;
    await db.delete(sessionExceptions).where(inArray(sessionExceptions.sessionId, sessionIds));
  },

  /** Delete the exception for one (session, date) pair (upsert helper). */
  clearForSessionDate: async (sessionId: string, date: string): Promise<void> => {
    await db
      .delete(sessionExceptions)
      .where(and(eq(sessionExceptions.sessionId, sessionId), eq(sessionExceptions.date, date)));
  },
};

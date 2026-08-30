import type { SessionWithGroup } from "@/features/schedule/infrastructure/schedule-repo";
import type { GroupSession } from "@/lib/db/schema";
import type { SessionWithException } from "@/features/schedule/application/schedule-exceptions";
import { cn } from "@/lib/utils";
import { HOUR_PX, type PlacedSession } from "./week-layout";
import { SessionBlock } from "./SessionBlock";
import { useState } from "react";

interface DayColumnProps {
  day: number;
  date: string;
  today: number;
  isCurrentWeek: boolean;
  nowVisible: boolean;
  nowTop: number;
  hours: number[];
  rangeStart: number;
  totalH: number;
  placed: PlacedSession<SessionWithException>[];
  conflicts: Set<string>;
  deletingId: string | null;
  onEdit: (s: GroupSession) => void;
  onDelete: (s: GroupSession) => void;
  onAttend: (s: SessionWithGroup) => void;
  onOccurrence: (s: SessionWithGroup, date: string) => void;
  onMoveSession?: (id: string, newDay: number, newStartMin: number) => void;
}

export function DayColumn({
  day,
  date,
  today,
  isCurrentWeek,
  nowVisible,
  nowTop,
  hours,
  rangeStart,
  totalH,
  placed,
  conflicts,
  deletingId,
  onEdit,
  onDelete,
  onAttend,
  onOccurrence,
  onMoveSession,
}: DayColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div
      key={day}
      className={cn(
        "relative border-inline-start border-border/60 transition-colors",
        isCurrentWeek && day === today && "bg-muted/30",
        isDragOver && "bg-muted/50"
      )}
      style={{ height: totalH }}
      onDragOver={(e) => {
        if (!onMoveSession) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        if (!onMoveSession) return;
        e.preventDefault();
        setIsDragOver(false);
        const id = e.dataTransfer.getData("text/plain");
        if (!id) return;
        
        const rect = e.currentTarget.getBoundingClientRect();
        const offsetY = e.clientY - rect.top;
        
        // Calculate minutes based on Y offset and snap to 15 mins (0.25 hour)
        const rawMin = (offsetY / HOUR_PX) * 60 + rangeStart;
        const snappedMin = Math.round(rawMin / 15) * 15;
        
        onMoveSession(id, day, snappedMin);
      }}
    >
      {hours.map((h) =>
        h > rangeStart ? (
          <div
            key={h}
            className="absolute inset-x-0 border-t border-border/40"
            style={{ top: ((h - rangeStart) / 60) * HOUR_PX }}
          />
        ) : null,
      )}

      {isCurrentWeek && day === today && nowVisible && (
        <div
          className="absolute inset-x-0 z-10 border-t-2 border-destructive/70"
          style={{ top: nowTop }}
        />
      )}

      {placed.map((p) => (
        <SessionBlock
          key={p.session.id}
          placed={p}
          rangeStart={rangeStart}
          conflicted={conflicts.has(p.session.id)}
          deleting={deletingId === p.session.id}
          date={date}
          onEdit={onEdit}
          onDelete={onDelete}
          onAttend={onAttend}
          onOccurrence={onOccurrence}
        />
      ))}
    </div>
  );
}

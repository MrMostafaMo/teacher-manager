import { useEffect, useState } from "react";
import { listGroups, listMemberships } from "@/features/groups/application/group-cases";
import type { GroupWithCount } from "@/features/groups/infrastructure/group-repo";
import { getStudentSkills } from "@/features/skills/application/skill-cases";
import { listPlans } from "@/features/payments/application/plan-cases";
import type { Student } from "@/lib/db/schema";

export function useStudentDetail(student: Student, skillsOpen: boolean) {
  const [planName, setPlanName] = useState<string | null>(null);
  const [skillSummary, setSkillSummary] = useState<{ tracked: number; weak: number } | null>(null);
  const [groups, setGroups] = useState<GroupWithCount[]>([]);
  const [groupId, setGroupId] = useState("");

  useEffect(() => {
    let cancelled = false;
    void listGroups()
      .then((all) => {
        if (cancelled) return;
        setGroups(all);
      })
      .catch(() => {
        if (cancelled) return;
        setGroups([]);
      });
    void listMemberships()
      .then((m) => {
        if (cancelled) return;
        const member = m.find((x) => x.studentId === student.id);
        setGroupId(member?.groupId ?? "");
      })
      .catch(() => {
        if (cancelled) return;
        setGroupId("");
      });
    return () => {
      cancelled = true;
    };
  }, [student.id]);

  useEffect(() => {
    let cancelled = false;
    getStudentSkills(student.id)
      .then((rows) => {
        if (cancelled) return;
        setSkillSummary({
          tracked: rows.filter((r) => r.level !== null).length,
          weak: rows.filter((r) => r.weak).length,
        });
      })
      .catch(() => {
        if (!cancelled) setSkillSummary(null);
      });
    return () => {
      cancelled = true;
    };
  }, [student.id, skillsOpen]);

  useEffect(() => {
    if (!student.planId) {
      setPlanName(null);
      return;
    }
    void listPlans()
      .then((plans) => {
        const plan = plans.find((p) => p.id === student.planId);
        setPlanName(plan ? plan.name : null);
      })
      .catch(() => setPlanName(null));
  }, [student.planId]);

  return { planName, skillSummary, setSkillSummary, groups, groupId, setGroupId };
}

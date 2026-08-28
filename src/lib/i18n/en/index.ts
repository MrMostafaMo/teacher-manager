import { app } from "./app";
import { common } from "./common";
import { db } from "./db";
import { nav } from "./nav";
import { dashboard } from "./dashboard";
import { placeholder } from "./placeholder";
import { students } from "./students";
import { profile } from "./profile";
import { attendance } from "./attendance";
import { groups } from "./groups";
import { payments } from "./payments";
import { expenses } from "./expenses";
import { plans } from "./plans";
import { features } from "./features";
import { settings } from "./settings";
import { homework } from "./homework";
import { exams } from "./exams";
import { skills } from "./skills";
import { schedule } from "./schedule";
import { reports } from "./reports";
import { activity } from "./activity";
import { reportCard } from "./report-card";
import { notifications } from "./notifications";
import { whatsapp } from "./whatsapp";
import { weakPoints } from "./weak-points";
import { undo } from "./undo";
import { error } from "./error";
import { sync } from "./sync";
import { shortcuts } from "./shortcuts";
import { auth } from "./auth";
import { teacher } from "./teacher";

export const en = {
  app,
  common,
  db,
  nav,
  dashboard,
  placeholder,
  students,
  profile,
  attendance,
  groups,
  payments,
  expenses,
  plans,
  features,
  settings,
  homework,
  exams,
  skills,
  schedule,
  reports,
  activity,
  reportCard,
  notifications,
  whatsapp,
  weakPoints,
  undo,
  error,
  sync,
  shortcuts,
  auth,
  teacher,
} as const;

/** Locale shape — every leaf widened to `string` so translations can differ. */
type DeepString<T> = { [K in keyof T]: T[K] extends string ? string : DeepString<T[K]> };
export type Messages = DeepString<typeof en>;

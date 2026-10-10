import type { PatientRecord } from "./record";
import { activeProblems, currentMeds } from "./views";
import { ageFromDob } from "../auth-utils";
import type { EmergencyData } from "@/components/emergency/EmergencyCard";

export function emergencyData(r: PatientRecord): EmergencyData {
  const meds = currentMeds(r);
  return {
    name: r.profile.full_name,
    age: ageFromDob(r.profile.dob),
    sex: r.profile.sex,
    bloodGroup: r.profile.blood_group,
    healthId: r.profile.health_id,
    allergies: r.allergies.map((a) => ({ substance: a.substance, reaction: a.reaction, severity: a.severity })),
    criticalMeds: meds.filter((m) => m.critical).map((m) => `${m.name}${m.generic ? ` (${m.generic})` : ""}`),
    otherMeds: meds.filter((m) => !m.critical).map((m) => `${m.name}${m.generic ? ` (${m.generic})` : ""}`),
    conditions: activeProblems(r.conditions).filter((c) => c.status === "active").map((c) => c.name.replace(/\s*-\s*.*$/, "")),
    contact: r.profile.emergency_contact,
  };
}

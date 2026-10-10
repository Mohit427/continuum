// Synthetic patient histories (no real patient data). Dates are expressed as days before
// "today" so the demo always looks current. Used by the DB seed and by engine tests.

export interface SeedProvider { key: string; name: string; specialty: string; facility: string; city: string; doctorAccount?: string }
export interface SeedMed { brand: string; strength?: string; dose: string; frequency: string; durationDays?: number; instructions?: string }
export interface SeedLab { test: string; value: number; unit: string; ref?: string }
export interface SeedDoc {
  key: string;
  type: "prescription" | "lab_report" | "discharge_summary";
  daysAgo: number;
  provider: string; // provider key
  complaints?: string[];
  diagnoses?: string[];
  meds?: SeedMed[];
  labs?: SeedLab[];
  vitals?: { bp?: string; pulse?: number; weight?: number; spo2?: number };
  allergies?: { substance: string; reaction: string; severity: "mild" | "moderate" | "severe" | "life-threatening" }[];
  notes?: string;
  /** Name as written on the document (defaults to patient name). */
  nameOnDoc?: string;
}
export interface SeedPatient {
  account: string; // demo email local-part
  name: string;
  sex: "F" | "M";
  ageYears: number;
  bloodGroup: string;
  phone: string;
  healthId: string;
  emergencyContact: { name: string; relation: string; phone: string };
  providers: SeedProvider[];
  docs: SeedDoc[];
}

export const LAKSHMI: SeedPatient = {
  account: "lakshmi",
  name: "Lakshmi Raghavan",
  sex: "F",
  ageYears: 62,
  bloodGroup: "B+",
  phone: "+91 98400 12345",
  healthId: "CN-LR62-4K7Q",
  emergencyContact: { name: "Karthik Raghavan", relation: "Son", phone: "+91 99000 54321" },
  providers: [
    { key: "shah", name: "Dr. Meera Shah", specialty: "General Physician", facility: "Shah Family Clinic", city: "Chennai" },
    { key: "iyer", name: "Dr. Anand Iyer", specialty: "Cardiology", facility: "Kaveri Heart Clinic", city: "Chennai", doctorAccount: "dr.iyer" },
    { key: "menon", name: "Dr. Rahul Menon", specialty: "Endocrinology", facility: "Sugar & Thyroid Centre", city: "Bengaluru" },
    { key: "rao", name: "Dr. Kiran Rao", specialty: "Orthopaedics", facility: "Rao Bone & Joint Clinic", city: "Bengaluru" },
    { key: "nair", name: "Dr. Priya Nair", specialty: "ENT", facility: "Indiranagar ENT Care", city: "Bengaluru" },
    { key: "chennai_lab", name: "Chennai Diagnostics", specialty: "Laboratory", facility: "Chennai Diagnostics", city: "Chennai" },
    { key: "blr_lab", name: "Bengaluru Labs", specialty: "Laboratory", facility: "Bengaluru Labs", city: "Bengaluru" },
    { key: "citycare", name: "CityCare Diagnostics", specialty: "Laboratory", facility: "CityCare Diagnostics", city: "Bengaluru" },
  ],
  docs: [
    {
      key: "lr-labs-1", type: "lab_report", daysAgo: 545, provider: "chennai_lab",
      labs: [
        { test: "HbA1c", value: 7.2, unit: "%", ref: "4.0-5.6" },
        { test: "Fasting Blood Sugar", value: 138, unit: "mg/dL", ref: "70-100" },
        { test: "Serum Creatinine", value: 0.8, unit: "mg/dL", ref: "0.5-1.1" },
        { test: "Potassium", value: 4.3, unit: "mmol/L", ref: "3.5-5.1" },
        { test: "TSH", value: 6.8, unit: "mIU/L", ref: "0.4-4.5" },
        { test: "LDL Cholesterol", value: 128, unit: "mg/dL", ref: "<100" },
      ],
    },
    {
      key: "lr-rx-1", type: "prescription", daysAgo: 540, provider: "shah",
      complaints: ["fatigue", "increased thirst"],
      diagnoses: ["Type 2 diabetes mellitus", "Essential hypertension", "Hypothyroidism"],
      vitals: { bp: "148/92", pulse: 78, weight: 68 },
      allergies: [{ substance: "Penicillin", reaction: "Skin rash and hives", severity: "moderate" }],
      meds: [
        { brand: "Glycomet", strength: "500 mg", dose: "1 tab", frequency: "Twice daily after food" },
        { brand: "Telma", strength: "40 mg", dose: "1 tab", frequency: "Once daily morning" },
        { brand: "Thyronorm", strength: "50 mcg", dose: "1 tab", frequency: "Once daily empty stomach", durationDays: 180 },
      ],
      notes: "Known allergy to penicillin (rash). Review with reports in 3 months.",
    },
    {
      key: "lr-rx-2", type: "prescription", daysAgo: 400, provider: "iyer",
      complaints: ["headache", "uncontrolled BP"],
      diagnoses: ["Essential hypertension", "Dyslipidaemia"],
      vitals: { bp: "156/94", pulse: 82 },
      meds: [
        { brand: "Amlong", strength: "10 mg", dose: "1 tab", frequency: "Once daily" },
        { brand: "Atorva", strength: "20 mg", dose: "1 tab", frequency: "Once daily at night" },
        { brand: "Telma", strength: "40 mg", dose: "1 tab", frequency: "Once daily morning" },
      ],
      notes: "BP not controlled on telmisartan alone. Added amlodipine.",
    },
    {
      key: "lr-labs-2", type: "lab_report", daysAgo: 255, provider: "blr_lab",
      labs: [
        { test: "HbA1c", value: 7.9, unit: "%", ref: "4.0-5.6" },
        { test: "Serum Creatinine", value: 0.9, unit: "mg/dL", ref: "0.5-1.1" },
        { test: "Potassium", value: 4.1, unit: "mmol/L", ref: "3.5-5.1" },
        { test: "TSH", value: 3.2, unit: "mIU/L", ref: "0.4-4.5" },
        { test: "LDL Cholesterol", value: 94, unit: "mg/dL", ref: "<100" },
      ],
    },
    {
      key: "lr-rx-3", type: "prescription", daysAgo: 250, provider: "menon",
      complaints: ["swelling of both ankles", "tingling in feet"],
      diagnoses: ["Type 2 diabetes mellitus - suboptimal control", "Bilateral pedal edema", "Hypothyroidism"],
      vitals: { bp: "138/86", weight: 70 },
      meds: [
        { brand: "Glycomet", strength: "1000 mg", dose: "1 tab", frequency: "Twice daily after food" },
        { brand: "Januvia", strength: "100 mg", dose: "1 tab", frequency: "Once daily" },
        { brand: "Lasix", strength: "40 mg", dose: "1 tab", frequency: "Once daily morning" },
        { brand: "Thyronorm", strength: "50 mcg", dose: "1 tab", frequency: "Once daily empty stomach", durationDays: 180 },
      ],
      notes: "Moved from Chennai. Old records not available. Pedal edema - started diuretic.",
    },
    {
      key: "lr-rx-4", type: "prescription", daysAgo: 120, provider: "rao",
      complaints: ["right knee pain", "difficulty climbing stairs"],
      diagnoses: ["Osteoarthritis right knee"],
      meds: [
        { brand: "Brufen", strength: "400 mg", dose: "1 tab", frequency: "Three times daily after food", durationDays: 150 },
        { brand: "Pan", strength: "40 mg", dose: "1 tab", frequency: "Once daily before breakfast", durationDays: 150 },
      ],
      notes: "Physiotherapy advised.",
    },
    {
      key: "lr-labs-3", type: "lab_report", daysAgo: 75, provider: "blr_lab",
      labs: [
        { test: "HbA1c", value: 8.4, unit: "%", ref: "4.0-5.6" },
        { test: "Serum Creatinine", value: 1.3, unit: "mg/dL", ref: "0.5-1.1" },
        { test: "Potassium", value: 5.0, unit: "mmol/L", ref: "3.5-5.1" },
        { test: "Blood Urea", value: 46, unit: "mg/dL", ref: "15-40" },
      ],
    },
    {
      key: "lr-labs-4", type: "lab_report", daysAgo: 55, provider: "citycare",
      nameOnDoc: "Lakshmi R.",
      labs: [
        { test: "HbA1c", value: 8.3, unit: "%", ref: "4.0-5.6" },
        { test: "Fasting Blood Sugar", value: 162, unit: "mg/dL", ref: "70-100" },
      ],
    },
    {
      key: "lr-rx-5", type: "prescription", daysAgo: 40, provider: "nair",
      complaints: ["nasal blockage", "facial pain", "fever"],
      diagnoses: ["Acute sinusitis"],
      meds: [
        { brand: "Augmentin", strength: "625 mg", dose: "1 tab", frequency: "Twice daily", durationDays: 7 },
        { brand: "Levocet", strength: "5 mg", dose: "1 tab", frequency: "Once daily at night", durationDays: 7 },
      ],
      notes: "Steam inhalation. Review if no improvement.",
    },
  ],
};

export const ARJUN: SeedPatient = {
  account: "arjun",
  name: "Arjun Mehta",
  sex: "M",
  ageYears: 34,
  bloodGroup: "O+",
  phone: "+91 98111 22334",
  healthId: "CN-AM34-9P2X",
  emergencyContact: { name: "Neha Mehta", relation: "Spouse", phone: "+91 98111 99887" },
  providers: [
    { key: "qureshi", name: "Dr. Sana Qureshi", specialty: "Pulmonology", facility: "BreatheWell Chest Clinic", city: "Pune" },
    { key: "kulkarni", name: "Dr. Vivek Kulkarni", specialty: "Neurology", facility: "Pune Neuro Centre", city: "Pune" },
    { key: "shah", name: "Dr. Meera Shah", specialty: "General Physician", facility: "Shah Family Clinic", city: "Chennai" },
    { key: "iyer", name: "Dr. Anand Iyer", specialty: "Cardiology", facility: "Kaveri Heart Clinic", city: "Chennai", doctorAccount: "dr.iyer" },
    { key: "pune_lab", name: "Pune Path Labs", specialty: "Laboratory", facility: "Pune Path Labs", city: "Pune" },
  ],
  docs: [
    {
      key: "am-rx-1", type: "prescription", daysAgo: 400, provider: "qureshi",
      complaints: ["breathlessness on exertion", "night cough"],
      diagnoses: ["Bronchial asthma - moderate persistent"],
      vitals: { spo2: 97, pulse: 84 },
      meds: [
        { brand: "Foracort", strength: "200 mcg", dose: "2 puffs", frequency: "Twice daily" },
        { brand: "Montair", strength: "10 mg", dose: "1 tab", frequency: "Once daily at night" },
      ],
      notes: "Rinse mouth after inhaler use.",
    },
    {
      key: "am-labs-1", type: "lab_report", daysAgo: 390, provider: "pune_lab",
      labs: [
        { test: "Haemoglobin", value: 14.6, unit: "g/dL", ref: "13-17" },
        { test: "Total WBC count", value: 7800, unit: "/µL", ref: "4000-11000" },
        { test: "TSH", value: 2.1, unit: "mIU/L", ref: "0.4-4.5" },
      ],
    },
    {
      key: "am-rx-2", type: "prescription", daysAgo: 150, provider: "kulkarni",
      complaints: ["recurrent throbbing headache", "nausea"],
      diagnoses: ["Migraine without aura"],
      vitals: { bp: "124/80", pulse: 76 },
      meds: [{ brand: "Ciplar", strength: "40 mg", dose: "1 tab", frequency: "Twice daily" }],
      notes: "Migraine prophylaxis.",
    },
    {
      key: "am-rx-3", type: "prescription", daysAgo: 100, provider: "shah",
      complaints: ["wheeze", "breathlessness", "chest tightness"],
      diagnoses: ["Acute exacerbation of asthma"],
      vitals: { spo2: 94, pulse: 96 },
      meds: [{ brand: "Asthalin", strength: "100 mcg", dose: "2 puffs", frequency: "As needed, up to 4 times daily" }],
    },
    {
      key: "am-rx-4", type: "prescription", daysAgo: 60, provider: "shah",
      complaints: ["white patches in mouth", "sore throat"],
      diagnoses: ["Oral candidiasis"],
      meds: [{ brand: "Forcan", strength: "150 mg", dose: "1 tab", frequency: "Once weekly", durationDays: 14 }],
    },
  ],
};

export const PATIENTS = [LAKSHMI, ARJUN];

export const DOCTORS = [
  { account: "dr.iyer", name: "Dr. Anand Iyer", specialty: "Cardiology", registrationNo: "TNMC-48213", organization: "Kaveri Heart Clinic, Chennai" },
  { account: "dr.menon", name: "Dr. Rahul Menon", specialty: "Endocrinology", registrationNo: "KMC-77120", organization: "Sugar & Thyroid Centre, Bengaluru" },
];

export const LABS_ACCOUNTS = [{ account: "citycare", name: "CityCare Diagnostics", registrationNo: "NABL-MC-5521", organization: "CityCare Diagnostics, Bengaluru" }];

/** A document NOT in the seed; uploaded live in the demo to prove the pipeline is real. */
export const LIVE_DEMO_DOC: SeedDoc = {
  key: "lr-live-1", type: "prescription", daysAgo: 0, provider: "iyer",
  complaints: ["ankle swelling persists", "breathless on climbing stairs"],
  diagnoses: ["Essential hypertension", "Pedal edema"],
  vitals: { bp: "146/90", pulse: 80 },
  meds: [
    { brand: "Aldactone", strength: "25 mg", dose: "1 tab", frequency: "Once daily" },
    { brand: "Amlong", strength: "10 mg", dose: "1 tab", frequency: "Once daily" },
    { brand: "Telma", strength: "40 mg", dose: "1 tab", frequency: "Once daily morning" },
  ],
  notes: "Add spironolactone for persistent edema. Recheck electrolytes.",
};

import React, { useState, useMemo } from 'react';
import {
  User, Search, Plus, ChevronRight, Phone, Mail, Calendar,
  Heart, AlertTriangle, Clock, FileText, Activity, Pill, X,
  CheckCircle2, UserCheck, TrendingUp, Users, 
  MapPin, Droplets, Weight, Thermometer, Building2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ─── Types ───────────────────────────────────────────────
type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
type PatientStatus = 'Active' | 'Inactive' | 'Critical' | 'Discharged';
type Gender = 'Male' | 'Female' | 'Other';

interface VitalReading {
  date: string;
  bp: string;
  temp: string;
  pulse: number;
  weight: string;
  spo2: string;
}

interface Visit {
  date: string;
  doctor: string;
  diagnosis: string;
  notes: string;
  clinic: string;
}

interface Patient {
  id: string;
  name: string;
  age: number;
  gender: Gender;
  dob: string;
  phone: string;
  email: string;
  bloodGroup: BloodGroup;
  address: string;
  clinic: string;
  status: PatientStatus;
  allergies: string[];
  conditions: string[];
  lastVisit: string;
  nextAppointment: string | null;
  totalVisits: number;
  outstandingDues: number;
  registeredOn: string;
  vitals: VitalReading[];
  recentVisits: Visit[];
  currentMeds: string[];
  insurance: string;
  emergencyContact: string;
}

// ─── Mock Patient Data ─────────────────────────────────────
const PATIENTS: Patient[] = [
  {
    id: 'PAT-0041',
    name: 'Liam Brown',
    age: 45,
    gender: 'Male',
    dob: '1979-03-12',
    phone: '+1 (555) 201-4411',
    email: 'liam.brown@email.com',
    bloodGroup: 'O+',
    address: '14 Maple Ave, Brooklyn, NY 11201',
    clinic: 'Downtown Specialty Clinic',
    status: 'Critical',
    allergies: ['Penicillin', 'Aspirin'],
    conditions: ['Type 2 Diabetes', 'Hypertension', 'CAD'],
    lastVisit: '2025-06-28',
    nextAppointment: '2025-07-08',
    totalVisits: 34,
    outstandingDues: 280,
    registeredOn: '2022-01-15',
    insurance: 'BlueCross BlueShield',
    emergencyContact: 'Emma Brown — +1 (555) 201-4412',
    currentMeds: ['Metformin 500mg', 'Amlodipine 5mg', 'Atorvastatin 20mg'],
    vitals: [
      { date: '2025-06-28', bp: '148/92', temp: '98.9°F', pulse: 88, weight: '194 lbs', spo2: '96%' },
      { date: '2025-06-10', bp: '152/96', temp: '98.6°F', pulse: 92, weight: '196 lbs', spo2: '95%' },
    ],
    recentVisits: [
      { date: '2025-06-28', doctor: 'Dr. Eleanor Vance', diagnosis: 'HTN Follow-up', notes: 'BP elevated — increased Amlodipine dose. Referred for cardiac echo.', clinic: 'Downtown Specialty Clinic' },
      { date: '2025-06-10', doctor: 'Dr. Eleanor Vance', diagnosis: 'Diabetes Review', notes: 'HbA1c at 7.9%. Adjusted Metformin to 1000mg. Diet counselling given.', clinic: 'Downtown Specialty Clinic' },
    ],
  },
  {
    id: 'PAT-0052',
    name: 'Amara Diallo',
    age: 29,
    gender: 'Female',
    dob: '1996-07-20',
    phone: '+1 (555) 342-0918',
    email: 'amara.d@email.com',
    bloodGroup: 'B+',
    address: '88 Orchard St, Manhattan, NY 10002',
    clinic: 'Westside Family Practice',
    status: 'Active',
    allergies: ['Sulfa drugs'],
    conditions: ['Asthma (mild intermittent)', 'Iron deficiency anemia'],
    lastVisit: '2025-06-25',
    nextAppointment: '2025-07-15',
    totalVisits: 12,
    outstandingDues: 0,
    registeredOn: '2023-03-08',
    insurance: 'Aetna',
    emergencyContact: 'Moussa Diallo — +1 (555) 342-0919',
    currentMeds: ['Ferrous Sulfate 325mg', 'Salbutamol inhaler PRN'],
    vitals: [
      { date: '2025-06-25', bp: '110/72', temp: '98.2°F', pulse: 74, weight: '128 lbs', spo2: '99%' },
      { date: '2025-05-18', bp: '108/70', temp: '98.4°F', pulse: 76, weight: '127 lbs', spo2: '98%' },
    ],
    recentVisits: [
      { date: '2025-06-25', doctor: 'Dr. Emily Chen', diagnosis: 'Routine check + anemia f/u', notes: 'Hemoglobin improving — 10.8 g/dL. Continue iron supplementation. Asthma stable.', clinic: 'Westside Family Practice' },
    ],
  },
  {
    id: 'PAT-0038',
    name: 'James K. Winters',
    age: 61,
    gender: 'Male',
    dob: '1964-11-03',
    phone: '+1 (555) 487-3320',
    email: 'jwinters@email.com',
    bloodGroup: 'AB+',
    address: '22 Liberty St, Queens, NY 11432',
    clinic: 'Northside Urgent Care',
    status: 'Active',
    allergies: [],
    conditions: ['COPD (moderate)', 'Osteoarthritis — bilateral knees'],
    lastVisit: '2025-07-01',
    nextAppointment: null,
    totalVisits: 58,
    outstandingDues: 145,
    registeredOn: '2019-08-22',
    insurance: 'Medicare',
    emergencyContact: 'Gloria Winters — +1 (555) 487-3321',
    currentMeds: ['Tiotropium inhaler', 'Fluticasone/Salmeterol inhaler', 'Naproxen 500mg PRN'],
    vitals: [
      { date: '2025-07-01', bp: '128/82', temp: '98.6°F', pulse: 82, weight: '209 lbs', spo2: '93%' },
      { date: '2025-06-05', bp: '132/86', temp: '98.5°F', pulse: 85, weight: '211 lbs', spo2: '92%' },
    ],
    recentVisits: [
      { date: '2025-07-01', doctor: 'Dr. Raj Patel', diagnosis: 'COPD exacerbation (mild)', notes: 'SpO2 dipped to 91% on walk test. Adjusted bronchodilator. No hospitalization required.', clinic: 'Northside Urgent Care' },
      { date: '2025-06-05', doctor: 'Dr. Raj Patel', diagnosis: 'Knee pain review', notes: 'X-ray shows moderate joint space narrowing. Referred to physio.', clinic: 'Northside Urgent Care' },
    ],
  },
  {
    id: 'PAT-0019',
    name: 'Priya Nair',
    age: 34,
    gender: 'Female',
    dob: '1991-02-14',
    phone: '+1 (555) 610-2278',
    email: 'priya.nair@email.com',
    bloodGroup: 'A+',
    address: '5 Hillside Blvd, Bronx, NY 10453',
    clinic: 'East Valley Health',
    status: 'Active',
    allergies: ['Latex', 'Codeine'],
    conditions: ['Migraine', 'Polycystic Ovary Syndrome (PCOS)'],
    lastVisit: '2025-06-19',
    nextAppointment: '2025-07-22',
    totalVisits: 21,
    outstandingDues: 0,
    registeredOn: '2021-09-01',
    insurance: 'United Health',
    emergencyContact: 'Ravi Nair — +1 (555) 610-2279',
    currentMeds: ['Metformin 500mg (for PCOS)', 'Sumatriptan 50mg PRN', 'Folic Acid 5mg'],
    vitals: [
      { date: '2025-06-19', bp: '118/76', temp: '98.3°F', pulse: 68, weight: '143 lbs', spo2: '99%' },
    ],
    recentVisits: [
      { date: '2025-06-19', doctor: 'Dr. Chloe Vance', diagnosis: 'PCOS 6-month review', notes: 'Cycle regularizing. AMH mildly elevated. Continue Metformin and nutritional guidance.', clinic: 'East Valley Health' },
    ],
  },
  {
    id: 'PAT-0067',
    name: 'Marcus Adeleke',
    age: 52,
    gender: 'Male',
    dob: '1973-05-30',
    phone: '+1 (555) 733-1190',
    email: 'marcus.a@email.com',
    bloodGroup: 'O-',
    address: '71 Commerce Blvd, Staten Island, NY 10314',
    clinic: 'Downtown Specialty Clinic',
    status: 'Inactive',
    allergies: [],
    conditions: ['Hypothyroidism', 'Gout'],
    lastVisit: '2025-02-11',
    nextAppointment: null,
    totalVisits: 9,
    outstandingDues: 520,
    registeredOn: '2022-07-14',
    insurance: 'Cigna',
    emergencyContact: 'Ngozi Adeleke — +1 (555) 733-1191',
    currentMeds: ['Levothyroxine 75mcg', 'Allopurinol 100mg'],
    vitals: [
      { date: '2025-02-11', bp: '136/88', temp: '98.4°F', pulse: 70, weight: '218 lbs', spo2: '97%' },
    ],
    recentVisits: [
      { date: '2025-02-11', doctor: 'Dr. Eleanor Vance', diagnosis: 'Thyroid review', notes: 'TSH still slightly elevated at 4.8. Increased Levothyroxine to 100mcg. Patient missed last 3 appointments.', clinic: 'Downtown Specialty Clinic' },
    ],
  },
  {
    id: 'PAT-0081',
    name: 'Sofia Martinez',
    age: 8,
    gender: 'Female',
    dob: '2017-01-22',
    phone: '+1 (555) 820-5566',
    email: 'martinez.fam@email.com',
    bloodGroup: 'A-',
    address: '309 Park Row, Manhattan, NY 10038',
    clinic: 'Westside Family Practice',
    status: 'Active',
    allergies: ['Peanuts', 'Tree nuts'],
    conditions: ['Seasonal allergic rhinitis', 'Food allergy (peanut — EpiPen prescribed)'],
    lastVisit: '2025-06-30',
    nextAppointment: '2025-08-01',
    totalVisits: 16,
    outstandingDues: 0,
    registeredOn: '2022-03-10',
    insurance: 'Aetna (Family Plan)',
    emergencyContact: 'Maria Martinez (mother) — +1 (555) 820-5567',
    currentMeds: ['Cetirizine 5mg daily', 'EpiPen Jr (carry always)', 'Fluticasone nasal spray PRN'],
    vitals: [
      { date: '2025-06-30', bp: '96/62', temp: '98.6°F', pulse: 90, weight: '52 lbs', spo2: '99%' },
    ],
    recentVisits: [
      { date: '2025-06-30', doctor: 'Dr. Emily Chen', diagnosis: 'Pediatric allergy review', notes: 'Rhinitis well controlled. Peanut allergy still IgE-elevated. Refer to allergist for immunotherapy assessment.', clinic: 'Westside Family Practice' },
    ],
  },
  {
    id: 'PAT-0093',
    name: 'David Okonkwo',
    age: 39,
    gender: 'Male',
    dob: '1986-08-08',
    phone: '+1 (555) 977-4400',
    email: 'david.ok@email.com',
    bloodGroup: 'B-',
    address: '44 Forest Hills Dr, Queens, NY 11375',
    clinic: 'Northside Urgent Care',
    status: 'Discharged',
    allergies: ['Contrast dye'],
    conditions: ['Appendectomy (post-op — discharged)', 'No chronic conditions'],
    lastVisit: '2025-06-15',
    nextAppointment: '2025-07-15',
    totalVisits: 3,
    outstandingDues: 0,
    registeredOn: '2025-05-30',
    insurance: 'Oscar Health',
    emergencyContact: 'Chisom Okonkwo — +1 (555) 977-4401',
    currentMeds: ['Cephalexin 500mg (course ended)', 'Paracetamol 500mg PRN'],
    vitals: [
      { date: '2025-06-15', bp: '122/78', temp: '98.1°F', pulse: 72, weight: '178 lbs', spo2: '99%' },
    ],
    recentVisits: [
      { date: '2025-06-15', doctor: 'Dr. Raj Patel', diagnosis: 'Post-appendectomy follow-up', notes: 'Incision healing well. No signs of infection. Cleared for full activity. Next visit in 4 weeks.', clinic: 'Northside Urgent Care' },
    ],
  },
];

// ─── Sub-components ────────────────────────────────────────

const statusConfig: Record<PatientStatus, { color: string; bg: string; dot: string }> = {
  Active:     { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  Inactive:   { color: 'text-slate-600',   bg: 'bg-slate-100 border-slate-200',   dot: 'bg-slate-400' },
  Critical:   { color: 'text-red-700',     bg: 'bg-red-50 border-red-200',        dot: 'bg-red-500 animate-pulse' },
  Discharged: { color: 'text-sky-700',     bg: 'bg-sky-50 border-sky-200',        dot: 'bg-sky-500' },
};

const bloodGroupColor: Record<BloodGroup, string> = {
  'A+': 'bg-red-100 text-red-700', 'A-': 'bg-red-100 text-red-700',
  'B+': 'bg-orange-100 text-orange-700', 'B-': 'bg-orange-100 text-orange-700',
  'AB+': 'bg-purple-100 text-purple-700', 'AB-': 'bg-purple-100 text-purple-700',
  'O+': 'bg-blue-100 text-blue-700', 'O-': 'bg-blue-100 text-blue-700',
};

// Patient Detail Drawer
function PatientDrawer({ patient, onClose }: { patient: Patient; onClose: () => void }) {
  const [tab, setTab] = useState<'overview' | 'vitals' | 'visits' | 'meds'>('overview');
  const sc = statusConfig[patient.status];

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="w-full max-w-2xl bg-surface-card border-l border-border shadow-2xl overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-surface-card border-b border-border px-6 py-4 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-xl shadow-md">
              {patient.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary">{patient.name}</h2>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-sm text-text-secondary">{patient.id}</span>
                <span className="text-text-muted">·</span>
                <span className="text-sm text-text-secondary">{patient.age} yrs · {patient.gender}</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${sc.bg} ${sc.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                  {patient.status}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors p-1.5 rounded-lg hover:bg-surface">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-border px-6 flex gap-1 bg-surface-card sticky top-[89px] z-10">
          {(['overview', 'vitals', 'visits', 'meds'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide border-b-2 transition-colors capitalize ${tab === t ? 'border-primary-600 text-primary-600' : 'border-transparent text-text-muted hover:text-text-secondary'}`}
            >
              {t === 'meds' ? 'Medications' : t === 'visits' ? 'Visit History' : t}
            </button>
          ))}
        </div>

        <div className="flex-1 p-6 space-y-5">
          {/* Overview Tab */}
          {tab === 'overview' && (
            <>
              {/* Alert bar */}
              {patient.status === 'Critical' && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <p className="text-sm font-semibold text-red-700">Critical patient — requires close monitoring. Review latest vitals below.</p>
                </div>
              )}

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-4">
                <InfoBox icon={<Phone className="w-4 h-4" />} label="Phone" value={patient.phone} />
                <InfoBox icon={<Mail className="w-4 h-4" />} label="Email" value={patient.email} />
                <InfoBox icon={<Calendar className="w-4 h-4" />} label="Date of Birth" value={patient.dob} />
                <InfoBox icon={<Droplets className="w-4 h-4" />} label="Blood Group" value={patient.bloodGroup} valueClass={bloodGroupColor[patient.bloodGroup]} />
                <InfoBox icon={<Building2 className="w-4 h-4" />} label="Clinic" value={patient.clinic} />
                <InfoBox icon={<MapPin className="w-4 h-4" />} label="Insurance" value={patient.insurance} />
              </div>

              <InfoBox icon={<MapPin className="w-4 h-4" />} label="Address" value={patient.address} />
              <InfoBox icon={<UserCheck className="w-4 h-4" />} label="Emergency Contact" value={patient.emergencyContact} />

              {/* Conditions & Allergies */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface rounded-xl p-4 border border-border space-y-2">
                  <p className="text-xs font-bold text-text-muted uppercase tracking-wide">Conditions</p>
                  {patient.conditions.length === 0
                    ? <p className="text-sm text-text-secondary">None recorded</p>
                    : patient.conditions.map(c => (
                        <div key={c} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                          <span className="text-sm text-text-primary">{c}</span>
                        </div>
                      ))
                  }
                </div>
                <div className="bg-surface rounded-xl p-4 border border-border space-y-2">
                  <p className="text-xs font-bold text-text-muted uppercase tracking-wide">Allergies</p>
                  {patient.allergies.length === 0
                    ? <p className="text-sm text-emerald-600 font-semibold flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> None on record</p>
                    : patient.allergies.map(a => (
                        <div key={a} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                          <span className="text-sm text-text-primary font-medium">{a}</span>
                        </div>
                      ))
                  }
                </div>
              </div>

              {/* Stats strip */}
              <div className="grid grid-cols-3 gap-3">
                <StatStrip label="Total Visits" value={String(patient.totalVisits)} icon={<FileText className="w-4 h-4 text-primary-500" />} />
                <StatStrip label="Outstanding" value={patient.outstandingDues > 0 ? `$${patient.outstandingDues}` : 'Clear'} icon={<TrendingUp className="w-4 h-4 text-amber-500" />} urgent={patient.outstandingDues > 0} />
                <StatStrip label="Registered" value={patient.registeredOn} icon={<Calendar className="w-4 h-4 text-emerald-500" />} />
              </div>
            </>
          )}

          {/* Vitals Tab */}
          {tab === 'vitals' && (
            <div className="space-y-4">
              {patient.vitals.map((v, i) => (
                <div key={i} className={`rounded-xl border p-4 space-y-3 ${i === 0 ? 'border-primary-200 bg-primary-50/30' : 'border-border bg-surface/50'}`}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-text-muted uppercase tracking-wide">{i === 0 ? 'Latest Reading' : `Reading — ${v.date}`}</p>
                    <span className="text-xs text-text-muted">{v.date}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <VitalCard label="Blood Pressure" value={v.bp} icon={<Activity className="w-4 h-4 text-rose-500" />} />
                    <VitalCard label="Temperature" value={v.temp} icon={<Thermometer className="w-4 h-4 text-amber-500" />} />
                    <VitalCard label="Pulse Rate" value={`${v.pulse} bpm`} icon={<Heart className="w-4 h-4 text-red-500" />} />
                    <VitalCard label="Weight" value={v.weight} icon={<Weight className="w-4 h-4 text-blue-500" />} />
                    <VitalCard label="SpO2" value={v.spo2} icon={<Activity className="w-4 h-4 text-teal-500" />} />
                  </div>
                </div>
              ))}
              {patient.vitals.length === 0 && (
                <div className="text-center py-12 text-text-muted">
                  <Activity className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No vital readings recorded yet.</p>
                </div>
              )}
            </div>
          )}

          {/* Visits Tab */}
          {tab === 'visits' && (
            <div className="space-y-4">
              {patient.recentVisits.map((v, i) => (
                <div key={i} className="rounded-xl border border-border bg-surface/50 p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-text-primary text-sm">{v.diagnosis}</p>
                      <p className="text-xs text-text-muted mt-0.5">{v.doctor} · {v.clinic}</p>
                    </div>
                    <span className="text-xs text-text-muted bg-surface border border-border px-2 py-0.5 rounded-full">{v.date}</span>
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed bg-surface/60 border border-border/50 rounded-lg p-3">{v.notes}</p>
                </div>
              ))}
              {patient.recentVisits.length === 0 && (
                <div className="text-center py-12 text-text-muted">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No visit records available.</p>
                </div>
              )}
            </div>
          )}

          {/* Medications Tab */}
          {tab === 'meds' && (
            <div className="space-y-3">
              {patient.currentMeds.length === 0
                ? (
                  <div className="text-center py-12 text-text-muted">
                    <Pill className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No current medications on file.</p>
                  </div>
                )
                : patient.currentMeds.map((med, i) => (
                    <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-surface/50">
                      <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                        <Pill className="w-4 h-4 text-primary-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{med}</p>
                        <p className="text-xs text-text-muted">Currently prescribed</p>
                      </div>
                      <div className="ml-auto">
                        <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">Active</span>
                      </div>
                    </div>
                  ))
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoBox({ icon, label, value, valueClass = '' }: { icon: React.ReactNode; label: string; value: string; valueClass?: string }) {
  return (
    <div className="bg-surface/50 rounded-xl border border-border p-3.5 space-y-1">
      <div className="flex items-center gap-1.5 text-text-muted">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-sm font-medium text-text-primary leading-snug ${valueClass ? `px-1.5 py-0.5 rounded-md text-xs font-bold inline-block ${valueClass}` : ''}`}>{value}</p>
    </div>
  );
}

function StatStrip({ label, value, icon, urgent = false }: { label: string; value: string; icon: React.ReactNode; urgent?: boolean }) {
  return (
    <div className={`rounded-xl border p-3.5 text-center ${urgent ? 'border-amber-200 bg-amber-50/50' : 'border-border bg-surface/50'}`}>
      <div className="flex justify-center mb-1">{icon}</div>
      <p className={`text-sm font-bold ${urgent ? 'text-amber-700' : 'text-text-primary'}`}>{value}</p>
      <p className="text-xs text-text-muted mt-0.5">{label}</p>
    </div>
  );
}

function VitalCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white border border-border rounded-xl p-3 flex items-center gap-2.5">
      <div className="flex-shrink-0">{icon}</div>
      <div>
        <p className="text-xs text-text-muted">{label}</p>
        <p className="text-sm font-bold text-text-primary">{value}</p>
      </div>
    </div>
  );
}

// Add New Patient Modal
function AddPatientModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: '', age: '', gender: 'Male', bloodGroup: 'O+', phone: '', email: '', clinic: 'Downtown Specialty Clinic', conditions: '', allergies: '' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-surface-card rounded-2xl border border-border shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h3 className="font-bold text-text-primary text-base">Register New Patient</h3>
            <p className="text-xs text-text-muted mt-0.5">Fill in basic patient information to create a record</p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors p-1.5 rounded-lg hover:bg-surface">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wide block mb-1.5">Full Name *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Patient full name" className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-text-muted" />
            </div>
            <div>
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wide block mb-1.5">Age *</label>
              <input type="number" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} placeholder="35" className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-text-muted" />
            </div>
            <div>
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wide block mb-1.5">Gender *</label>
              <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wide block mb-1.5">Blood Group</label>
              <select value={form.bloodGroup} onChange={e => setForm({ ...form, bloodGroup: e.target.value })} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wide block mb-1.5">Clinic</label>
              <select value={form.clinic} onChange={e => setForm({ ...form, clinic: e.target.value })} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                {['Downtown Specialty Clinic','Westside Family Practice','Northside Urgent Care','East Valley Health'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wide block mb-1.5">Phone</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+1 (555) 000-0000" className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-text-muted" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wide block mb-1.5">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="patient@email.com" className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-text-muted" />
            </div>
            <div>
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wide block mb-1.5">Known Conditions</label>
              <input value={form.conditions} onChange={e => setForm({ ...form, conditions: e.target.value })} placeholder="e.g. Hypertension, Diabetes" className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-text-muted" />
            </div>
            <div>
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wide block mb-1.5">Known Allergies</label>
              <input value={form.allergies} onChange={e => setForm({ ...form, allergies: e.target.value })} placeholder="e.g. Penicillin, Latex" className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-text-muted" />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-text-secondary bg-surface border border-border rounded-xl hover:bg-surface/80 transition-colors">Cancel</button>
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Register Patient
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────
export default function PatientsPage() {
  const { user } = useAuth();
  const role = user?.role ?? 'DOCTOR';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [clinicFilter, setClinicFilter] = useState<string>('All');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const CLINICS = ['All', 'Downtown Specialty Clinic', 'Westside Family Practice', 'Northside Urgent Care', 'East Valley Health'];
  const STATUSES = ['All', 'Active', 'Critical', 'Inactive', 'Discharged'];

  const filtered = useMemo(() => {
    return PATIENTS.filter(p => {
      const matchSearch = search === '' || p.name.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase()) || p.phone.includes(search);
      const matchStatus = statusFilter === 'All' || p.status === statusFilter;
      const matchClinic = clinicFilter === 'All' || p.clinic === clinicFilter;
      return matchSearch && matchStatus && matchClinic;
    });
  }, [search, statusFilter, clinicFilter]);

  // Stats
  const stats = {
    total: PATIENTS.length,
    active: PATIENTS.filter(p => p.status === 'Active').length,
    critical: PATIENTS.filter(p => p.status === 'Critical').length,
    duesOutstanding: PATIENTS.filter(p => p.outstandingDues > 0).length,
  };

  const canRegister = ['SUB_MASTER', 'RECEPTIONIST', 'NURSE'].includes(role);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Patients</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {role === 'NURSE' ? 'Patient records, vitals, and care history' :
             role === 'DOCTOR' ? 'Your assigned patients and clinical records' :
             'Patient registry and management across clinics'}
          </p>
        </div>
        {canRegister && (
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition-colors shadow-sm">
            <Plus className="w-4 h-4" />
            Register Patient
          </button>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Patients', value: stats.total, icon: <Users className="w-5 h-5 text-primary-600" />, bg: 'bg-primary-50 border-primary-100' },
          { label: 'Active Patients', value: stats.active, icon: <UserCheck className="w-5 h-5 text-emerald-600" />, bg: 'bg-emerald-50 border-emerald-100' },
          { label: 'Critical', value: stats.critical, icon: <AlertTriangle className="w-5 h-5 text-red-600" />, bg: 'bg-red-50 border-red-100' },
          { label: 'Outstanding Dues', value: stats.duesOutstanding, icon: <TrendingUp className="w-5 h-5 text-amber-600" />, bg: 'bg-amber-50 border-amber-100' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 flex items-center gap-3 ${s.bg}`} style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center shadow-sm">
              {s.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{s.value}</p>
              <p className="text-xs text-text-muted font-medium">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="bg-surface-card border border-border rounded-xl p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center" style={{ boxShadow: 'var(--shadow-card)' }}>
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, ID, or phone…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-xl bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-text-muted"
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${statusFilter === s ? 'bg-primary-600 text-white border-primary-600' : 'bg-surface text-text-secondary border-border hover:border-primary-300 hover:text-primary-600'}`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Clinic filter */}
        <select value={clinicFilter} onChange={e => setClinicFilter(e.target.value)} className="border border-border rounded-xl px-3 py-2 text-sm bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 min-w-[180px]">
          {CLINICS.map(c => <option key={c}>{c}</option>)}
        </select>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-surface border border-border rounded-xl p-1 ml-auto">
          <button onClick={() => setViewMode('table')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${viewMode === 'table' ? 'bg-primary-600 text-white' : 'text-text-muted hover:text-text-secondary'}`}>Table</button>
          <button onClick={() => setViewMode('cards')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${viewMode === 'cards' ? 'bg-primary-600 text-white' : 'text-text-muted hover:text-text-secondary'}`}>Cards</button>
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-text-muted font-medium">
        Showing <strong className="text-text-secondary">{filtered.length}</strong> of {PATIENTS.length} patients
      </p>

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="bg-surface-card border border-border rounded-xl overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface border-b border-border">
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-text-muted uppercase tracking-wide">Patient</th>
                  <th className="text-left px-4 py-3.5 text-xs font-bold text-text-muted uppercase tracking-wide">ID</th>
                  <th className="text-left px-4 py-3.5 text-xs font-bold text-text-muted uppercase tracking-wide hidden lg:table-cell">Clinic</th>
                  <th className="text-left px-4 py-3.5 text-xs font-bold text-text-muted uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3.5 text-xs font-bold text-text-muted uppercase tracking-wide hidden md:table-cell">Last Visit</th>
                  <th className="text-left px-4 py-3.5 text-xs font-bold text-text-muted uppercase tracking-wide hidden xl:table-cell">Conditions</th>
                  <th className="text-left px-4 py-3.5 text-xs font-bold text-text-muted uppercase tracking-wide">Dues</th>
                  <th className="px-4 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(p => {
                  const sc = statusConfig[p.status];
                  return (
                    <tr key={p.id} onClick={() => setSelectedPatient(p)} className="hover:bg-surface/60 cursor-pointer transition-colors group">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${p.status === 'Critical' ? 'bg-gradient-to-br from-red-500 to-red-700' : 'bg-gradient-to-br from-primary-500 to-primary-700'}`}>
                            {p.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-semibold text-text-primary group-hover:text-primary-600 transition-colors">{p.name}</p>
                            <p className="text-xs text-text-muted">{p.age} yrs · {p.gender}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-mono text-xs text-text-secondary bg-surface border border-border px-2 py-0.5 rounded-lg">{p.id}</span>
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <p className="text-xs text-text-secondary truncate max-w-[160px]">{p.clinic}</p>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${sc.bg} ${sc.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <span className="text-xs text-text-secondary">{p.lastVisit}</span>
                      </td>
                      <td className="px-4 py-4 hidden xl:table-cell">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {p.conditions.slice(0, 2).map(c => (
                            <span key={c} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-md truncate max-w-[120px]">{c}</span>
                          ))}
                          {p.conditions.length > 2 && <span className="text-xs text-text-muted">+{p.conditions.length - 2}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {p.outstandingDues > 0
                          ? <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">${p.outstandingDues}</span>
                          : <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />Clear</span>
                        }
                      </td>
                      <td className="px-4 py-4">
                        <button className="text-text-muted hover:text-primary-600 transition-colors p-1.5 rounded-lg hover:bg-primary-50 opacity-0 group-hover:opacity-100">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div className="py-16 text-center">
                <User className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-40" />
                <p className="font-semibold text-text-secondary">No patients found</p>
                <p className="text-sm text-text-muted mt-1">Try adjusting your search or filters</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cards View */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => {
            const sc = statusConfig[p.status];
            return (
              <div
                key={p.id}
                onClick={() => setSelectedPatient(p)}
                className="bg-surface-card border border-border rounded-2xl p-5 cursor-pointer hover:border-primary-300 hover:shadow-md transition-all group"
                style={{ boxShadow: 'var(--shadow-card)' }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold flex-shrink-0 ${p.status === 'Critical' ? 'bg-gradient-to-br from-red-500 to-red-700' : 'bg-gradient-to-br from-primary-500 to-primary-700'}`}>
                      {p.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-bold text-text-primary text-sm group-hover:text-primary-600 transition-colors">{p.name}</p>
                      <p className="text-xs text-text-muted">{p.age} yrs · {p.gender} · {p.bloodGroup}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${sc.bg} ${sc.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                    {p.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-text-secondary mb-3">
                  <p className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-text-muted" />{p.clinic}</p>
                  <p className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-text-muted" />Last visit: {p.lastVisit}</p>
                  {p.nextAppointment && <p className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-text-muted" />Next: {p.nextAppointment}</p>}
                </div>

                {p.conditions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {p.conditions.slice(0, 2).map(c => (
                      <span key={c} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-md">{c}</span>
                    ))}
                    {p.conditions.length > 2 && <span className="text-xs text-text-muted self-center">+{p.conditions.length - 2}</span>}
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <span className="font-mono text-xs text-text-muted">{p.id}</span>
                  {p.outstandingDues > 0
                    ? <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">${p.outstandingDues} due</span>
                    : <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Settled</span>
                  }
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="col-span-full py-16 text-center">
              <User className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-40" />
              <p className="font-semibold text-text-secondary">No patients found</p>
              <p className="text-sm text-text-muted mt-1">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      )}

      {/* Patient Detail Drawer */}
      {selectedPatient && (
        <PatientDrawer patient={selectedPatient} onClose={() => setSelectedPatient(null)} />
      )}

      {/* Add Patient Modal */}
      {showAddModal && <AddPatientModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
}

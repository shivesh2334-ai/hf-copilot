"use client";

import { useState } from "react";
import { HFPatientInput } from "@/lib/types";

const emptyInput: HFPatientInput = {
  age: undefined,
  sex: undefined,
  complaints: "",
  nyhaClass: undefined,
  examinationFindings: "",
  congestion: {},
  vitals: {},
  hypoperfusionSigns: false,
  riskFactors: {},
  ecg: { lbbb: false, qWaves: false, lowVoltage: false },
  echo: { done: false },
  labs: { natriureticPeptideType: "not_done" },
  currentMedications: "",
  allergiesOrContraindications: "",
  newlyDiagnosed: false,
  pregnant: false,
};

export default function PatientForm({ onSubmit, loading }: { onSubmit: (input: HFPatientInput) => void; loading: boolean }) {
  const [input, setInput] = useState<HFPatientInput>(emptyInput);

  const update = (patch: Partial<HFPatientInput>) => setInput((prev) => ({ ...prev, ...patch }));
  const updateVitals = (patch: Partial<NonNullable<HFPatientInput["vitals"]>>) =>
    setInput((prev) => ({ ...prev, vitals: { ...prev.vitals, ...patch } }));
  const updateCongestion = (patch: Partial<NonNullable<HFPatientInput["congestion"]>>) =>
    setInput((prev) => ({ ...prev, congestion: { ...prev.congestion, ...patch } }));
  const updateRisk = (patch: Partial<NonNullable<HFPatientInput["riskFactors"]>>) =>
    setInput((prev) => ({ ...prev, riskFactors: { ...prev.riskFactors, ...patch } }));
  const updateEcg = (patch: Partial<HFPatientInput["ecg"]>) => setInput((prev) => ({ ...prev, ecg: { ...prev.ecg, ...patch } }));
  const updateEcho = (patch: Partial<HFPatientInput["echo"]>) => setInput((prev) => ({ ...prev, echo: { ...prev.echo, ...patch } }));
  const updateLabs = (patch: Partial<HFPatientInput["labs"]>) => setInput((prev) => ({ ...prev, labs: { ...prev.labs, ...patch } }));

  const congestionKeys: [keyof NonNullable<HFPatientInput["congestion"]>, string][] = [
    ["jvd", "Raised JVP"], ["bibasalCrepitations", "Bibasal crepitations"], ["s3Gallop", "S3 gallop"],
    ["hepatojugularReflux", "Hepatojugular reflux"], ["pedalEdema", "Pedal edema"], ["orthopnea", "Orthopnea"],
    ["pnd", "PND"], ["ascites", "Ascites"], ["coldExtremities", "Cold extremities"],
  ];

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(input); }}
      className="space-y-5"
    >
      <div className="section-card grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <label className="field-label">Age</label>
          <input type="number" className="field-input" value={input.age ?? ""} onChange={(e) => update({ age: e.target.value ? Number(e.target.value) : undefined })} />
        </div>
        <div>
          <label className="field-label">Sex</label>
          <select className="field-input" value={input.sex ?? ""} onChange={(e) => update({ sex: (e.target.value || undefined) as HFPatientInput["sex"] })}>
            <option value="">—</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="field-label">NYHA class</label>
          <select className="field-input" value={input.nyhaClass ?? ""} onChange={(e) => update({ nyhaClass: e.target.value ? (Number(e.target.value) as 1 | 2 | 3 | 4) : undefined })}>
            <option value="">—</option>
            <option value="1">I — no symptoms</option>
            <option value="2">II — slight limitation</option>
            <option value="3">III — marked limitation</option>
            <option value="4">IV — symptoms at rest</option>
          </select>
        </div>
        <div className="flex items-end gap-4 pb-2">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!input.newlyDiagnosed} onChange={(e) => update({ newlyDiagnosed: e.target.checked })} /> Newly diagnosed</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!input.pregnant} onChange={(e) => update({ pregnant: e.target.checked })} /> Pregnant</label>
        </div>
      </div>

      <div className="section-card">
        <label className="field-label">Chief complaints *</label>
        <textarea required className="field-textarea" placeholder="e.g. Progressive breathlessness on exertion over 3 weeks, orthopnea, ankle swelling" value={input.complaints} onChange={(e) => update({ complaints: e.target.value })} />
      </div>

      <div className="section-card">
        <label className="field-label">Examination findings *</label>
        <textarea required className="field-textarea" placeholder="e.g. BP 100/65, HR 102 irregular, bibasal crepitations, pitting pedal edema, cool peripheries" value={input.examinationFindings} onChange={(e) => update({ examinationFindings: e.target.value })} />
      </div>

      <div className="section-card grid grid-cols-2 gap-4 sm:grid-cols-6">
        <div><label className="field-label">SBP</label><input type="number" className="field-input" value={input.vitals?.sbp ?? ""} onChange={(e) => updateVitals({ sbp: e.target.value ? Number(e.target.value) : undefined })} /></div>
        <div><label className="field-label">DBP</label><input type="number" className="field-input" value={input.vitals?.dbp ?? ""} onChange={(e) => updateVitals({ dbp: e.target.value ? Number(e.target.value) : undefined })} /></div>
        <div><label className="field-label">HR</label><input type="number" className="field-input" value={input.vitals?.hr ?? ""} onChange={(e) => updateVitals({ hr: e.target.value ? Number(e.target.value) : undefined })} /></div>
        <div><label className="field-label">RR</label><input type="number" className="field-input" value={input.vitals?.rr ?? ""} onChange={(e) => updateVitals({ rr: e.target.value ? Number(e.target.value) : undefined })} /></div>
        <div><label className="field-label">SpO2 %</label><input type="number" className="field-input" value={input.vitals?.spo2 ?? ""} onChange={(e) => updateVitals({ spo2: e.target.value ? Number(e.target.value) : undefined })} /></div>
        <div><label className="field-label">Weight (kg)</label><input type="number" className="field-input" value={input.vitals?.weightKg ?? ""} onChange={(e) => updateVitals({ weightKg: e.target.value ? Number(e.target.value) : undefined })} /></div>
      </div>

      <div className="section-card">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink/60">Congestion signs</p>
        <div className="flex flex-wrap gap-4 text-sm">
          {congestionKeys.map(([key, label]) => (
            <label key={key} className="flex items-center gap-2">
              <input type="checkbox" checked={!!input.congestion?.[key]} onChange={(e) => updateCongestion({ [key]: e.target.checked } as any)} /> {label}
            </label>
          ))}
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm font-medium text-artery">
          <input type="checkbox" checked={!!input.hypoperfusionSigns} onChange={(e) => update({ hypoperfusionSigns: e.target.checked })} /> Hypoperfusion signs (cold clammy skin, confusion, oliguria)
        </label>
      </div>

      <div className="section-card">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink/60">ECG</p>
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="field-label">Rhythm</label>
            <select className="field-input" value={input.ecg.rhythm ?? ""} onChange={(e) => updateEcg({ rhythm: (e.target.value || undefined) as any })}>
              <option value="">—</option>
              <option value="sinus">Sinus</option>
              <option value="atrial_fibrillation">Atrial fibrillation</option>
              <option value="other_arrhythmia">Other arrhythmia</option>
            </select>
          </div>
          <div><label className="field-label">QRS duration (ms)</label><input type="number" className="field-input" value={input.ecg.qrsDurationMs ?? ""} onChange={(e) => updateEcg({ qrsDurationMs: e.target.value ? Number(e.target.value) : undefined })} /></div>
          <input className="field-input self-end" placeholder="Other ECG findings" value={input.ecg.otherFindings ?? ""} onChange={(e) => updateEcg({ otherFindings: e.target.value })} />
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={input.ecg.lbbb} onChange={(e) => updateEcg({ lbbb: e.target.checked })} /> LBBB</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={input.ecg.qWaves} onChange={(e) => updateEcg({ qWaves: e.target.checked })} /> Pathological Q waves</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={input.ecg.lowVoltage} onChange={(e) => updateEcg({ lowVoltage: e.target.checked })} /> Low voltage</label>
        </div>
      </div>

      <div className="section-card">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink/60">Echocardiogram</p>
        <label className="mb-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={input.echo.done} onChange={(e) => updateEcho({ done: e.target.checked })} /> Echo performed</label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div><label className="field-label">LVEF %</label><input type="number" className="field-input" value={input.echo.lvef ?? ""} onChange={(e) => updateEcho({ lvef: e.target.value ? Number(e.target.value) : undefined })} /></div>
          <div><label className="field-label">Prior LVEF %</label><input type="number" className="field-input" value={input.echo.priorLvef ?? ""} onChange={(e) => updateEcho({ priorLvef: e.target.value ? Number(e.target.value) : undefined })} /></div>
          <div>
            <label className="field-label">Diastolic dysfunction</label>
            <select className="field-input" value={input.echo.diastolicDysfunctionGrade ?? ""} onChange={(e) => updateEcho({ diastolicDysfunctionGrade: (e.target.value || undefined) as any })}>
              <option value="">—</option>
              <option value="none">None</option>
              <option value="grade1">Grade 1</option>
              <option value="grade2">Grade 2</option>
              <option value="grade3_4">Grade 3-4</option>
            </select>
          </div>
          <label className="flex items-center gap-2 self-end text-sm"><input type="checkbox" checked={!!input.echo.raisedFillingPressure} onChange={(e) => updateEcho({ raisedFillingPressure: e.target.checked })} /> Raised filling pressure</label>
          <input className="field-input self-end" placeholder="Valvular disease (if any)" value={input.echo.valvularDisease ?? ""} onChange={(e) => updateEcho({ valvularDisease: e.target.value })} />
        </div>
        <input className="field-input mt-3" placeholder="RWMA / other echo findings" value={input.echo.otherFindings ?? ""} onChange={(e) => updateEcho({ otherFindings: e.target.value })} />
      </div>

      <div className="section-card">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink/60">Labs</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className="field-label">Natriuretic peptide</label>
            <select className="field-input" value={input.labs.natriureticPeptideType ?? "not_done"} onChange={(e) => updateLabs({ natriureticPeptideType: e.target.value as any })}>
              <option value="not_done">Not done</option>
              <option value="BNP">BNP</option>
              <option value="NT-proBNP">NT-proBNP</option>
            </select>
          </div>
          <div><label className="field-label">Value (pg/mL)</label><input type="number" className="field-input" value={input.labs.natriureticPeptideValue ?? ""} onChange={(e) => updateLabs({ natriureticPeptideValue: e.target.value ? Number(e.target.value) : undefined })} /></div>
          <div><label className="field-label">Hemoglobin (g/dL)</label><input type="number" step="0.1" className="field-input" value={input.labs.hemoglobin ?? ""} onChange={(e) => updateLabs({ hemoglobin: e.target.value ? Number(e.target.value) : undefined })} /></div>
          <div><label className="field-label">eGFR</label><input type="number" className="field-input" value={input.labs.egfr ?? ""} onChange={(e) => updateLabs({ egfr: e.target.value ? Number(e.target.value) : undefined })} /></div>
          <div><label className="field-label">Creatinine (mg/dL)</label><input type="number" step="0.1" className="field-input" value={input.labs.creatinine ?? ""} onChange={(e) => updateLabs({ creatinine: e.target.value ? Number(e.target.value) : undefined })} /></div>
          <div><label className="field-label">Sodium (mEq/L)</label><input type="number" className="field-input" value={input.labs.sodium ?? ""} onChange={(e) => updateLabs({ sodium: e.target.value ? Number(e.target.value) : undefined })} /></div>
          <div><label className="field-label">Potassium (mEq/L)</label><input type="number" step="0.1" className="field-input" value={input.labs.potassium ?? ""} onChange={(e) => updateLabs({ potassium: e.target.value ? Number(e.target.value) : undefined })} /></div>
          <div><label className="field-label">HbA1c (%)</label><input type="number" step="0.1" className="field-input" value={input.labs.hba1c ?? ""} onChange={(e) => updateLabs({ hba1c: e.target.value ? Number(e.target.value) : undefined })} /></div>
          <div><label className="field-label">Ferritin (µg/L)</label><input type="number" className="field-input" value={input.labs.ferritin ?? ""} onChange={(e) => updateLabs({ ferritin: e.target.value ? Number(e.target.value) : undefined })} /></div>
          <div><label className="field-label">Transferrin sat. (%)</label><input type="number" className="field-input" value={input.labs.transferrinSaturation ?? ""} onChange={(e) => updateLabs({ transferrinSaturation: e.target.value ? Number(e.target.value) : undefined })} /></div>
          <label className="flex items-center gap-2 self-end text-sm"><input type="checkbox" checked={!!input.labs.troponinElevated} onChange={(e) => updateLabs({ troponinElevated: e.target.checked })} /> Troponin elevated</label>
        </div>
      </div>

      <div className="section-card">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink/60">Risk factors & history</p>
        <div className="flex flex-wrap gap-4 text-sm">
          {([
            ["diabetes", "Diabetes"], ["hypertension", "Hypertension"], ["priorMI", "Prior MI"],
            ["ckd", "CKD"], ["af", "Atrial fibrillation"], ["obesity", "Obesity"],
            ["priorHFHospitalization", "Prior HF hospitalization"], ["frailty", "Frailty"],
          ] as [keyof NonNullable<HFPatientInput["riskFactors"]>, string][]).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2">
              <input type="checkbox" checked={!!input.riskFactors?.[key]} onChange={(e) => updateRisk({ [key]: e.target.checked } as any)} /> {label}
            </label>
          ))}
        </div>
      </div>

      <div className="section-card grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label">Current medications</label>
          <textarea className="field-textarea" value={input.currentMedications} onChange={(e) => update({ currentMedications: e.target.value })} />
        </div>
        <div>
          <label className="field-label">Allergies / contraindications</label>
          <textarea className="field-textarea" value={input.allergiesOrContraindications} onChange={(e) => update({ allergiesOrContraindications: e.target.value })} />
        </div>
      </div>

      <button type="submit" disabled={loading} className="w-full rounded-md bg-vein py-3 text-sm font-semibold text-white transition hover:bg-vein/90 disabled:opacity-50 sm:w-auto sm:px-8">
        {loading ? "Analyzing…" : "Run HF Assessment"}
      </button>
    </form>
  );
}

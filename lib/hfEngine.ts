import {
  HFPatientInput,
  HFEngineOutput,
  HFCategory,
  HFStage,
  CongestionAssessment,
} from "./types";

/**
 * Deterministic rule engine for heart failure diagnosis, staging, and
 * management support.
 *
 * This encodes general, well-established principles of contemporary HF
 * care — the universal HF definition and clinical criteria, natriuretic
 * peptide-based diagnosis, EF-based categorization (HFrEF/HFmrEF/HFpEF/
 * HFimpEF), ACC/AHA staging (A-D), congestion/hypoperfusion-driven acute
 * management, renal-function-adapted sequencing of the "four pillars" of
 * HFrEF pharmacotherapy, electrolyte safety checks, comorbidity-specific
 * therapy choices, device therapy triggers, and structured discharge/
 * rehabilitation planning — written as original logic. It is a clinical
 * decision SUPPORT tool, not a reproduction of any single guideline
 * document and does not replace it. Always confirm dosing, eligibility,
 * and contraindications against current local protocols and the treating
 * physician's judgement before acting on any output.
 */

function countCongestionSigns(input: HFPatientInput): { major: number; minor: number; signs: string[] } {
  const c = input.congestion ?? {};
  const majorSigns: [keyof typeof c, string][] = [
    ["jvd", "raised jugular venous pressure"],
    ["bibasalCrepitations", "bibasal crepitations / pulmonary rales"],
    ["s3Gallop", "S3 gallop"],
    ["hepatojugularReflux", "positive hepatojugular reflux"],
    ["pnd", "paroxysmal nocturnal dyspnea / orthopnea"],
  ];
  const minorSigns: [keyof typeof c, string][] = [
    ["pedalEdema", "bilateral pedal edema"],
    ["ascites", "ascites"],
    ["coldExtremities", "cold extremities (low-output feature)"],
  ];
  let major = 0, minor = 0;
  const signs: string[] = [];
  for (const [key, label] of majorSigns) if (c[key]) { major++; signs.push(label); }
  for (const [key, label] of minorSigns) if (c[key]) { minor++; signs.push(label); }
  if (c.orthopnea) { major++; signs.push("orthopnea"); }
  return { major, minor, signs };
}

function assessHFLikelihood(input: HFPatientInput): { hfLikely: boolean; rationale: string[] } {
  const rationale: string[] = [];
  const { major, minor, signs } = countCongestionSigns(input);
  const np = input.labs.natriureticPeptideValue;
  const npType = input.labs.natriureticPeptideType;

  if (signs.length) rationale.push(`Clinical congestion features present: ${signs.join(", ")}.`);

  let npSuggestsHF: boolean | null = null;
  if (npType && npType !== "not_done" && np !== undefined) {
    if (npType === "NT-proBNP") {
      const cutoff = 125;
      npSuggestsHF = np >= cutoff;
      rationale.push(`NT-proBNP ${np} pg/mL is ${npSuggestsHF ? "above" : "below"} the ${cutoff} pg/mL ambulatory rule-out threshold.`);
    } else {
      const cutoff = 35;
      npSuggestsHF = np >= cutoff;
      rationale.push(`BNP ${np} pg/mL is ${npSuggestsHF ? "above" : "below"} the ${cutoff} pg/mL ambulatory rule-out threshold.`);
    }
  } else {
    rationale.push("Natriuretic peptide not available — diagnosis relies on clinical criteria and imaging alone; recommend obtaining BNP/NT-proBNP.");
  }

  const structuralEvidence = Boolean((input.echo.done && (input.echo.lvef !== undefined && input.echo.lvef < 50)) ||
    input.echo.raisedFillingPressure || (input.echo.diastolicDysfunctionGrade && input.echo.diastolicDysfunctionGrade !== "none"));

  const clinicalCriteriaMet = major >= 1 || (major + minor) >= 2;

  const hfLikely = Boolean((npSuggestsHF === true || npSuggestsHF === null) && (clinicalCriteriaMet || structuralEvidence));

  if (!clinicalCriteriaMet && !structuralEvidence) rationale.push("Insufficient major/minor congestion criteria and no structural/functional echo abnormality reported.");
  if (npSuggestsHF === false) rationale.push("Natriuretic peptide below rule-out threshold makes HF unlikely as the explanation for symptoms, per the universal HF definition.");

  return { hfLikely, rationale };
}

function categorize(input: HFPatientInput): { category: HFCategory; rationale: string[] } {
  const rationale: string[] = [];
  const ef = input.echo.lvef;
  const priorEf = input.echo.priorLvef;

  if (ef === undefined) {
    rationale.push("LVEF not available — categorization pending echocardiography.");
    return { category: "HF unlikely / indeterminate", rationale };
  }

  if (priorEf !== undefined && priorEf <= 40 && ef > 40 && (ef - priorEf) >= 10) {
    rationale.push(`Baseline LVEF ${priorEf}% improved to ${ef}% (≥10-point rise and now >40%) — meets criteria for HF with improved EF (HFimpEF).`);
    return { category: "HFimpEF", rationale };
  }

  if (ef <= 40) {
    rationale.push(`LVEF ${ef}% ≤40% — HF with reduced ejection fraction (HFrEF).`);
    return { category: "HFrEF", rationale };
  }
  if (ef <= 49) {
    rationale.push(`LVEF ${ef}% in the 41–49% range — HF with mildly reduced ejection fraction (HFmrEF), which is managed largely like HFrEF given the shared high prevalence of ischemic etiology.`);
    return { category: "HFmrEF", rationale };
  }
  rationale.push(`LVEF ${ef}% ≥50% — HF with preserved ejection fraction (HFpEF); confirm with diastolic function assessment, filling pressures, and natriuretic peptides / H2FPEF-type scoring.`);
  return { category: "HFpEF", rationale };
}

function stage(input: HFPatientInput, hfLikely: boolean, category: HFCategory): { stage: HFStage; rationale: string[] } {
  const rationale: string[] = [];
  const { major, minor } = countCongestionSigns(input);
  const symptomatic = (input.nyhaClass ?? 1) >= 2 || major >= 1 || minor >= 1 || /breathless|dyspnea|orthopnea|edema|fatigue/i.test(input.complaints);

  if (hfLikely && symptomatic) {
    if ((input.nyhaClass ?? 0) >= 3 && (input.riskFactors?.priorHFHospitalization || input.hypoperfusionSigns)) {
      rationale.push("Recurrent hospitalizations / NYHA III-IV despite therapy with ongoing severe symptoms — consistent with advanced (Stage D) HF; confirm refractoriness to optimized GDMT before labeling as Stage D.");
      return { stage: "D", rationale };
    }
    rationale.push("Current or prior symptoms/signs of HF caused by a structural or functional cardiac abnormality — Stage C (manifest HF).");
    return { stage: "C", rationale };
  }

  const structuralAbnormality = (input.echo.lvef !== undefined && input.echo.lvef < 50) || input.riskFactors?.priorMI || (input.echo.valvularDisease && input.echo.valvularDisease.length > 0);
  if (structuralAbnormality) {
    rationale.push("Structural heart disease or reduced/borderline EF present without current or prior HF symptoms — Stage B (pre-HF).");
    return { stage: "B", rationale };
  }

  rationale.push("At-risk for HF based on risk factors (e.g., hypertension, diabetes, prior cardiotoxic exposure) but no structural disease or symptoms identified — Stage A.");
  return { stage: "A", rationale };
}

function assessCongestion(input: HFPatientInput): CongestionAssessment {
  const { major, minor, signs } = countCongestionSigns(input);
  const hypoperfusion = input.hypoperfusionSigns ||
    (input.vitals?.sbp !== undefined && input.vitals.sbp < 90) ||
    /cold clammy|confusion|oliguria/i.test(input.examinationFindings);

  if (hypoperfusion && (major + minor) >= 1) {
    return {
      label: "Congestion with hypoperfusion (cardiogenic shock)",
      rationale: ["Signs of congestion combined with hypoperfusion (hypotension, cold periphery, altered mentation, or reduced urine output) — treat as cardiogenic shock until excluded.", ...signs],
    };
  }
  if (major >= 2 || (major >= 1 && minor >= 1)) {
    return { label: "Significant congestion", rationale: signs.length ? signs : ["Multiple congestion features present."] };
  }
  if (major + minor >= 1) {
    return { label: "Mild congestion", rationale: signs };
  }
  return { label: "Euvolemic", rationale: ["No significant congestion features reported."] };
}

function buildOutput(
  input: HFPatientInput,
  hfLikely: boolean,
  category: HFCategory,
  stg: HFStage,
  congestion: CongestionAssessment
): Omit<HFEngineOutput, "hfLikely" | "hfLikelihoodRationale" | "category" | "categoryRationale" | "stage" | "stageRationale" | "congestion" | "redFlags"> {
  const investigations: string[] = [
    "12-lead ECG for rhythm, conduction abnormalities, chamber enlargement, and prior infarction.",
    "Transthoracic echocardiography with LVEF, chamber size/volumes, diastolic function (E/E'), valve assessment, and IVC/RWMA if not already done.",
    "Baseline bloods: complete blood count, renal function/eGFR, electrolytes, liver function, fasting glucose/HbA1c, TSH/free T3/T4, lipid profile, ferritin and transferrin saturation.",
    "BNP or NT-proBNP if not already available, for diagnostic support and risk stratification.",
    "Chest X-ray for cardiomegaly, pulmonary venous congestion, and pleural effusion.",
  ];
  if (category === "HFrEF" || category === "HFmrEF") {
    investigations.push("Consider coronary evaluation (angiography or CT coronary angiography) given the high prevalence of ischemic etiology, especially with risk factors such as diabetes.");
  }
  if (!input.echo.done) investigations.push("Echocardiogram not yet documented — required to confirm EF category and guide LVEF-based therapy.");
  if (input.labs.ferritin === undefined) investigations.push("Iron studies (ferritin, transferrin saturation) not documented — recommended given the high prevalence of iron deficiency in HF regardless of anemia status.");

  const nonPharmacological: string[] = [
    "Daily weight monitoring with a clear action plan for weight gain ≥2 kg over 2-3 days.",
    "Moderate dietary sodium restriction (approximately 2-3 g/day); avoid very low sodium targets outside severe/refractory congestion.",
    "Fluid restriction only if congested with hyponatremia; not routinely needed in stable euvolemic patients.",
    "Structured exercise training / cardiac rehabilitation referral once stabilized.",
    "Annual influenza vaccination and pneumococcal vaccination (PPSV23/conjugate) if not contraindicated.",
    "Screen for and correct vitamin/nutritional deficiencies; involve a dietitian if cachexia is present.",
  ];
  if (input.riskFactors?.obesity) nonPharmacological.push("Weight-reduction strategies, noting the 'obesity paradox' in established HF — individualize goals rather than pursuing aggressive weight loss alone.");

  const fourPillarGDMT: string[] = [];
  if (category === "HFrEF" || category === "HFmrEF") {
    const egfr = input.labs.egfr;
    const k = input.labs.potassium;
    const sbp = input.vitals?.sbp;
    const hr = input.vitals?.hr;

    fourPillarGDMT.push(
      "Aim to initiate all four pillars — ARNI/ACEI/ARB, evidence-based beta-blocker, mineralocorticoid receptor antagonist (MRA), and SGLT2 inhibitor — at low dose as early as possible (ideally in-hospital if admitted), then uptitrate every ~2 weeks to target or maximally tolerated doses within 4-6 weeks."
    );

    if (egfr !== undefined && egfr < 20) {
      fourPillarGDMT.push("eGFR <20 mL/min/1.73m²: start low-dose beta-blocker and low-dose ACE inhibitor without uptitration; SGLT2i and ARNI/ARB/MRA require caution or may not be appropriate — involve nephrology.");
    } else if (egfr !== undefined && egfr < 30) {
      fourPillarGDMT.push("eGFR 15-30 mL/min/1.73m²: start low-dose beta-blocker and full-dose SGLT2 inhibitor; add low-dose ACE inhibitor after uptitrating the first two agents, with close monitoring.");
    } else if (egfr !== undefined && egfr < 60) {
      fourPillarGDMT.push("eGFR 30-60 mL/min/1.73m²: start low-dose beta-blocker, low-dose ARNI/ACEI, and full-dose SGLT2 inhibitor together; add low-dose MRA if creatinine rise on treatment stays <50% and K+ <5 mEq/L.");
    } else if (egfr !== undefined) {
      fourPillarGDMT.push("eGFR >60 mL/min/1.73m²: start low-dose beta-blocker, low-dose ARNI/ACEI, low-dose MRA, and full-dose SGLT2 inhibitor together, with dose escalation guided by BP, heart rate, renal function, and potassium every 3-4 weeks.");
    } else {
      fourPillarGDMT.push("Renal function not available — check eGFR before finalizing initiation sequence and doses, particularly for ARNI/ACEI/ARB and MRA.");
    }

    fourPillarGDMT.push("SGLT2 inhibitor requires essentially no dose titration and does not cause electrolyte disturbance — can be started at any point after admission, including early in decompensation.");

    if (sbp !== undefined && sbp < 90) {
      fourPillarGDMT.push("Hypotension present — defer/reduce vasoactive GDMT (ARNI/ACEI/ARB) initiation until BP stabilizes; SGLT2i initiation should also be reassessed if hypotensive.");
    }
    if (hr !== undefined && hr < 50) {
      fourPillarGDMT.push("Bradycardia present — hold beta-blocker initiation/uptitration until heart rate recovers, unless already on a stable dose.");
    }
    if (k !== undefined && k > 5.0) {
      fourPillarGDMT.push(`Potassium ${k} mEq/L — do not start or uptitrate ACEI/ARB/ARNI/MRA until confirmed <5 mEq/L; consider a potassium binder if RAAS-inhibitor therapy needs to continue.`);
    }
    if (input.echo.lvef !== undefined && input.echo.lvef <= 35 && (input.nyhaClass ?? 0) >= 2) {
      fourPillarGDMT.push("LVEF ≤35% with ongoing symptoms despite GDMT — consider ivabradine (sinus rhythm, HR >70 bpm on maximally tolerated beta-blocker) and/or vericiguat (recent worsening HF event) as adjuncts beyond the four pillars.");
    }
  } else if (category === "HFpEF") {
    fourPillarGDMT.push(
      "SGLT2 inhibitor regardless of diabetes status — consistent evidence for reducing HF hospitalization in HFpEF.",
      "Diuretics titrated to relieve congestion; avoid over-diuresis given preload dependence in HFpEF.",
      "Treat hypertension and control heart rate/rhythm (especially atrial fibrillation) aggressively as they are major drivers of HFpEF decompensation.",
      "Consider a mineralocorticoid receptor antagonist / finerenone in patients with LVEF up to the mildly-reduced range, pending eGFR and potassium safety checks.",
      "Weight reduction and structured lifestyle intervention in patients with obesity-phenotype HFpEF; GLP-1 receptor agonist therapy can be considered on an individualized basis where obesity is a major driver."
    );
  } else {
    fourPillarGDMT.push("EF category not yet established — pharmacotherapy plan pending echocardiography; treat congestion symptomatically in the meantime.");
  }

  const otherPharmacotherapy: string[] = [];
  if (congestion.label !== "Euvolemic") {
    otherPharmacotherapy.push("IV or oral loop diuretic titrated to relieve congestion; in acutely decongesting inpatients, a dose around twice the patient's usual oral daily dose is a reasonable starting point.");
    otherPharmacotherapy.push("Reassess congestion status daily; if inadequate response, consider increasing loop diuretic dose, adding a thiazide-type diuretic for sequential nephron blockade, or evaluating for diuretic resistance.");
  }
  if (input.riskFactors?.af) {
    otherPharmacotherapy.push("Atrial fibrillation present — pursue rate or rhythm control per HF phenotype, and ensure appropriate oral anticoagulation based on stroke risk (catheter ablation may be considered first-line in AF-induced or AF-associated cardiomyopathy).");
  }

  const electrolyteAndRenalFlags: string[] = [];
  const na = input.labs.sodium;
  const k = input.labs.potassium;
  const cr = input.labs.creatinine;
  if (na !== undefined && na < 135) {
    electrolyteAndRenalFlags.push(`Hyponatremia (Na ${na} mEq/L) — usually dilutional in HF; treat if symptomatic or Na <120 mEq/L (fluid restriction, hold thiazides/NSAIDs, consider hypertonic saline or vasopressin antagonist per severity); correct no faster than 8 mEq/L/24h to avoid osmotic demyelination.`);
  }
  if (k !== undefined && k < 3.5) {
    electrolyteAndRenalFlags.push(`Hypokalemia (K ${k} mEq/L) — repletion needed given arrhythmia risk; check magnesium, as hypomagnesemia can cause refractory hypokalemia.`);
  }
  if (k !== undefined && k > 5.0) {
    electrolyteAndRenalFlags.push(`Hyperkalemia (K ${k} mEq/L) — hold/reduce RAAS-inhibitor doses per severity; if K >6 mEq/L, manage as an emergency (calcium, insulin-glucose, consider dialysis).`);
  }
  if (cr !== undefined && cr > 2.5) {
    electrolyteAndRenalFlags.push(`Creatinine ${cr} mg/dL — significant renal impairment; temporarily hold/reduce ACEI/ARB/ARNI dose and involve nephrology.`);
  }

  const deviceTherapy: string[] = [];
  if ((category === "HFrEF") && input.echo.lvef !== undefined && input.echo.lvef <= 35 && (input.nyhaClass ?? 0) >= 2) {
    deviceTherapy.push("LVEF ≤35% with NYHA II-IV symptoms after ≥3 months of optimized GDMT — reassess for primary-prevention ICD eligibility.");
  }
  if (input.ecg.lbbb && input.ecg.qrsDurationMs !== undefined && input.ecg.qrsDurationMs >= 130 && input.echo.lvef !== undefined && input.echo.lvef <= 35 && input.ecg.rhythm === "sinus") {
    deviceTherapy.push(`Sinus rhythm with LBBB and QRS ${input.ecg.qrsDurationMs} ms with LVEF ≤35% — evaluate for cardiac resynchronization therapy (CRT); LBBB with QRS ≥150 ms has the strongest evidence base.`);
  } else if (input.ecg.qrsDurationMs !== undefined && input.ecg.qrsDurationMs >= 150 && input.echo.lvef !== undefined && input.echo.lvef <= 35 && input.ecg.rhythm === "sinus") {
    deviceTherapy.push(`Sinus rhythm with wide QRS (${input.ecg.qrsDurationMs} ms, non-LBBB morphology) and LVEF ≤35% — CRT may still be considered given QRS ≥150 ms.`);
  }

  const comorbidityManagement: string[] = [];
  if (input.riskFactors?.diabetes) {
    comorbidityManagement.push("SGLT2 inhibitor is foundational regardless of diabetes status; metformin can continue if eGFR ≥30 and the patient is hemodynamically stable; avoid pioglitazone (fluid retention); use DPP4i only after SGLT2i/metformin/GLP1-RA; caution with GLP-1 receptor agonists in HFrEF given mixed safety signals.");
  }
  if (input.riskFactors?.ckd || (input.labs.egfr !== undefined && input.labs.egfr < 60)) {
    comorbidityManagement.push("Coexisting CKD — favor drugs with renal outcome data (SGLT2i, ARNI), use lower diuretic thresholds for volume depletion, and consider a joint cardiology-nephrology follow-up plan.");
  }
  if (input.labs.ferritin !== undefined && input.labs.transferrinSaturation !== undefined) {
    if (input.labs.transferrinSaturation < 20 || input.labs.ferritin < 100 || (input.labs.ferritin < 300 && input.labs.transferrinSaturation < 20)) {
      comorbidityManagement.push("Iron deficiency pattern on labs — IV ferric carboxymaltose is preferred over oral iron (poor absorption/efficacy in HF) to improve symptoms and reduce HF hospitalization, irrespective of anemia.");
    }
  }
  if (input.riskFactors?.frailty || (input.age ?? 0) >= 75) {
    comorbidityManagement.push("Frailty/advanced age — do not withhold GDMT solely on this basis; use cautious low-dose initiation with closer monitoring, and incorporate a structured physical rehabilitation program.");
  }
  comorbidityManagement.push("Screen for depression and anxiety at baseline and follow-up; consider exercise-based and cognitive-behavioral interventions first-line, with an SSRI (e.g., sertraline, escitalopram) if pharmacotherapy is needed. Avoid tricyclic antidepressants in structural heart disease.");

  const shortTermPlan: string[] = [];
  if (congestion.label === "Congestion with hypoperfusion (cardiogenic shock)") {
    shortTermPlan.push(
      "Manage as cardiogenic shock: continuous hemodynamic monitoring, consider inotropic support for the shortest effective duration, evaluate for short-term mechanical circulatory support, and identify/treat a precipitant (ischemia, arrhythmia, mechanical complication)."
    );
  } else if (congestion.label !== "Euvolemic") {
    shortTermPlan.push("Inpatient/urgent decongestion with IV diuretics, daily reassessment of weight/input-output/renal function/electrolytes, and identification of the precipitating cause (dietary indiscretion, infection, arrhythmia, ischemia, NSAID/steroid use, non-adherence).");
  }
  shortTermPlan.push(
    "Initiate/uptitrate GDMT as early as safely possible — ideally reaching at least half of target doses before discharge if admitted, per evidence that early intensive up-titration reduces HF readmission.",
    "Confirm discharge criteria: successful IV-to-oral diuretic transition, near-optimal volume status, stable renal function/electrolytes, no symptomatic hypotension, and completed patient/family education on diet, daily weights, and adherence."
  );

  const longTermPlan: string[] = [
    "Early post-discharge review within 7 days, then again by 2-6 weeks, to continue GDMT uptitration and reassess volume status, renal function, and electrolytes.",
    "Repeat echocardiography at approximately 3 months of optimized GDMT to reassess LVEF for device therapy eligibility and confirm ongoing category (watch for HFimpEF).",
    "Longer-term follow-up at 3-6 month intervals with monitoring of NT-proBNP trend, renal function, electrolytes, and functional status (NYHA class, 6-minute walk distance).",
    "Address residual risk factors (blood pressure, glycemic control, lipids) and reinforce vaccination and lifestyle measures at each visit.",
  ];
  if (input.pregnant) {
    longTermPlan.push("Pregnancy present — several GDMT agents (ACEI/ARB/ARNI, MRA, SGLT2i) are contraindicated; involve a cardio-obstetric team for an individualized pregnancy-safe regimen and delivery plan.");
  }

  const rehabilitation: string[] = [
    "Refer to structured cardiac rehabilitation (exercise training plus education/psychosocial support) once stabilized — associated with reduced hospitalizations and improved quality of life across EF categories.",
    "Individualized exercise prescription guided by 6-minute walk test or cardiopulmonary exercise testing where available.",
    "Discuss sexual activity: reasonable in compensated NYHA I-II disease; defer until stabilized and optimized in NYHA III-IV; review medications (beta-blockers, diuretics, MRA) that may contribute to sexual dysfunction and consider PDE5 inhibitors where appropriate (contraindicated with nitrates).",
    "Reinforce sodium-restricted, plant-forward dietary pattern (Mediterranean or DASH-style) as tolerated.",
  ];

  const followUp: string[] = [
    "Provide a written discharge/management summary including diagnosis, EF category, stage, target GDMT doses, and next titration steps.",
    "Ensure the patient/family understands daily weight monitoring, sodium restriction, and clear thresholds for contacting the care team or seeking urgent care.",
    "Confirm scheduled follow-up (early post-discharge visit if applicable) and cardiac rehabilitation referral before the encounter ends.",
  ];

  return {
    investigations,
    nonPharmacological,
    fourPillarGDMT,
    otherPharmacotherapy,
    electrolyteAndRenalFlags,
    deviceTherapy,
    comorbidityManagement,
    shortTermPlan,
    longTermPlan,
    rehabilitation,
    followUp,
  };
}

function redFlags(input: HFPatientInput, congestion: CongestionAssessment): string[] {
  const flags: string[] = [];
  if (congestion.label === "Congestion with hypoperfusion (cardiogenic shock)") {
    flags.push("Hypoperfusion with congestion — treat as cardiogenic shock until proven otherwise; urgent escalation of care.");
  }
  if ((input.vitals?.spo2 ?? 98) < 90) flags.push("Hypoxia — assess for acute pulmonary edema / respiratory failure.");
  if (input.labs.troponinElevated) flags.push("Troponin elevated — evaluate for an ischemic precipitant of decompensation.");
  if (input.echo.valvularDisease && /severe/i.test(input.echo.valvularDisease)) flags.push(`Severe valvular disease reported (${input.echo.valvularDisease}) — consider valve intervention referral.`);
  if (input.ecg.rhythm === "other_arrhythmia") flags.push("Non-sinus, non-AF arrhythmia reported — evaluate urgently for a malignant ventricular arrhythmia.");
  if (/syncope|cardiac arrest/i.test(input.complaints)) flags.push("History of syncope or cardiac arrest — assess arrhythmic risk and consider continuous ECG monitoring.");
  if (input.pregnant && congestion.label !== "Euvolemic") flags.push("Pregnancy with active congestion — involve a cardio-obstetric team urgently; peripartum cardiomyopathy and other pregnancy-specific causes must be considered.");
  return flags;
}

export function runHFEngine(input: HFPatientInput): HFEngineOutput {
  const { hfLikely, rationale: hfLikelihoodRationale } = assessHFLikelihood(input);
  const { category, rationale: categoryRationale } = categorize(input);
  const congestion = assessCongestion(input);
  const { stage: stg, rationale: stageRationale } = stage(input, hfLikely, category);
  const flags = redFlags(input, congestion);
  const rest = buildOutput(input, hfLikely, category, stg, congestion);

  return {
    hfLikely,
    hfLikelihoodRationale,
    category,
    categoryRationale,
    stage: stg,
    stageRationale,
    congestion,
    redFlags: flags,
    ...rest,
  };
}

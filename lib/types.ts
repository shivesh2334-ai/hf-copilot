export interface VitalsInput {
  sbp?: number;
  dbp?: number;
  hr?: number;
  rr?: number;
  spo2?: number;
  weightKg?: number;
  weightChangeKg5d?: number;
}

export interface CongestionSigns {
  jvd: boolean;
  bibasalCrepitations: boolean;
  s3Gallop: boolean;
  hepatojugularReflux: boolean;
  pedalEdema: boolean;
  orthopnea: boolean;
  pnd: boolean;
  ascites: boolean;
  coldExtremities: boolean;
}

export interface ECGInputHF {
  rhythm?: "sinus" | "atrial_fibrillation" | "other_arrhythmia";
  qrsDurationMs?: number;
  lbbb: boolean;
  qWaves: boolean;
  lowVoltage: boolean;
  otherFindings?: string;
}

export interface EchoInputHF {
  done: boolean;
  lvef?: number;
  priorLvef?: number;
  priorLvefDate?: string;
  diastolicDysfunctionGrade?: "none" | "grade1" | "grade2" | "grade3_4";
  raisedFillingPressure?: boolean;
  rwma?: string;
  valvularDisease?: string;
  otherFindings?: string;
}

export interface LabsInput {
  natriureticPeptideType?: "BNP" | "NT-proBNP" | "not_done";
  natriureticPeptideValue?: number;
  hemoglobin?: number;
  sodium?: number;
  potassium?: number;
  creatinine?: number;
  egfr?: number;
  hba1c?: number;
  ferritin?: number;
  transferrinSaturation?: number;
  troponinElevated?: boolean;
}

export interface HFPatientInput {
  age?: number;
  sex?: "male" | "female" | "other";
  complaints: string;
  nyhaClass?: 1 | 2 | 3 | 4;
  examinationFindings: string;
  congestion?: Partial<CongestionSigns>;
  vitals?: VitalsInput;
  hypoperfusionSigns?: boolean;
  riskFactors?: {
    diabetes?: boolean;
    hypertension?: boolean;
    priorMI?: boolean;
    ckd?: boolean;
    af?: boolean;
    obesity?: boolean;
    priorHFHospitalization?: boolean;
    frailty?: boolean;
  };
  ecg: ECGInputHF;
  echo: EchoInputHF;
  labs: LabsInput;
  currentMedications?: string;
  allergiesOrContraindications?: string;
  newlyDiagnosed?: boolean;
  pregnant?: boolean;
}

export type HFCategory = "HFrEF" | "HFmrEF" | "HFpEF" | "HFimpEF" | "HF unlikely / indeterminate";
export type HFStage = "A" | "B" | "C" | "D";

export interface CongestionAssessment {
  label: "Euvolemic" | "Mild congestion" | "Significant congestion" | "Congestion with hypoperfusion (cardiogenic shock)";
  rationale: string[];
}

export interface HFEngineOutput {
  hfLikely: boolean;
  hfLikelihoodRationale: string[];
  category: HFCategory;
  categoryRationale: string[];
  stage: HFStage;
  stageRationale: string[];
  congestion: CongestionAssessment;
  redFlags: string[];
  investigations: string[];
  nonPharmacological: string[];
  fourPillarGDMT: string[];
  otherPharmacotherapy: string[];
  electrolyteAndRenalFlags: string[];
  deviceTherapy: string[];
  comorbidityManagement: string[];
  shortTermPlan: string[];
  longTermPlan: string[];
  rehabilitation: string[];
  followUp: string[];
}

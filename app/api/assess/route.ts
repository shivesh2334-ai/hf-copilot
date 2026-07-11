import { NextRequest, NextResponse } from "next/server";
import { runHFEngine } from "@/lib/hfEngine";
import { HFPatientInput } from "@/lib/types";
import { generateAIResponse } from "@/lib/llm";
import { getSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { input, modelId } = await req.json() as { input: HFPatientInput; modelId?: string };

    if (!input?.complaints || !input?.examinationFindings) {
      return NextResponse.json({ error: "complaints and examinationFindings are required" }, { status: 400 });
    }

    const engineOutput = runHFEngine(input);

    let narrative = "";
    try {
      narrative = await generateAIResponse(
        modelId || "anthropic:claude-3-5-sonnet-20240620",
        "You are a cardiology clinical decision-support assistant used by a consultant cardiologist, " +
          "focused on heart failure. You are given (a) structured patient data and (b) the output of a " +
          "deterministic HF classification/staging/management engine. Write a concise, clinician-facing " +
          "note that synthesizes this into a clear working assessment and plan, organized under: " +
          "Diagnosis & Staging, Congestion Status, Investigations, Non-pharmacological Measures, " +
          "GDMT (Four Pillars) & Sequencing, Electrolyte/Renal Safety, Device Therapy, Comorbidity " +
          "Management, Short-Term Plan, Long-Term Plan, and Rehabilitation. Use the engine output as " +
          "your clinical basis — do not contradict its category, stage, or congestion assessment. Flag " +
          "any red flags prominently at the top if present. Be specific but concise, using standard " +
          "cardiology terminology suitable for a specialist reader. This is a decision-support draft for " +
          "a qualified physician, not a final prescription — do not state exact drug doses beyond what " +
          "the engine output already specifies; note that all doses/eligibility must be confirmed by the " +
          "treating physician against current protocols.",
        [
          {
            role: "user",
            content: `PATIENT INPUT:\n${JSON.stringify(input, null, 2)}\n\nENGINE OUTPUT:\n${JSON.stringify(
              engineOutput,
              null,
              2
            )}\n\nWrite the clinical note.`,
          },
        ],
        1800
      );
    } catch (aiErr) {
      console.error("AI synthesis failed:", aiErr);
      narrative = "";
    }

    let caseId: string | null = null;
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("hf_cases")
        .insert({ input, engine_output: engineOutput, narrative })
        .select("id")
        .single();
      if (!error) caseId = data?.id ?? null;
      else console.error("Supabase insert failed:", error);
    }

    return NextResponse.json({ engineOutput, narrative, caseId });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to process assessment" }, { status: 500 });
  }
}

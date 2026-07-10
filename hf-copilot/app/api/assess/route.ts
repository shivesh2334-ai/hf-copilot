import { NextRequest, NextResponse } from "next/server";
import { runHFEngine } from "@/lib/hfEngine";
import { HFPatientInput } from "@/lib/types";
import { getAnthropicClient, CLAUDE_MODEL } from "@/lib/anthropic";
import { getSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const input = (await req.json()) as HFPatientInput;

    if (!input?.complaints || !input?.examinationFindings) {
      return NextResponse.json({ error: "complaints and examinationFindings are required" }, { status: 400 });
    }

    const engineOutput = runHFEngine(input);

    let narrative = "";
    try {
      const anthropic = getAnthropicClient();
      const msg = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 1800,
        system:
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
        messages: [
          {
            role: "user",
            content: `PATIENT INPUT:\n${JSON.stringify(input, null, 2)}\n\nENGINE OUTPUT:\n${JSON.stringify(
              engineOutput,
              null,
              2
            )}\n\nWrite the clinical note.`,
          },
        ],
      });
      const textBlock = msg.content.find((b) => b.type === "text");
      narrative = textBlock && "text" in textBlock ? textBlock.text : "";
    } catch (aiErr) {
      console.error("Claude synthesis failed:", aiErr);
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

"use client";

import { useState } from "react";
import { HFPatientInput, HFEngineOutput } from "@/lib/types";
import PatientForm from "@/components/PatientForm";
import ResultPanel from "@/components/ResultPanel";
import QueryBot from "@/components/QueryBot";

interface AssessResult {
  engineOutput: HFEngineOutput;
  narrative: string;
  caseId: string | null;
}

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AssessResult | null>(null);
  const [lastInput, setLastInput] = useState<HFPatientInput | null>(null);

  async function handleSubmit(input: HFPatientInput) {
    setLoading(true);
    setError(null);
    setResult(null);
    setLastInput(input);
    try {
      const res = await fetch("/api/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Request failed");
      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setError(e.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-vein">HF Copilot</p>
        <h1 className="mt-1 font-display text-3xl text-ink">Heart Failure Decision Support</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink/60">
          Enter complaints, examination/congestion findings, ECG, echo, and labs to generate a
          structured HF diagnosis, EF category, ACC/AHA stage, congestion assessment, and a
          renal-function-adapted GDMT, investigation, and rehabilitation plan. Decision support
          only — always apply clinical judgement.
        </p>
      </header>

      <PatientForm onSubmit={handleSubmit} loading={loading} />

      {error && <p className="mt-6 rounded-md bg-artery/10 p-3 text-sm text-artery">{error}</p>}

      {result && (
        <div className="mt-10 space-y-6">
          <ResultPanel result={result} />
          {lastInput && <QueryBot input={lastInput} engineOutput={result.engineOutput} narrative={result.narrative} />}
        </div>
      )}
    </main>
  );
}

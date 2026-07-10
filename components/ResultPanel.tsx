"use client";

import { HFEngineOutput } from "@/lib/types";
import Badge from "./Badge";

function List({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/60">{title}</p>
      <ul className="space-y-1.5 text-sm text-ink/90">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-vein" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ResultPanel({ result }: { result: { engineOutput: HFEngineOutput; narrative: string } }) {
  const { engineOutput, narrative } = result;

  return (
    <div className="space-y-6">
      <div className="section-card">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <Badge label={engineOutput.category} />
          <Badge label={engineOutput.stage} />
          <span className="text-xs text-ink/50">Stage</span>
          <Badge label={engineOutput.congestion.label} />
        </div>
        <p className="mb-2 text-sm">
          <span className="font-semibold">HF likelihood: </span>
          {engineOutput.hfLikely ? "Likely" : "Not confirmed by available data"}
        </p>
        <List title="HF likelihood rationale" items={engineOutput.hfLikelihoodRationale} />
        <div className="mt-4"><List title="Category rationale" items={engineOutput.categoryRationale} /></div>
        <div className="mt-4"><List title="Stage rationale" items={engineOutput.stageRationale} /></div>
        <div className="mt-4"><List title="Congestion assessment" items={engineOutput.congestion.rationale} /></div>
        {engineOutput.redFlags.length > 0 && (
          <div className="mt-4 rounded-md border border-artery/30 bg-artery/5 p-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-artery">Red flags</p>
            <ul className="space-y-1 text-sm text-artery/90">
              {engineOutput.redFlags.map((f, i) => <li key={i}>• {f}</li>)}
            </ul>
          </div>
        )}
      </div>

      {narrative && (
        <div className="section-card">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/60">AI-synthesized clinical note</p>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-ink/90">{narrative}</div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="section-card"><List title="Investigations" items={engineOutput.investigations} /></div>
        <div className="section-card"><List title="Non-pharmacological measures" items={engineOutput.nonPharmacological} /></div>
        <div className="section-card sm:col-span-2"><List title="GDMT — four pillars & sequencing" items={engineOutput.fourPillarGDMT} /></div>
        <div className="section-card"><List title="Other pharmacotherapy" items={engineOutput.otherPharmacotherapy} /></div>
        <div className="section-card"><List title="Electrolyte & renal safety flags" items={engineOutput.electrolyteAndRenalFlags} /></div>
        <div className="section-card"><List title="Device therapy" items={engineOutput.deviceTherapy} /></div>
        <div className="section-card"><List title="Comorbidity management" items={engineOutput.comorbidityManagement} /></div>
        <div className="section-card"><List title="Rehabilitation" items={engineOutput.rehabilitation} /></div>
        <div className="section-card"><List title="Short-term plan" items={engineOutput.shortTermPlan} /></div>
        <div className="section-card"><List title="Long-term plan" items={engineOutput.longTermPlan} /></div>
        <div className="section-card sm:col-span-2"><List title="Follow-up & safety-netting" items={engineOutput.followUp} /></div>
      </div>

      <p className="text-xs text-ink/40">
        Decision-support output only — verify all recommendations, drug choices, and doses against current
        institutional protocols and clinical judgement before acting.
      </p>
    </div>
  );
}

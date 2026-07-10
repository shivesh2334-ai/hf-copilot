"use client";

import { useState } from "react";
import { HFPatientInput, HFEngineOutput } from "@/lib/types";

interface Msg { role: "user" | "assistant"; content: string }

export default function QueryBot({ input, engineOutput, narrative }: { input: HFPatientInput; engineOutput: HFEngineOutput; narrative: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);

  async function ask() {
    if (!question.trim() || loading) return;
    const q = question.trim();
    const nextMessages = [...messages, { role: "user", content: q } as Msg];
    setMessages(nextMessages);
    setQuestion("");
    setLoading(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, context: { input, engineOutput, narrative }, history: nextMessages.slice(0, -1) }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer ?? "No answer returned." }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Something went wrong reaching the assistant." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="section-card">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink/60">Ask about this case</p>
      <div className="mb-3 max-h-80 space-y-3 overflow-y-auto">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
            <div className={`inline-block rounded-lg px-3 py-2 text-sm ${m.role === "user" ? "bg-vein text-white" : "bg-canvas text-ink"}`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && <div className="text-xs text-ink/40">Thinking…</div>}
      </div>
      <div className="flex gap-2">
        <input
          className="field-input"
          placeholder="e.g. Should I add an MRA given this eGFR and potassium?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
        />
        <button onClick={ask} disabled={loading} className="rounded-md bg-vein px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Ask</button>
      </div>
    </div>
  );
}

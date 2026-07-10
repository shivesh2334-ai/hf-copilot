import { NextRequest, NextResponse } from "next/server";
import { getAnthropicClient, CLAUDE_MODEL } from "@/lib/anthropic";

export const runtime = "nodejs";
export const maxDuration = 60;

interface AskBody {
  question: string;
  context: {
    input: unknown;
    engineOutput: unknown;
    narrative?: string;
  };
  history?: { role: "user" | "assistant"; content: string }[];
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AskBody;
    if (!body?.question) {
      return NextResponse.json({ error: "question is required" }, { status: 400 });
    }

    const anthropic = getAnthropicClient();
    const msg = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1200,
      system:
        "You are a cardiology decision-support query bot for a consultant cardiologist, answering " +
        "follow-up questions about a specific heart failure case. Ground every answer in the case " +
        "context provided (patient input + deterministic engine output + narrative). If the question " +
        "needs information not in the case (e.g. a lab result not provided), say so and ask for it " +
        "rather than inventing values. Keep answers focused and clinically precise. Always end with a " +
        "brief reminder that this is decision support, not a substitute for the treating physician's " +
        "judgement, only when the answer involves a treatment/dosing recommendation.",
      messages: [
        {
          role: "user",
          content: `CASE CONTEXT:\n${JSON.stringify(body.context, null, 2)}`,
        },
        ...(body.history ?? []).map((h) => ({ role: h.role, content: h.content })),
        { role: "user", content: body.question },
      ],
    });

    const textBlock = msg.content.find((b) => b.type === "text");
    const answer = textBlock && "text" in textBlock ? textBlock.text : "";
    return NextResponse.json({ answer });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to get answer" }, { status: 500 });
  }
}

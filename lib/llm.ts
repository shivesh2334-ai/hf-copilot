import { generateText, ModelMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";

export const PROVIDERS = [
  { id: "anthropic:claude-3-5-sonnet-20240620", name: "Claude 3.5 Sonnet (Anthropic)" },
  { id: "google:gemini-1.5-flash", name: "Gemini 1.5 Flash (Google)" },
  { id: "groq:llama3-8b-8192", name: "Llama 3 8B (Groq)" },
  { id: "groq:llama3-70b-8192", name: "Llama 3 70B (Groq)" },
];

export async function generateAIResponse(
  modelId: string,
  systemPrompt: string,
  messages: ModelMessage[],
  maxTokens: number
) {
  let model;

  if (modelId.startsWith("anthropic:")) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set");
    model = anthropic(modelId.replace("anthropic:", ""));
  } else if (modelId.startsWith("google:")) {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set");
    model = google(modelId.replace("google:", ""));
  } else if (modelId.startsWith("groq:")) {
    if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY is not set");
    const groq = createOpenAI({
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: process.env.GROQ_API_KEY,
    });
    model = groq(modelId.replace("groq:", ""));
  } else {
    // Default to anthropic
    if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set");
    model = anthropic("claude-3-5-sonnet-20240620");
  }

  const result = await generateText({
    model,
    system: systemPrompt,
    messages,
  });

  return result.text;
}

import { COHESIVITY_BASE, COH_APP_KEY } from "./env";

// Claude, routed through the Cohesivity AI gateway (OpenAI-compatible shape).
// To move to a direct Anthropic key later, this is the only file that changes.
const GATEWAY = `${COHESIVITY_BASE}/edge/ai-gateway/v1/chat/completions`;
export const COACH_MODEL = process.env.COACH_MODEL ?? "anthropic/claude-haiku-4.5";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function chat(
  messages: ChatMessage[],
  opts: { maxTokens?: number; temperature?: number; model?: string } = {},
): Promise<string> {
  const res = await fetch(`${GATEWAY}?key=${encodeURIComponent(COH_APP_KEY)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "attune/1" },
    body: JSON.stringify({
      model: opts.model ?? COACH_MODEL,
      messages,
      max_tokens: opts.maxTokens ?? 400,
      temperature: opts.temperature ?? 0.4,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`AI ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? "";
}

/** Pull the first JSON object out of a model reply (tolerates code fences / prose). */
export function extractJson<T = unknown>(text: string): T | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

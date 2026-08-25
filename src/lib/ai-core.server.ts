import { streamText, Output, NoObjectGeneratedError } from "ai";
import type { z } from "zod";

import { CHAT_MODEL, createLovableAiGatewayProvider, gatewayErrorMessage } from "./ai-gateway.server";
import type { EmailRequest, MeetingRequest, PlanRequest } from "./ai-schemas";
import { EmailOutput, MeetingOutput, PlanOutput } from "./ai-schemas";

const GUARDRAILS = `
Ground rules you must always follow:
- Use only the information the user provided. Never invent names, dates, numbers, prices, or commitments.
- When something important is missing or unclear, insert a clearly marked placeholder like [DATE] or [NAME] instead of guessing.
- If the input is vague, still return the required structure and use placeholders plus a short note.
- Never add sensitive personal data that was not supplied.
- Write in plain, natural language. No markdown headings, no emojis, no filler.
`.trim();

function getModel() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured (missing key).");
  return createLovableAiGatewayProvider(key)(CHAT_MODEL);
}

async function generateStructured<T>(args: {
  schema: z.ZodType<T>;
  system: string;
  prompt: string;
}): Promise<T> {
  try {
    const result = streamText({
      model: getModel(),
      system: args.system,
      prompt: args.prompt,
      output: Output.object({ schema: args.schema as never }),
    });
    return (await result.output) as T;
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      throw new Error("The AI returned an unexpected response. Please try again.");
    }
    throw new Error(gatewayErrorMessage(error));
  }
}

export async function runEmailGeneration(data: EmailRequest) {
  const lengthGuide = {
    Short: "about 60-90 words, 1-2 tight paragraphs",
    Medium: "about 120-180 words, 2-3 paragraphs",
    Long: "about 220-320 words, 3-5 paragraphs with clear structure",
  }[data.length];

  return generateStructured({
    schema: EmailOutput,
    system: `You are an expert business communication writer who drafts clear, well-structured emails that people actually send.

Context: you write on behalf of a professional who gives you a rough purpose and a few details. Turn that into a polished, ready-to-send email plus subject-line options.

Output format: subjectSuggestions (3-5 short, specific, non-clickbait subject lines), body (greeting, body paragraphs, closing and sign-off separated by blank lines), and notes (assumptions or placeholders used; empty string if none).

${GUARDRAILS}`,
    prompt: `Tone: ${data.tone}
Target length: ${data.length} (${lengthGuide})
Recipient: ${data.recipient?.trim() || "not specified — use a neutral greeting"}
Sender: ${data.sender?.trim() || "not specified — sign off with [YOUR NAME]"}

Purpose and details from the user:
"""
${data.purpose.trim()}
"""`,
  });
}

export async function runMeetingSummary(data: MeetingRequest) {
  return generateStructured({
    schema: MeetingOutput,
    system: `You are a meticulous executive assistant who turns messy meeting notes into structured minutes.

Context: the input is raw, possibly fragmented notes typed during a meeting. Extract only what is genuinely there.

Output format: summary (3-6 sentences), keyPoints, decisions, actionItems (task, owner, deadline), followUps (open questions), participants. Use empty arrays when a category truly has nothing. Never label a discussion point as a decision unless something was actually decided. Use "Unassigned" and "No deadline stated" rather than guessing owners or dates.

${GUARDRAILS}`,
    prompt: `${data.context?.trim() ? `Meeting context: ${data.context.trim()}\n\n` : ""}Raw notes:
"""
${data.notes.trim()}
"""`,
  });
}

export async function runSchedulePlanning(data: PlanRequest) {
  return generateStructured({
    schema: PlanOutput,
    system: `You are a productivity coach and scheduling expert who builds realistic plans.

Context: you receive open tasks with priority, optional deadline and optional time estimate, plus a planning horizon.

How to prioritize: urgency (closest deadline first), then stated priority, then effort — group quick wins together and protect deep-work time for large high-priority tasks. Never overload a block beyond the available time; if the workload does not fit, say so in advice instead of compressing estimates.

Output format: blocks (Daily => time blocks within one day; Weekly => one block per weekday), each item referencing the exact taskId given. orderedTaskIds must contain every input task id exactly once, sorted best-first. advice is 2-4 sentences. Keep each rationale to one short sentence.

${GUARDRAILS}`,
    prompt: `Planning horizon: ${data.mode}
Available working time: ${data.workingHours?.trim() || "standard 9:00-17:00 workday"}
Today: ${new Date().toISOString().slice(0, 10)}

Tasks:
${data.tasks
  .map(
    (t) =>
      `- id=${t.id} | ${t.title} | priority=${t.priority} | deadline=${t.deadline || "none"} | estimate=${
        t.estimateMinutes ? `${t.estimateMinutes} min` : "unknown"
      }`,
  )
  .join("\n")}`,
  });
}

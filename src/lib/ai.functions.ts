import { createServerFn } from "@tanstack/react-start";
import { streamText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";

import { CHAT_MODEL, createLovableAiGatewayProvider, gatewayErrorMessage } from "./ai-gateway.server";

/* ---------------------------------- shared --------------------------------- */

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

const GUARDRAILS = `
Ground rules you must always follow:
- Use only the information the user provided. Never invent names, dates, numbers, prices, or commitments.
- When something important is missing or unclear, insert a clearly marked placeholder like [DATE] or [NAME] instead of guessing.
- If the input is too vague or empty, still return the required structure and use placeholders plus a short note.
- Never include sensitive personal data that was not supplied.
- Write in plain, natural language. No markdown headings, no emojis, no filler.
`.trim();

/* ------------------------------ email generator ----------------------------- */

const EmailInput = z.object({
  purpose: z.string().min(1).max(6000),
  tone: z.enum(["Formal", "Friendly", "Professional", "Persuasive", "Apologetic", "Casual"]),
  length: z.enum(["Short", "Medium", "Long"]),
  recipient: z.string().max(200).optional(),
  sender: z.string().max(200).optional(),
});

const EmailOutput = z.object({
  subjectSuggestions: z.array(z.string()).describe("3 to 5 distinct subject lines"),
  body: z.string().describe("The full email body including greeting and sign-off"),
  notes: z.string().describe("Short note about assumptions or placeholders used; empty string if none"),
});

export const generateEmail = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => EmailInput.parse(input))
  .handler(async ({ data }) => {
    const lengthGuide = {
      Short: "about 60-90 words, 1-2 tight paragraphs",
      Medium: "about 120-180 words, 2-3 paragraphs",
      Long: "about 220-320 words, 3-5 paragraphs with clear structure",
    }[data.length];

    return generateStructured({
      schema: EmailOutput,
      system: `You are an expert business communication writer who drafts clear, well-structured emails that people actually send.

Context: you write on behalf of a professional who gives you a rough purpose and a few details. Your job is to turn that into a polished, ready-to-send email plus subject-line options.

Output format: return subjectSuggestions (3-5 short, specific, non-clickbait subject lines), body (greeting, body paragraphs, closing and sign-off, separated by blank lines), and notes.

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
  });

/* --------------------------- meeting notes summarizer ------------------------ */

const MeetingInput = z.object({
  notes: z.string().min(1).max(20000),
  context: z.string().max(500).optional(),
});

const MeetingOutput = z.object({
  summary: z.string().describe("A concise 3-6 sentence summary of the meeting"),
  keyPoints: z.array(z.string()),
  decisions: z.array(z.string()),
  actionItems: z.array(
    z.object({
      task: z.string(),
      owner: z.string().describe("Responsible person, or 'Unassigned'"),
      deadline: z.string().describe("Deadline as stated, or 'No deadline stated'"),
    }),
  ),
  followUps: z.array(z.string()).describe("Open questions and follow-ups"),
  participants: z.array(z.string()).describe("People mentioned as involved"),
});

export const summarizeMeeting = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => MeetingInput.parse(input))
  .handler(async ({ data }) => {
    return generateStructured({
      schema: MeetingOutput,
      system: `You are a meticulous executive assistant who turns messy meeting notes into structured minutes.

Context: the input is raw, possibly fragmented notes typed during a meeting. Extract only what is genuinely there.

Output format: summary, keyPoints, decisions, actionItems (task, owner, deadline), followUps, participants. Use empty arrays when a category truly has nothing. Never merge a discussion point into a "decision" unless the notes show something was actually decided. Use "Unassigned" and "No deadline stated" rather than guessing owners or dates.

${GUARDRAILS}`,
      prompt: `${data.context?.trim() ? `Meeting context: ${data.context.trim()}\n\n` : ""}Raw notes:
"""
${data.notes.trim()}
"""`,
    });
  });

/* -------------------------------- task planner ------------------------------- */

const TaskInput = z.object({
  mode: z.enum(["Daily", "Weekly"]),
  workingHours: z.string().max(120).optional(),
  tasks: z
    .array(
      z.object({
        id: z.string(),
        title: z.string().min(1),
        priority: z.enum(["High", "Medium", "Low"]),
        deadline: z.string().optional(),
        estimateMinutes: z.number().int().min(0).max(10000).optional(),
      }),
    )
    .min(1)
    .max(60),
});

const PlanOutput = z.object({
  blocks: z.array(
    z.object({
      label: z.string().describe("Day or time block label, e.g. 'Monday' or 'Morning (9:00-12:00)'"),
      items: z.array(
        z.object({
          taskId: z.string().describe("The id of the matching input task"),
          title: z.string(),
          suggestedTime: z.string().describe("Suggested slot, e.g. '09:00-10:30'"),
          rationale: z.string().describe("One short sentence on why it is placed here"),
        }),
      ),
    }),
  ),
  orderedTaskIds: z.array(z.string()).describe("All input task ids sorted best-first"),
  advice: z.string().describe("2-4 sentences of practical scheduling advice"),
});

export const generateSchedule = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => TaskInput.parse(input))
  .handler(async ({ data }) => {
    return generateStructured({
      schema: PlanOutput,
      system: `You are a productivity coach and scheduling expert who builds realistic plans.

Context: you receive a list of open tasks with priority, optional deadline and optional time estimate, plus a planning horizon.

How to prioritize: urgency (closest deadline first), then stated priority, then effort — group quick wins together and protect deep-work time for large high-priority tasks. Do not overload a block beyond the available time; if the workload does not fit, say so in advice rather than compressing estimates.

Output format: blocks (${"Daily"} => time blocks within one day; Weekly => one block per weekday), each with items referencing the exact taskId given. orderedTaskIds must contain every input task id exactly once. Keep rationales to one short sentence.

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
  });

export type EmailResult = z.infer<typeof EmailOutput>;
export type MeetingResult = z.infer<typeof MeetingOutput>;
export type PlanResult = z.infer<typeof PlanOutput>;

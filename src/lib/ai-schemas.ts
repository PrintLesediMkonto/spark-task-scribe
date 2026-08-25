import { z } from "zod";

export const EmailInput = z.object({
  purpose: z.string().min(1).max(6000),
  tone: z.enum(["Formal", "Friendly", "Professional", "Persuasive", "Apologetic", "Casual"]),
  length: z.enum(["Short", "Medium", "Long"]),
  recipient: z.string().max(200).optional(),
  sender: z.string().max(200).optional(),
});

export const EmailOutput = z.object({
  subjectSuggestions: z.array(z.string()).describe("3 to 5 distinct subject lines"),
  body: z.string().describe("The full email body including greeting and sign-off"),
  notes: z.string().describe("Short note about assumptions or placeholders used; empty string if none"),
});

export const MeetingInput = z.object({
  notes: z.string().min(1).max(20000),
  context: z.string().max(500).optional(),
});

export const MeetingOutput = z.object({
  summary: z.string(),
  keyPoints: z.array(z.string()),
  decisions: z.array(z.string()),
  actionItems: z.array(
    z.object({
      task: z.string(),
      owner: z.string(),
      deadline: z.string(),
    }),
  ),
  followUps: z.array(z.string()),
  participants: z.array(z.string()),
});

export const TaskInput = z.object({
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

export const PlanOutput = z.object({
  blocks: z.array(
    z.object({
      label: z.string(),
      items: z.array(
        z.object({
          taskId: z.string(),
          title: z.string(),
          suggestedTime: z.string(),
          rationale: z.string(),
        }),
      ),
    }),
  ),
  orderedTaskIds: z.array(z.string()),
  advice: z.string(),
});

export type EmailResult = z.infer<typeof EmailOutput>;
export type MeetingResult = z.infer<typeof MeetingOutput>;
export type PlanResult = z.infer<typeof PlanOutput>;
export type EmailRequest = z.infer<typeof EmailInput>;
export type MeetingRequest = z.infer<typeof MeetingInput>;
export type PlanRequest = z.infer<typeof TaskInput>;

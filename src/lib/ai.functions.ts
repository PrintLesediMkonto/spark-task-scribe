import { createServerFn } from "@tanstack/react-start";

import { EmailInput, MeetingInput, TaskInput } from "./ai-schemas";

export const generateEmail = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => EmailInput.parse(input))
  .handler(async ({ data }) => {
    const { runEmailGeneration } = await import("./ai-core.server");
    return runEmailGeneration(data);
  });

export const summarizeMeeting = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => MeetingInput.parse(input))
  .handler(async ({ data }) => {
    const { runMeetingSummary } = await import("./ai-core.server");
    return runMeetingSummary(data);
  });

export const generateSchedule = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => TaskInput.parse(input))
  .handler(async ({ data }) => {
    const { runSchedulePlanning } = await import("./ai-core.server");
    return runSchedulePlanning(data);
  });

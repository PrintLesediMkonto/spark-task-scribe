import { Eye, ShieldCheck, TriangleAlert, UserCheck } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const POINTS = [
  {
    icon: Eye,
    title: "Review before you use it",
    body: "Every draft, summary and schedule is a starting point. Read it, correct it, and make it yours before sending or acting on it.",
  },
  {
    icon: ShieldCheck,
    title: "Keep sensitive data out",
    body: "Avoid pasting ID numbers, banking details, health information, passwords or confidential contracts into any AI tool, including this one.",
  },
  {
    icon: TriangleAlert,
    title: "AI can be wrong",
    body: "The assistant may misread notes, miss context, or fill gaps with placeholders. It never invents facts on purpose, but mistakes still happen.",
  },
  {
    icon: UserCheck,
    title: "You stay accountable",
    body: "Human judgement decides what gets sent, committed to, or scheduled. Use AI to save time, not to hand over responsibility.",
  },
];

export function ResponsibleAI() {
  return (
    <Card id="responsible-ai" className="shadow-[var(--shadow-card)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-primary" /> Responsible AI
        </CardTitle>
        <CardDescription>How to get value from these tools without getting burned.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {POINTS.map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center gap-2">
              <Icon className="size-4 text-primary" />
              <h3 className="font-display text-sm font-semibold">{title}</h3>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

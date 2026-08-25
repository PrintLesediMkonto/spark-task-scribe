import { createFileRoute } from "@tanstack/react-router";
import { CalendarClock, FileText, Mail, Sparkles } from "lucide-react";
import { useState } from "react";

import { EmailGenerator } from "@/components/tools/EmailGenerator";
import { MeetingNotes } from "@/components/tools/MeetingNotes";
import { ResponsibleAI } from "@/components/tools/ResponsibleAI";
import { TaskPlanner } from "@/components/tools/TaskPlanner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Flowdesk — AI Email, Meeting Notes & Task Planner" },
      {
        name: "description",
        content:
          "Three AI productivity tools in one dashboard: write emails in any tone, turn messy meeting notes into decisions and action items, and build a prioritized schedule. No sign-up needed.",
      },
      { property: "og:title", content: "Flowdesk — AI Productivity Dashboard" },
      {
        property: "og:description",
        content:
          "Draft emails, summarize meeting notes and plan your day with AI. Free to use, no account required.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const TOOLS = [
  {
    value: "email",
    label: "Email Generator",
    icon: Mail,
    blurb: "Turn a rough idea into a ready-to-send email with subject lines.",
  },
  {
    value: "notes",
    label: "Meeting Notes",
    icon: FileText,
    blurb: "Extract summary, decisions, owners and deadlines from raw notes.",
  },
  {
    value: "planner",
    label: "Task Planner",
    icon: CalendarClock,
    blurb: "Prioritize tasks and get a realistic daily or weekly schedule.",
  },
];

function Dashboard() {
  const [tab, setTab] = useState("email");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Sparkles className="size-5" />
            </span>
            <div>
              <p className="font-display text-lg font-semibold leading-none">Flowdesk</p>
              <p className="text-xs text-muted-foreground">AI productivity workspace</p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-1 text-sm">
            {TOOLS.map((t) => (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={`rounded-lg px-3 py-1.5 transition-colors ${
                  tab === t.value
                    ? "bg-secondary font-medium text-secondary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
            <a
              href="#responsible-ai"
              className="rounded-lg px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              Responsible AI
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
        <section
          className="rounded-2xl px-6 py-10 text-primary-foreground sm:px-10"
          style={{ background: "var(--gradient-hero)" }}
        >
          <h1 className="max-w-2xl text-3xl font-bold sm:text-4xl">
            Write, summarize and plan — in one place
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed opacity-90 sm:text-base">
            Flowdesk gives you three focused AI assistants for the admin work that eats your day. No
            account, no setup — pick a tool and start.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {TOOLS.map(({ value, label, icon: Icon, blurb }) => (
              <button
                key={value}
                onClick={() => setTab(value)}
                className="rounded-xl border border-primary-foreground/20 bg-primary-foreground/10 p-4 text-left transition-colors hover:bg-primary-foreground/20"
              >
                <Icon className="size-5" />
                <p className="mt-2 font-display font-semibold">{label}</p>
                <p className="mt-1 text-xs opacity-85">{blurb}</p>
              </button>
            ))}
          </div>
        </section>

        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-1 gap-1 sm:w-auto sm:grid-cols-3">
            {TOOLS.map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value} className="gap-2">
                <Icon className="size-4" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="email">
            <EmailGenerator />
          </TabsContent>
          <TabsContent value="notes">
            <MeetingNotes />
          </TabsContent>
          <TabsContent value="planner">
            <TaskPlanner />
          </TabsContent>
        </Tabs>

        <ResponsibleAI />
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        Flowdesk · AI-generated content should always be reviewed by a human before use.
      </footer>
    </div>
  );
}

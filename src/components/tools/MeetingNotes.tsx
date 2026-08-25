import { useServerFn } from "@tanstack/react-start";
import { Download, FileText, RefreshCw, Sparkles, Trash2, Wand2 } from "lucide-react";
import { useState } from "react";

import { CopyButton, EmptyState, ErrorState, LoadingState, SectionList } from "@/components/tools/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { summarizeMeeting } from "@/lib/ai.functions";
import type { MeetingResult } from "@/lib/ai-schemas";

const SAMPLE = `Weekly ops sync - 22 Aug
Present: Lesedi, Thandi, Sipho, Ana (joined late)
- Q3 supplier costs up 11%, mostly logistics. Sipho pulling exact numbers.
- Debated switching courier. Agreed to run a 2-week pilot with FastRoute starting 1 Sep.
- Website checkout bug: 3 complaints last week. Ana says fix is ready, needs QA.
- Decided NOT to hire a second ops assistant this quarter, revisit in Oct.
- Thandi to send updated vendor list by Friday.
- Lesedi will draft the courier pilot brief before the 29th.
- Open question: do we need legal to review the FastRoute contract? Nobody knew.`;

function toMarkdown(r: MeetingResult) {
  const list = (items: string[]) => (items.length ? items.map((i) => `- ${i}`).join("\n") : "- None recorded");
  return `# Meeting Notes Summary

## Summary
${r.summary}

## Key Discussion Points
${list(r.keyPoints)}

## Decisions Made
${list(r.decisions)}

## Action Items
${
  r.actionItems.length
    ? r.actionItems.map((a) => `- ${a.task} — Owner: ${a.owner} — Due: ${a.deadline}`).join("\n")
    : "- None recorded"
}

## Follow-ups & Open Questions
${list(r.followUps)}

## People Involved
${list(r.participants)}
`;
}

export function MeetingNotes() {
  const run = useServerFn(summarizeMeeting);

  const [notes, setNotes] = useState("");
  const [context, setContext] = useState("");
  const [result, setResult] = useState<MeetingResult | null>(null);
  const [editable, setEditable] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (!notes.trim()) {
      setError("Paste some meeting notes first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await run({ data: { notes, context: context || undefined } });
      setResult(data);
      setEditable(toMarkdown(data));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not summarize the notes.");
    } finally {
      setLoading(false);
    }
  }

  function download() {
    const blob = new Blob([editable], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "meeting-notes-summary.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  function clearAll() {
    setNotes("");
    setContext("");
    setResult(null);
    setEditable("");
    setError(null);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <Card className="h-fit shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-5 text-primary" /> Raw notes
          </CardTitle>
          <CardDescription>Messy bullet points are fine — that's the point.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="meeting-context">Meeting context (optional)</Label>
            <Input
              id="meeting-context"
              placeholder="e.g. Weekly operations sync"
              value={context}
              onChange={(e) => setContext(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="meeting-notes">Notes</Label>
            <Textarea
              id="meeting-notes"
              rows={14}
              placeholder="Paste or type your meeting notes here…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={generate} disabled={loading}>
              <Wand2 className="size-4" /> {loading ? "Summarizing…" : "Summarize notes"}
            </Button>
            <Button variant="secondary" onClick={() => setNotes(SAMPLE)} disabled={loading}>
              <Sparkles className="size-4" /> Load sample
            </Button>
            <Button variant="ghost" onClick={clearAll} disabled={loading}>
              <Trash2 className="size-4" /> Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Structured minutes</CardTitle>
            <CardDescription>Summary, decisions, actions and owners.</CardDescription>
          </div>
          {result ? (
            <div className="flex flex-wrap gap-2">
              <CopyButton value={editable} label="Copy" />
              <Button variant="outline" size="sm" onClick={download}>
                <Download className="size-4" /> Download
              </Button>
              <Button variant="outline" size="sm" onClick={generate} disabled={loading}>
                <RefreshCw className="size-4" /> Regenerate
              </Button>
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-5">
          {error ? <ErrorState message={error} onRetry={notes.trim() ? generate : undefined} /> : null}

          {loading ? (
            <LoadingState message="Reading the notes and extracting decisions…" />
          ) : result ? (
            <>
              <div>
                <h4 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Summary
                </h4>
                <p className="mt-2 text-sm leading-relaxed">{result.summary}</p>
              </div>
              <Separator />
              <SectionList title="Key discussion points" items={result.keyPoints} emptyLabel="No distinct discussion points found." />
              <SectionList title="Decisions made" items={result.decisions} emptyLabel="No decisions were recorded." />

              <div>
                <h4 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Action items
                </h4>
                {result.actionItems.length === 0 ? (
                  <p className="mt-2 text-sm italic text-muted-foreground">No action items found.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {result.actionItems.map((a, i) => (
                      <li key={i} className="rounded-lg border border-border bg-surface p-3 text-sm">
                        <p className="font-medium">{a.task}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant="secondary">Owner: {a.owner}</Badge>
                          <Badge variant="outline">Due: {a.deadline}</Badge>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <SectionList title="Follow-ups & open questions" items={result.followUps} emptyLabel="Nothing outstanding." />
              <SectionList title="People involved" items={result.participants} emptyLabel="No names mentioned." />

              <Separator />
              <div className="space-y-2">
                <Label htmlFor="minutes-edit">Editable minutes (copied & downloaded as-is)</Label>
                <Textarea
                  id="minutes-edit"
                  rows={12}
                  value={editable}
                  onChange={(e) => setEditable(e.target.value)}
                />
              </div>
            </>
          ) : !error ? (
            <EmptyState
              icon={<FileText className="size-8" />}
              title="No summary yet"
              description="Paste your notes on the left, or load the sample meeting, then summarize."
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

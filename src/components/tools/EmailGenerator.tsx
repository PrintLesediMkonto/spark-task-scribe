import { useServerFn } from "@tanstack/react-start";
import { Mail, RefreshCw, Sparkles, Trash2, Wand2 } from "lucide-react";
import { useState } from "react";

import { CopyButton, EmptyState, ErrorState, LoadingState } from "@/components/tools/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { generateEmail } from "@/lib/ai.functions";
import type { EmailResult } from "@/lib/ai-schemas";

const TONES = [
  "Formal",
  "Friendly",
  "Professional",
  "Persuasive",
  "Apologetic",
  "Casual",
] as const;
const LENGTHS = ["Short", "Medium", "Long"] as const;

const SAMPLE = {
  purpose:
    "Ask the vendor (Brightline Supplies) for an updated quote on 200 office chairs. We received their first quote on 12 August but the delivery window of 8 weeks is too long. We need delivery within 4 weeks and would like to know if a smaller first batch of 80 chairs is possible.",
  recipient: "Thandi Nkosi, Account Manager at Brightline Supplies",
  sender: "Lesedi Mkonto, Operations Lead",
};

export function EmailGenerator() {
  const run = useServerFn(generateEmail);

  const [purpose, setPurpose] = useState("");
  const [recipient, setRecipient] = useState("");
  const [sender, setSender] = useState("");
  const [tone, setTone] = useState<(typeof TONES)[number]>("Professional");
  const [length, setLength] = useState<(typeof LENGTHS)[number]>("Medium");

  const [result, setResult] = useState<EmailResult | null>(null);
  const [draft, setDraft] = useState("");
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (!purpose.trim()) {
      setError("Please describe the purpose of the email first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await run({
        data: { purpose, tone, length, recipient: recipient || undefined, sender: sender || undefined },
      });
      setResult(data);
      setDraft(data.body);
      setSubject(data.subjectSuggestions[0] ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate the email.");
    } finally {
      setLoading(false);
    }
  }

  function clearAll() {
    setPurpose("");
    setRecipient("");
    setSender("");
    setResult(null);
    setDraft("");
    setSubject("");
    setError(null);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <Card className="h-fit shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="size-5 text-primary" /> Email brief
          </CardTitle>
          <CardDescription>Tell the assistant what the email needs to achieve.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-purpose">Purpose and details</Label>
            <Textarea
              id="email-purpose"
              rows={7}
              placeholder="e.g. Follow up with a supplier about a delayed quote and request faster delivery…"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email-recipient">Recipient (optional)</Label>
              <Input
                id="email-recipient"
                placeholder="Name and role"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-sender">Your name (optional)</Label>
              <Input
                id="email-sender"
                placeholder="Name and role"
                value={sender}
                onChange={(e) => setSender(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Tone</Label>
              <Select value={tone} onValueChange={(v) => setTone(v as typeof tone)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Length</Label>
              <Select value={length} onValueChange={(v) => setLength(v as typeof length)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LENGTHS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button onClick={generate} disabled={loading}>
              <Wand2 className="size-4" />
              {loading ? "Generating…" : "Generate email"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setPurpose(SAMPLE.purpose);
                setRecipient(SAMPLE.recipient);
                setSender(SAMPLE.sender);
              }}
              disabled={loading}
            >
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
            <CardTitle>Draft</CardTitle>
            <CardDescription>Edit anything before you send it.</CardDescription>
          </div>
          {result ? (
            <div className="flex flex-wrap gap-2">
              <CopyButton value={`Subject: ${subject}\n\n${draft}`} label="Copy email" />
              <Button variant="outline" size="sm" onClick={generate} disabled={loading}>
                <RefreshCw className="size-4" /> Regenerate
              </Button>
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? <ErrorState message={error} onRetry={purpose.trim() ? generate : undefined} /> : null}

          {loading ? (
            <LoadingState message="Drafting your email…" />
          ) : result ? (
            <>
              <div className="space-y-2">
                <Label>Subject suggestions</Label>
                <div className="flex flex-wrap gap-2">
                  {result.subjectSuggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSubject(s)}
                      className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                        subject === s
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-surface text-surface-foreground hover:border-primary/50"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email-body">Email body</Label>
                <Textarea
                  id="email-body"
                  rows={16}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="font-sans leading-relaxed"
                />
              </div>

              {result.notes ? (
                <div className="rounded-lg border border-border bg-surface p-3 text-sm text-muted-foreground">
                  <Badge variant="secondary" className="mb-2">
                    Assumptions
                  </Badge>
                  <p>{result.notes}</p>
                </div>
              ) : null}
            </>
          ) : !error ? (
            <EmptyState
              icon={<Mail className="size-8" />}
              title="No draft yet"
              description="Fill in the brief on the left, or load the sample, then generate an email."
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

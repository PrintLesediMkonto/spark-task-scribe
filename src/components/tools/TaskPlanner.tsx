import { useServerFn } from "@tanstack/react-start";
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  ListChecks,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { CopyButton, EmptyState, ErrorState, LoadingState } from "@/components/tools/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateSchedule } from "@/lib/ai.functions";
import type { PlanResult } from "@/lib/ai-schemas";

type Priority = "High" | "Medium" | "Low";

type Task = {
  id: string;
  title: string;
  priority: Priority;
  deadline: string;
  estimateMinutes: number | "";
  done: boolean;
};

const STORAGE_KEY = "ai-task-planner:v1";

const SAMPLE_TASKS: Task[] = [
  { id: "t1", title: "Draft Q3 supplier cost report", priority: "High", deadline: "", estimateMinutes: 120, done: false },
  { id: "t2", title: "QA the checkout bug fix", priority: "High", deadline: "", estimateMinutes: 60, done: false },
  { id: "t3", title: "Send updated vendor list", priority: "Medium", deadline: "", estimateMinutes: 30, done: false },
  { id: "t4", title: "Write courier pilot brief", priority: "Medium", deadline: "", estimateMinutes: 90, done: false },
  { id: "t5", title: "Tidy shared drive folders", priority: "Low", deadline: "", estimateMinutes: 45, done: false },
];

const priorityStyles: Record<Priority, string> = {
  High: "border-destructive/30 bg-destructive/10 text-destructive",
  Medium: "border-warning/40 bg-warning/15 text-warning-foreground",
  Low: "border-success/30 bg-success/10 text-success",
};

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

export function TaskPlanner() {
  const run = useServerFn(generateSchedule);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [mode, setMode] = useState<"Daily" | "Weekly">("Daily");
  const [workingHours, setWorkingHours] = useState("");
  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [deadline, setDeadline] = useState("");
  const [estimate, setEstimate] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setTasks(JSON.parse(raw) as Task[]);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      /* ignore */
    }
  }, [tasks]);

  const completed = tasks.filter((t) => t.done).length;
  const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const totalMinutes = useMemo(
    () => tasks.filter((t) => !t.done).reduce((sum, t) => sum + (Number(t.estimateMinutes) || 0), 0),
    [tasks],
  );

  function addTask() {
    if (!title.trim()) {
      setError("Give the task a name first.");
      return;
    }
    setError(null);
    setTasks((prev) => [
      ...prev,
      {
        id: newId(),
        title: title.trim(),
        priority,
        deadline,
        estimateMinutes: estimate ? Number(estimate) : "",
        done: false,
      },
    ]);
    setTitle("");
    setDeadline("");
    setEstimate("");
    setPriority("Medium");
  }

  function update(id: string, patch: Partial<Task>) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function move(index: number, dir: -1 | 1) {
    setTasks((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function buildPlan() {
    const open = tasks.filter((t) => !t.done);
    if (open.length === 0) {
      setError("Add at least one open task before generating a schedule.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await run({
        data: {
          mode,
          workingHours: workingHours || undefined,
          tasks: open.map((t) => ({
            id: t.id,
            title: t.title,
            priority: t.priority,
            deadline: t.deadline || undefined,
            estimateMinutes: t.estimateMinutes === "" ? undefined : Number(t.estimateMinutes),
          })),
        },
      });
      setPlan(data);
      setTasks((prev) => {
        const rank = new Map(data.orderedTaskIds.map((id, i) => [id, i]));
        return [...prev].sort(
          (a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999),
        );
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not build the schedule.");
    } finally {
      setLoading(false);
    }
  }

  const planText = plan
    ? `${mode} plan\n\n${plan.blocks
        .map(
          (b) =>
            `${b.label}\n${b.items.map((i) => `  • ${i.suggestedTime} — ${i.title} (${i.rationale})`).join("\n")}`,
        )
        .join("\n\n")}\n\nAdvice: ${plan.advice}`
    : "";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card className="h-fit shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="size-5 text-primary" /> Your tasks
          </CardTitle>
          <CardDescription>Tasks are kept on this device only.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 rounded-xl border border-border bg-surface p-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="task-title">Task</Label>
              <Input
                id="task-title"
                placeholder="e.g. Prepare Q3 cost report"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTask()}
              />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["High", "Medium", "Low"] as Priority[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-deadline">Deadline</Label>
              <Input
                id="task-deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-estimate">Estimated minutes</Label>
              <Input
                id="task-estimate"
                type="number"
                min={0}
                placeholder="60"
                value={estimate}
                onChange={(e) => setEstimate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button className="w-full" onClick={addTask}>
                <Plus className="size-4" /> Add task
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {completed} of {tasks.length} done · {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
                remaining
              </span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>

          {tasks.length === 0 ? (
            <EmptyState
              icon={<ListChecks className="size-8" />}
              title="No tasks yet"
              description="Add your first task above, or load a sample list to try the planner."
            />
          ) : (
            <ul className="space-y-2">
              {tasks.map((task, index) => (
                <li
                  key={task.id}
                  className="rounded-xl border border-border bg-card p-3 transition-shadow hover:shadow-[var(--shadow-card)]"
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={task.done}
                      onCheckedChange={(v) => update(task.id, { done: Boolean(v) })}
                      className="mt-1"
                    />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Input
                        value={task.title}
                        onChange={(e) => update(task.id, { title: e.target.value })}
                        className={`border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 ${
                          task.done ? "text-muted-foreground line-through" : "font-medium"
                        }`}
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <Select
                          value={task.priority}
                          onValueChange={(v) => update(task.id, { priority: v as Priority })}
                        >
                          <SelectTrigger className="h-8 w-28 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(["High", "Medium", "Low"] as Priority[]).map((p) => (
                              <SelectItem key={p} value={p}>
                                {p}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Badge variant="outline" className={priorityStyles[task.priority]}>
                          {task.priority}
                        </Badge>
                        <Input
                          type="date"
                          value={task.deadline}
                          onChange={(e) => update(task.id, { deadline: e.target.value })}
                          className="h-8 w-40 text-xs"
                        />
                        <Input
                          type="number"
                          min={0}
                          value={task.estimateMinutes}
                          onChange={(e) =>
                            update(task.id, {
                              estimateMinutes: e.target.value === "" ? "" : Number(e.target.value),
                            })
                          }
                          className="h-8 w-24 text-xs"
                          placeholder="min"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button variant="ghost" size="icon" className="size-7" onClick={() => move(index, -1)}>
                        <ArrowUp className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-7" onClick={() => move(index, 1)}>
                        <ArrowDown className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive"
                        onClick={() => setTasks((prev) => prev.filter((t) => t.id !== task.id))}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setTasks(SAMPLE_TASKS)}>
              <Sparkles className="size-4" /> Load sample tasks
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setTasks([]);
                setPlan(null);
                setError(null);
              }}
            >
              <Trash2 className="size-4" /> Clear all
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="size-5 text-primary" /> AI schedule
            </CardTitle>
            <CardDescription>Prioritized by deadline, importance and effort.</CardDescription>
          </div>
          {plan ? (
            <div className="flex gap-2">
              <CopyButton value={planText} label="Copy plan" />
              <Button variant="outline" size="sm" onClick={buildPlan} disabled={loading}>
                <RefreshCw className="size-4" /> Regenerate
              </Button>
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[160px_1fr_auto] sm:items-end">
            <div className="space-y-2">
              <Label>Planning</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as "Daily" | "Weekly")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Daily">Daily</SelectItem>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hours">Working hours (optional)</Label>
              <Input
                id="hours"
                placeholder="e.g. 08:30-16:00, no meetings after 15:00"
                value={workingHours}
                onChange={(e) => setWorkingHours(e.target.value)}
              />
            </div>
            <Button onClick={buildPlan} disabled={loading}>
              <Wand2 className="size-4" /> {loading ? "Planning…" : "Generate schedule"}
            </Button>
          </div>

          {error ? <ErrorState message={error} /> : null}

          {loading ? (
            <LoadingState message="Prioritizing tasks and building your schedule…" />
          ) : plan ? (
            <div className="space-y-4">
              {plan.blocks.map((block) => (
                <div key={block.label} className="rounded-xl border border-border bg-surface p-4">
                  <h4 className="font-display text-sm font-semibold uppercase tracking-wide text-primary">
                    {block.label}
                  </h4>
                  <ul className="mt-3 space-y-3">
                    {block.items.map((item) => (
                      <li key={item.taskId + item.suggestedTime} className="text-sm">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <Badge variant="secondary">{item.suggestedTime}</Badge>
                          <span className="font-medium">{item.title}</span>
                        </div>
                        <p className="mt-1 text-muted-foreground">{item.rationale}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
                <p className="font-display font-semibold">Coach's advice</p>
                <p className="mt-1 text-muted-foreground">{plan.advice}</p>
              </div>
            </div>
          ) : !error ? (
            <EmptyState
              icon={<CalendarClock className="size-8" />}
              title="No schedule yet"
              description="Add tasks, pick daily or weekly planning, then generate an organized schedule."
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

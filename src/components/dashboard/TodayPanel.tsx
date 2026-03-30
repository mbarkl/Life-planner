"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { type Item, type CalendarEvent } from "@/lib/types";
import {
  CheckCircle2,
  Circle,
  Clock,
  ArrowUpCircle,
  ArrowRightCircle,
  ArrowDownCircle,
  Calendar,
  CalendarDays,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const priorityConfig = {
  high: { icon: ArrowUpCircle, color: "text-red-400" },
  medium: { icon: ArrowRightCircle, color: "text-amber-400" },
  low: { icon: ArrowDownCircle, color: "text-blue-400" },
};

export function TodayPanel() {
  const [tasks, setTasks] = useState<Item[]>([]);
  const [habits, setHabits] = useState<Item[]>([]);
  const [completedHabits, setCompletedHabits] = useState<Set<string>>(new Set());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    const supabase = createClient();
    const today = new Date().toISOString().split("T")[0];

    // Regular one-off tasks
    const { data: taskData } = await supabase
      .from("items")
      .select("*, category:categories(*), project:projects(*)")
      .eq("type", "task")
      .eq("recurring", false)
      .in("status", ["open", "in_progress"])
      .or(`suggested_date.eq.${today},due_date.eq.${today},suggested_date.is.null`)
      .order("priority", { ascending: true })
      .limit(15);

    const sorted = (taskData ?? []).sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return (order[a.priority as keyof typeof order] ?? 1) - (order[b.priority as keyof typeof order] ?? 1);
    });
    setTasks(sorted);

    // Recurring habits - always show all active ones
    const { data: habitData } = await supabase
      .from("items")
      .select("*, category:categories(*), project:projects(*)")
      .eq("type", "task")
      .eq("recurring", true)
      .in("status", ["open", "in_progress", "done"])
      .order("created_at", { ascending: true });

    setHabits(habitData ?? []);

    // Mark habits that were completed today
    const todayCompleted = new Set<string>();
    (habitData ?? []).forEach((h) => {
      if (h.status === "done" && h.updated_at?.startsWith(today)) {
        todayCompleted.add(h.id);
      }
    });
    setCompletedHabits(todayCompleted);
  };

  const fetchCalendar = async () => {
    try {
      const res = await fetch("/api/calendar");
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events ?? []);
      }
    } catch {
      // Calendar is optional
    }
  };

  useEffect(() => {
    Promise.all([fetchTasks(), fetchCalendar()]).finally(() => setLoading(false));
  }, []);

  const toggleTask = async (task: Item) => {
    const supabase = createClient();
    const newStatus = task.status === "done" ? "open" : "done";
    await supabase.from("items").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", task.id);
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)));
  };

  const toggleHabit = async (habit: Item) => {
    const supabase = createClient();
    const isDoneToday = completedHabits.has(habit.id);
    // Habits reset daily — toggle done for today only
    const newStatus = isDoneToday ? "open" : "done";
    await supabase.from("items").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", habit.id);
    setCompletedHabits((prev) => {
      const next = new Set(prev);
      if (isDoneToday) next.delete(habit.id);
      else next.add(habit.id);
      return next;
    });
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr.includes("T")) return "All day";
    return new Date(dateStr).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const completedHabitCount = completedHabits.size;
  const totalHabits = habits.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-violet-400" />
            Today
          </CardTitle>
          <span className="text-xs text-muted-foreground">{dateStr}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="text-sm text-muted-foreground py-4 text-center">Loading...</div>
        ) : (
          <>
            {/* Calendar Events */}
            {events.length > 0 && (
              <>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-2">
                    <CalendarDays className="w-3 h-3" />
                    CALENDAR
                  </p>
                  {events.map((event) => (
                    <div key={event.id} className="flex items-center gap-2.5 p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                      <div className="w-1 h-8 rounded-full bg-indigo-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{event.summary}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(event.start)}{!event.allDay && ` - ${formatTime(event.end)}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <Separator />
              </>
            )}

            {/* Daily Habits */}
            {habits.length > 0 && (
              <>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <RefreshCw className="w-3 h-3" />
                      DAILY HABITS
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {completedHabitCount}/{totalHabits} done
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-1 bg-muted rounded-full mb-3">
                    <div
                      className="h-1 bg-emerald-400 rounded-full transition-all"
                      style={{ width: totalHabits > 0 ? `${(completedHabitCount / totalHabits) * 100}%` : "0%" }}
                    />
                  </div>
                  {habits.map((habit) => {
                    const isDone = completedHabits.has(habit.id);
                    return (
                      <div
                        key={habit.id}
                        className={cn(
                          "flex items-center gap-2.5 p-2 rounded-lg hover:bg-accent/50 transition-colors group cursor-pointer",
                          isDone && "opacity-50"
                        )}
                        onClick={() => toggleHabit(habit)}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-emerald-400" />
                        )}
                        <p className={cn("text-sm flex-1", isDone && "line-through")}>{habit.title}</p>
                        {habit.category && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full shrink-0"
                            style={{ backgroundColor: habit.category.color + "20", color: habit.category.color }}>
                            {habit.category.name}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <Separator />
              </>
            )}

            {/* One-off Tasks */}
            <div className="space-y-1.5">
              {(events.length > 0 || habits.length > 0) && (
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-2">
                  <CheckCircle2 className="w-3 h-3" />
                  TASKS
                </p>
              )}
              {tasks.length === 0 ? (
                <div className="text-sm text-muted-foreground py-2 text-center">
                  No tasks for today. Use the brain dump to add some!
                </div>
              ) : (
                tasks.map((task) => {
                  const PriorityIcon = priorityConfig[task.priority]?.icon ?? ArrowRightCircle;
                  const priorityColor = priorityConfig[task.priority]?.color ?? "text-muted-foreground";
                  return (
                    <div
                      key={task.id}
                      className={cn(
                        "flex items-start gap-2.5 p-2 rounded-lg hover:bg-accent/50 transition-colors group cursor-pointer",
                        task.status === "done" && "opacity-50"
                      )}
                      onClick={() => toggleTask(task)}
                    >
                      {task.status === "done" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0 group-hover:text-violet-400" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm", task.status === "done" && "line-through")}>{task.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {task.category && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full"
                              style={{ backgroundColor: task.category.color + "20", color: task.category.color }}>
                              {task.category.name}
                            </span>
                          )}
                          {task.due_date && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(task.due_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <PriorityIcon className={cn("w-4 h-4 shrink-0 mt-0.5", priorityColor)} />
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

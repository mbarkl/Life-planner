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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const priorityConfig = {
  high: { icon: ArrowUpCircle, color: "text-red-400", label: "High" },
  medium: { icon: ArrowRightCircle, color: "text-amber-400", label: "Medium" },
  low: { icon: ArrowDownCircle, color: "text-blue-400", label: "Low" },
};

export function TodayPanel() {
  const [tasks, setTasks] = useState<Item[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    const supabase = createClient();
    const today = new Date().toISOString().split("T")[0];

    const { data } = await supabase
      .from("items")
      .select("*, category:categories(*), project:projects(*)")
      .eq("type", "task")
      .in("status", ["open", "in_progress"])
      .or(`suggested_date.eq.${today},due_date.eq.${today},suggested_date.is.null`)
      .order("priority", { ascending: true })
      .limit(20);

    const sorted = (data ?? []).sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return (order[a.priority as keyof typeof order] ?? 1) - (order[b.priority as keyof typeof order] ?? 1);
    });

    setTasks(sorted);
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
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
    );
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr.includes("T")) return "All day";
    return new Date(dateStr).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

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
          <div className="text-sm text-muted-foreground py-4 text-center">
            Loading...
          </div>
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
                    <div
                      key={event.id}
                      className="flex items-center gap-2.5 p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20"
                    >
                      <div className="w-1 h-8 rounded-full bg-indigo-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{event.summary}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(event.start)}
                          {!event.allDay && ` - ${formatTime(event.end)}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <Separator />
              </>
            )}

            {/* Tasks */}
            <div className="space-y-1.5">
              {events.length > 0 && (
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-2">
                  <CheckCircle2 className="w-3 h-3" />
                  TASKS
                </p>
              )}
              {tasks.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">
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
                        <p
                          className={cn(
                            "text-sm",
                            task.status === "done" && "line-through"
                          )}
                        >
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {task.category && (
                            <span
                              className="text-xs px-1.5 py-0.5 rounded-full"
                              style={{
                                backgroundColor: task.category.color + "20",
                                color: task.category.color,
                              }}
                            >
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

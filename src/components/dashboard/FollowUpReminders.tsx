"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { type VaultRecord } from "@/lib/types";
import { Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FollowUpReminders() {
  const [reminders, setReminders] = useState<VaultRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReminders = async () => {
    const supabase = createClient();
    const thirtyDaysOut = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString().split("T")[0];

    const { data } = await supabase
      .from("records")
      .select("*, provider:providers(*), record_category:record_categories(*)")
      .eq("follow_up_completed", false)
      .not("follow_up_date", "is", null)
      .lte("follow_up_date", thirtyDaysOut)
      .order("follow_up_date", { ascending: true })
      .limit(10);

    setReminders(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchReminders(); }, []);

  const markDone = async (id: string) => {
    const supabase = createClient();
    await supabase
      .from("records")
      .update({ follow_up_completed: true, updated_at: new Date().toISOString() })
      .eq("id", id);
    setReminders((prev) => prev.filter((r) => r.id !== id));
  };

  const today = new Date().toISOString().split("T")[0];

  const getStatus = (followUpDate: string) => {
    const daysUntil = Math.ceil(
      (new Date(followUpDate).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntil < 0) return { label: "Overdue", dot: "bg-red-400", text: "text-red-400", overdue: true };
    if (daysUntil === 0) return { label: "Due today", dot: "bg-amber-400", text: "text-amber-400", overdue: false };
    if (daysUntil <= 14) return { label: `In ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`, dot: "bg-amber-400", text: "text-amber-400", overdue: false };
    return { label: `In ${daysUntil} days`, dot: "bg-blue-400", text: "text-blue-400", overdue: false };
  };

  if (!loading && reminders.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          Follow-ups
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <div className="text-sm text-muted-foreground py-2 text-center">Loading...</div>
        ) : (
          reminders.map((rec) => {
            const status = getStatus(rec.follow_up_date!);
            return (
              <div key={rec.id} className={cn(
                "p-2.5 rounded-lg border",
                status.overdue ? "border-red-500/20 bg-red-500/5" : "border-amber-500/20 bg-amber-500/5"
              )}>
                <div className="flex items-start gap-2">
                  <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", status.dot)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {rec.follow_up_notes ?? rec.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {rec.provider && (
                        <span className="text-xs text-muted-foreground">{rec.provider.name}</span>
                      )}
                      {rec.record_category && (
                        <span className="text-xs text-muted-foreground">· {rec.record_category.name}</span>
                      )}
                    </div>
                    <p className={cn("text-xs mt-0.5", status.text)}>
                      {status.overdue && <AlertCircle className="w-3 h-3 inline mr-1" />}
                      {status.label} · {new Date(rec.follow_up_date!).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-emerald-400 hover:bg-emerald-500/10 shrink-0"
                    onClick={() => markDone(rec.id)}
                    title="Mark done"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

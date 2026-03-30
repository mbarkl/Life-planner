"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { type Goal } from "@/lib/types";
import { Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function GoalsPanel() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("goals")
        .select("*, category:categories(*)")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(6);

      setGoals(data ?? []);
      setLoading(false);
    };
    fetch();
  }, []);

  const timeframeLabels: Record<string, string> = {
    weekly: "This week",
    monthly: "This month",
    quarterly: "This quarter",
    yearly: "This year",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="w-4 h-4 text-emerald-400" />
          Goals
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="text-sm text-muted-foreground py-4 text-center">
            Loading...
          </div>
        ) : goals.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">
            No goals set yet. Add goals to track your long-term progress.
          </div>
        ) : (
          goals.map((goal) => (
            <div key={goal.id} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{goal.title}</p>
                <span className="text-xs text-muted-foreground">
                  {goal.progress}%
                </span>
              </div>
              <Progress value={goal.progress} className="h-1.5" />
              <div className="flex items-center gap-2">
                {goal.category && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: goal.category.color + "20",
                      color: goal.category.color,
                    }}
                  >
                    {goal.category.name}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {timeframeLabels[goal.timeframe] ?? goal.timeframe}
                </span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

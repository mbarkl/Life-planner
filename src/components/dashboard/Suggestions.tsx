"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { type Item } from "@/lib/types";
import {
  Sparkles,
  CalendarPlus,
  X,
  Lightbulb,
  FileText,
  CheckSquare,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const typeIcons = {
  task: CheckSquare,
  idea: Lightbulb,
  note: FileText,
  reference: FileText,
};

export function Suggestions() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSuggestions = async () => {
    const supabase = createClient();
    const today = new Date().toISOString().split("T")[0];

    // Get recent items that don't have a date or have a future date — AI suggestions
    const { data } = await supabase
      .from("items")
      .select("*, category:categories(*)")
      .in("status", ["open"])
      .or(`suggested_date.is.null,suggested_date.gte.${today}`)
      .order("created_at", { ascending: false })
      .limit(5);

    setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const scheduleToday = async (item: Item) => {
    const supabase = createClient();
    const today = new Date().toISOString().split("T")[0];
    await supabase
      .from("items")
      .update({ suggested_date: today, updated_at: new Date().toISOString() })
      .eq("id", item.id);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  };

  const dismiss = async (item: Item) => {
    const supabase = createClient();
    await supabase
      .from("items")
      .update({ status: "dismissed", updated_at: new Date().toISOString() })
      .eq("id", item.id);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <div className="text-sm text-muted-foreground py-4 text-center">
            Loading...
          </div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">
            No suggestions right now. Brain dump something!
          </div>
        ) : (
          items.map((item) => {
            const Icon = typeIcons[item.type] ?? FileText;
            return (
              <div
                key={item.id}
                className="flex items-start gap-2.5 p-2.5 rounded-lg bg-accent/30 border border-accent"
              >
                <Icon className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{item.title}</p>
                  {item.body && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {item.body}
                    </p>
                  )}
                  {item.category && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full mt-1 inline-block"
                      style={{
                        backgroundColor: item.category.color + "20",
                        color: item.category.color,
                      }}
                    >
                      {item.category.name}
                    </span>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                    onClick={() => scheduleToday(item)}
                    title="Do today"
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                    onClick={() => dismiss(item)}
                    title="Dismiss"
                  >
                    <X className="w-3.5 h-3.5" />
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

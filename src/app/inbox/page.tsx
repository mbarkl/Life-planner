"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { type Item } from "@/lib/types";
import { Header } from "@/components/layout/Header";
import {
  Sparkles,
  Loader2,
  CheckSquare,
  Lightbulb,
  FileText,
  CheckCircle2,
  Circle,
  Trash2,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const typeIcons = {
  task: CheckSquare,
  idea: Lightbulb,
  note: FileText,
  reference: FileText,
};

const typeColors = {
  task: "text-blue-400",
  idea: "text-amber-400",
  note: "text-emerald-400",
  reference: "text-purple-400",
};

export default function InboxPage() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState("all");

  const fetchItems = async () => {
    const supabase = createClient();
    let query = supabase
      .from("items")
      .select("*, category:categories(*), project:projects(*)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (filter !== "all") {
      query = query.eq("type", filter);
    }

    const { data } = await query;
    setItems(data ?? []);
  };

  useEffect(() => {
    fetchItems();
  }, [filter]);

  const handleSubmit = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);

    try {
      const res = await fetch("/api/process-dump", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error("Failed to process");
      setText("");
      await fetchItems();
    } catch (err) {
      console.error("Dump processing failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (item: Item) => {
    const supabase = createClient();
    const newStatus = item.status === "done" ? "open" : "done";
    await supabase.from("items").update({ status: newStatus }).eq("id", item.id);
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: newStatus } : i))
    );
  };

  const deleteItem = async (item: Item) => {
    const supabase = createClient();
    await supabase.from("items").delete().eq("id", item.id);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Brain Dump" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Dump Input */}
          <Card className="border-dashed border-violet-500/30 bg-violet-500/5">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-violet-400" />
                <span className="font-medium text-violet-300">
                  What&apos;s on your mind?
                </span>
              </div>
              <Textarea
                placeholder="Dump everything here — tasks, ideas, random thoughts, project notes, anything. AI will sort it all out for you..."
                className="min-h-[150px] bg-background/50 border-violet-500/20 resize-none mb-4 text-base"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    handleSubmit();
                  }
                }}
              />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Ctrl+Enter to submit. Ramble all you want — AI will extract the actionable bits.
                </span>
                <Button
                  onClick={handleSubmit}
                  disabled={!text.trim() || loading}
                  className="bg-violet-600 hover:bg-violet-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Process with AI
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Items List */}
          <div>
            <Tabs defaultValue="all" onValueChange={setFilter}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="task">Tasks</TabsTrigger>
                <TabsTrigger value="idea">Ideas</TabsTrigger>
                <TabsTrigger value="note">Notes</TabsTrigger>
              </TabsList>

              <TabsContent value={filter} className="mt-4 space-y-2">
                {items.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-50" />
                    <p>No items yet. Brain dump something above!</p>
                  </div>
                ) : (
                  items.map((item) => {
                    const Icon = typeIcons[item.type] ?? FileText;
                    const iconColor = typeColors[item.type] ?? "text-muted-foreground";
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors",
                          item.status === "done" && "opacity-50"
                        )}
                      >
                        {item.type === "task" ? (
                          <button onClick={() => toggleStatus(item)} className="mt-0.5">
                            {item.status === "done" ? (
                              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400" />
                            ) : (
                              <Circle className="w-4.5 h-4.5 text-muted-foreground hover:text-violet-400" />
                            )}
                          </button>
                        ) : (
                          <Icon className={cn("w-4.5 h-4.5 mt-0.5 shrink-0", iconColor)} />
                        )}

                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              "text-sm font-medium",
                              item.status === "done" && "line-through"
                            )}
                          >
                            {item.title}
                          </p>
                          {item.body && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {item.body}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <Badge variant="secondary" className="text-xs">
                              {item.type}
                            </Badge>
                            {item.category && (
                              <span
                                className="text-xs px-1.5 py-0.5 rounded-full"
                                style={{
                                  backgroundColor: item.category.color + "20",
                                  color: item.category.color,
                                }}
                              >
                                {item.category.name}
                              </span>
                            )}
                            {item.project && (
                              <span className="text-xs text-muted-foreground">
                                {item.project.name}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {item.priority} priority
                            </span>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-red-400 shrink-0"
                          onClick={() => deleteItem(item)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    );
                  })
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface QuickDumpProps {
  onProcessed?: () => void;
}

export function QuickDump({ onProcessed }: QuickDumpProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ items: Array<{ title: string; type: string; category?: { name: string } }>; records?: Array<{ title: string }> } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/process-dump", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? `Error ${res.status}`);
        return;
      }

      setResult(data);
      setText("");
      onProcessed?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-dashed border-violet-500/30 bg-violet-500/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-medium text-violet-300">Brain Dump</span>
        </div>
        <Textarea
          placeholder="What's on your mind? Dump everything here — AI will sort it out..."
          className="min-h-[80px] bg-background/50 border-violet-500/20 resize-none mb-3"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              handleSubmit();
            }
          }}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Ctrl+Enter to submit
          </span>
          <Button
            onClick={handleSubmit}
            disabled={!text.trim() || loading}
            size="sm"
            className="bg-violet-600 hover:bg-violet-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 mr-1.5" />
                Process
              </>
            )}
          </Button>
        </div>

        {error && (
          <div className="mt-3 p-2 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            Error: {error}
          </div>
        )}

        {result && (result.items.length > 0 || (result.records?.length ?? 0) > 0) && (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-muted-foreground font-medium">
              Extracted {result.items.length} item{result.items.length !== 1 ? "s" : ""}
              {(result.records?.length ?? 0) > 0 && ` and ${result.records!.length} record${result.records!.length !== 1 ? "s" : ""}`}:
            </p>
            {result.items.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-sm p-2 rounded bg-background/50"
              >
                <span className="text-xs px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 font-medium">
                  {item.type}
                </span>
                <span className="truncate">{item.title}</span>
                {item.category && (
                  <span className="text-xs text-muted-foreground ml-auto shrink-0">
                    {item.category.name}
                  </span>
                )}
              </div>
            ))}
            {result.records?.map((rec, i) => (
              <div
                key={`rec-${i}`}
                className="flex items-center gap-2 text-sm p-2 rounded bg-background/50"
              >
                <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-medium">
                  record
                </span>
                <span className="truncate">{rec.title}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

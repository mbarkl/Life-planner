"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { type Category, type Project } from "@/lib/types";
import {
  Briefcase,
  Home,
  Heart,
  DollarSign,
  BookOpen,
  Users,
  ChevronRight,
  FolderKanban,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const iconMap: Record<string, typeof Briefcase> = {
  briefcase: Briefcase,
  home: Home,
  heart: Heart,
  "dollar-sign": DollarSign,
  "book-open": BookOpen,
  users: Users,
};

interface CategoryWithProjects extends Category {
  projects: Project[];
}

export function ProjectsSidebar() {
  const [categories, setCategories] = useState<CategoryWithProjects[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const supabase = createClient();
      const [{ data: cats }, { data: projs }] = await Promise.all([
        supabase.from("categories").select("*").order("sort_order"),
        supabase.from("projects").select("*").eq("status", "active"),
      ]);

      const merged: CategoryWithProjects[] = (cats ?? []).map((cat) => ({
        ...cat,
        projects: (projs ?? []).filter((p) => p.category_id === cat.id),
      }));

      setCategories(merged);
      setLoading(false);
    };
    fetch();
  }, []);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FolderKanban className="w-4 h-4 text-indigo-400" />
          Projects
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-0.5">
        {loading ? (
          <div className="text-sm text-muted-foreground py-4 text-center">
            Loading...
          </div>
        ) : categories.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">
            No categories yet.
          </div>
        ) : (
          categories.map((cat) => {
            const Icon = iconMap[cat.icon ?? ""] ?? FolderKanban;
            const isExpanded = expanded.has(cat.id);
            return (
              <div key={cat.id}>
                <button
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent/50 transition-colors text-left"
                  onClick={() => toggleExpand(cat.id)}
                >
                  <ChevronRight
                    className={cn(
                      "w-3 h-3 text-muted-foreground transition-transform",
                      isExpanded && "rotate-90"
                    )}
                  />
                  <Icon className="w-3.5 h-3.5" style={{ color: cat.color }} />
                  <span className="text-sm font-medium flex-1">{cat.name}</span>
                  {cat.projects.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {cat.projects.length}
                    </span>
                  )}
                </button>
                {isExpanded && cat.projects.length > 0 && (
                  <div className="ml-8 space-y-0.5 mt-0.5">
                    {cat.projects.map((proj) => (
                      <div
                        key={proj.id}
                        className="text-sm text-muted-foreground px-2 py-1 rounded hover:bg-accent/30 cursor-pointer"
                      >
                        {proj.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

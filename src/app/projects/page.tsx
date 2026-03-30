"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { type Category, type Project, type Item } from "@/lib/types";
import { Header } from "@/components/layout/Header";
import {
  Plus,
  Briefcase,
  Home,
  Heart,
  DollarSign,
  BookOpen,
  Users,
  FolderKanban,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  CheckSquare,
  Lightbulb,
  FileText,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const iconMap: Record<string, typeof Briefcase> = {
  briefcase: Briefcase,
  home: Home,
  heart: Heart,
  "dollar-sign": DollarSign,
  "book-open": BookOpen,
  users: Users,
};

const colorOptions = [
  "#3b82f6",
  "#8b5cf6",
  "#22c55e",
  "#eab308",
  "#f97316",
  "#ec4899",
  "#06b6d4",
  "#ef4444",
];

interface CategoryWithData extends Category {
  projects: (Project & { items: Item[] })[];
}

export default function ProjectsPage() {
  const [categories, setCategories] = useState<CategoryWithData[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("#8b5cf6");
  const [showNewCat, setShowNewCat] = useState(false);
  const [newProjName, setNewProjName] = useState("");
  const [newProjCatId, setNewProjCatId] = useState<string | null>(null);

  const fetchData = async () => {
    const supabase = createClient();
    const [{ data: cats }, { data: projs }, { data: items }] = await Promise.all([
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("projects").select("*").neq("status", "archived"),
      supabase.from("items").select("*").in("status", ["open", "in_progress"]),
    ]);

    const merged: CategoryWithData[] = (cats ?? []).map((cat) => ({
      ...cat,
      projects: (projs ?? [])
        .filter((p) => p.category_id === cat.id)
        .map((p) => ({
          ...p,
          items: (items ?? []).filter((i) => i.project_id === p.id),
        })),
    }));

    setCategories(merged);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addCategory = async () => {
    if (!newCatName.trim()) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("categories").insert({
      user_id: user.id,
      name: newCatName.trim(),
      color: newCatColor,
      sort_order: categories.length,
    });

    setNewCatName("");
    setShowNewCat(false);
    fetchData();
  };

  const deleteCategory = async (id: string) => {
    const supabase = createClient();
    await supabase.from("categories").delete().eq("id", id);
    fetchData();
  };

  const addProject = async (categoryId: string) => {
    if (!newProjName.trim()) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("projects").insert({
      user_id: user.id,
      category_id: categoryId,
      name: newProjName.trim(),
    });

    setNewProjName("");
    setNewProjCatId(null);
    fetchData();
  };

  const toggleTask = async (item: Item) => {
    const supabase = createClient();
    const newStatus = item.status === "done" ? "open" : "done";
    await supabase.from("items").update({ status: newStatus }).eq("id", item.id);
    fetchData();
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Projects & Categories" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Add Category */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Categories</h2>
            <Dialog open={showNewCat} onOpenChange={setShowNewCat}>
              <DialogTrigger
                className="inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-medium border border-input bg-background px-3 py-1.5 hover:bg-accent hover:text-accent-foreground"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Category
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New Category</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Category name"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addCategory()}
                  />
                  <div className="flex gap-2">
                    {colorOptions.map((c) => (
                      <button
                        key={c}
                        className={cn(
                          "w-8 h-8 rounded-full border-2 transition-all",
                          newCatColor === c
                            ? "border-white scale-110"
                            : "border-transparent"
                        )}
                        style={{ backgroundColor: c }}
                        onClick={() => setNewCatColor(c)}
                      />
                    ))}
                  </div>
                  <Button onClick={addCategory} className="w-full">
                    Create Category
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading...
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FolderKanban className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p>No categories yet. Create one to get started!</p>
            </div>
          ) : (
            categories.map((cat) => {
              const Icon = iconMap[cat.icon ?? ""] ?? FolderKanban;
              const isExpanded = expanded.has(cat.id);
              return (
                <Card key={cat.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <button
                        className="flex items-center gap-2"
                        onClick={() => toggleExpand(cat.id)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                        <Icon className="w-4 h-4" style={{ color: cat.color }} />
                        <CardTitle className="text-base">{cat.name}</CardTitle>
                        <Badge variant="secondary" className="text-xs">
                          {cat.projects.length} project
                          {cat.projects.length !== 1 ? "s" : ""}
                        </Badge>
                      </button>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-red-400"
                          onClick={() => deleteCategory(cat.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {isExpanded && (
                    <CardContent className="space-y-3">
                      {cat.projects.map((proj) => (
                        <div
                          key={proj.id}
                          className="ml-6 p-3 rounded-lg border bg-accent/20"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">
                              {proj.name}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {proj.items.length} open
                            </Badge>
                          </div>
                          {proj.items.length > 0 && (
                            <div className="space-y-1">
                              {proj.items.slice(0, 5).map((item) => (
                                <div
                                  key={item.id}
                                  className="flex items-center gap-2 text-sm text-muted-foreground"
                                >
                                  {item.type === "task" ? (
                                    <button onClick={() => toggleTask(item)}>
                                      <Circle className="w-3.5 h-3.5 hover:text-violet-400" />
                                    </button>
                                  ) : item.type === "idea" ? (
                                    <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                                  ) : (
                                    <FileText className="w-3.5 h-3.5" />
                                  )}
                                  <span className="truncate">{item.title}</span>
                                </div>
                              ))}
                              {proj.items.length > 5 && (
                                <span className="text-xs text-muted-foreground ml-5">
                                  +{proj.items.length - 5} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Add project */}
                      {newProjCatId === cat.id ? (
                        <div className="ml-6 flex gap-2">
                          <Input
                            placeholder="Project name"
                            value={newProjName}
                            onChange={(e) => setNewProjName(e.target.value)}
                            onKeyDown={(e) =>
                              e.key === "Enter" && addProject(cat.id)
                            }
                            autoFocus
                            className="h-8 text-sm"
                          />
                          <Button
                            size="sm"
                            onClick={() => addProject(cat.id)}
                            className="h-8"
                          >
                            Add
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setNewProjCatId(null)}
                            className="h-8"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-6 text-muted-foreground"
                          onClick={() => setNewProjCatId(cat.id)}
                        >
                          <Plus className="w-3.5 h-3.5 mr-1.5" />
                          Add Project
                        </Button>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

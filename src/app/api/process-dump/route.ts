import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processBrainDump } from "@/lib/ai/process-dump";

// Allow up to 60 seconds for AI processing (requires Vercel Pro)
export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { text } = await request.json();
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

  // Save the raw dump
  const { data: dump, error: dumpError } = await supabase
    .from("dumps")
    .insert({ user_id: user.id, raw_text: text.trim() })
    .select()
    .single();

  if (dumpError) {
    return NextResponse.json({ error: "Failed to save dump" }, { status: 500 });
  }

  // Get user's categories and projects for context
  const [{ data: categories }, { data: existingProjects }] = await Promise.all([
    supabase.from("categories").select("*").eq("user_id", user.id).order("sort_order"),
    supabase.from("projects").select("*").eq("user_id", user.id).eq("status", "active"),
  ]);

  try {
    const extracted = await processBrainDump(
      text.trim(),
      categories ?? [],
      existingProjects ?? []
    );

    const createdItems = [];
    for (const item of extracted) {
      // Find matching category
      const category = (categories ?? []).find(
        (c) => c.name.toLowerCase() === item.category.toLowerCase()
      );

      // Only assign to an EXISTING project — never auto-create
      let projectId: string | null = null;
      let suggestedProject: string | null = null;

      if (item.project) {
        const projectName = item.project.startsWith("new: ")
          ? item.project.slice(5)
          : item.project;

        const existing = (existingProjects ?? []).find(
          (p) => p.name.toLowerCase() === projectName.toLowerCase()
        );

        if (existing) {
          // Assign to existing project silently
          projectId = existing.id;
        } else {
          // Store as a suggestion only — don't create the project
          suggestedProject = projectName;
        }
      }

      const { data: created } = await supabase
        .from("items")
        .insert({
          user_id: user.id,
          dump_id: dump.id,
          category_id: category?.id ?? null,
          project_id: projectId,
          suggested_project: suggestedProject,
          type: item.type,
          title: item.title,
          body: item.body,
          priority: item.priority,
          status: "open",
          suggested_date: item.suggested_date,
          ai_confidence: 0.8,
          recurring: item.recurring ?? false,
        })
        .select("*, category:categories(*), project:projects(*)")
        .single();

      if (created) createdItems.push({ ...created, reasoning: item.reasoning });
    }

    await supabase.from("dumps").update({ processed: true }).eq("id", dump.id);

    return NextResponse.json({ items: createdItems, dump_id: dump.id });
  } catch (error) {
    console.error("AI processing error:", error);
    return NextResponse.json(
      { error: "Failed to process with AI", dump_id: dump.id },
      { status: 500 }
    );
  }
}

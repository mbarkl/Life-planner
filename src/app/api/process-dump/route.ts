import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processBrainDump } from "@/lib/ai/process-dump";

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
  const [{ data: categories }, { data: projects }] = await Promise.all([
    supabase.from("categories").select("*").eq("user_id", user.id).order("sort_order"),
    supabase.from("projects").select("*").eq("user_id", user.id).eq("status", "active"),
  ]);

  try {
    // Process with AI
    const extracted = await processBrainDump(
      text.trim(),
      categories ?? [],
      projects ?? []
    );

    // Create items in the database
    const createdItems = [];
    for (const item of extracted) {
      // Find matching category
      const category = (categories ?? []).find(
        (c) => c.name.toLowerCase() === item.category.toLowerCase()
      );

      // Handle project - find existing or create new
      let projectId: string | null = null;
      if (item.project) {
        if (item.project.startsWith("new: ")) {
          const projectName = item.project.slice(5);
          const { data: newProject } = await supabase
            .from("projects")
            .insert({
              user_id: user.id,
              name: projectName,
              category_id: category?.id ?? null,
            })
            .select()
            .single();
          projectId = newProject?.id ?? null;
        } else {
          const existingProject = (projects ?? []).find(
            (p) => p.name.toLowerCase() === item.project!.toLowerCase()
          );
          projectId = existingProject?.id ?? null;
        }
      }

      const { data: created } = await supabase
        .from("items")
        .insert({
          user_id: user.id,
          dump_id: dump.id,
          category_id: category?.id ?? null,
          project_id: projectId,
          type: item.type,
          title: item.title,
          body: item.body,
          priority: item.priority,
          status: "open",
          suggested_date: item.suggested_date,
          ai_confidence: 0.8,
        })
        .select("*, category:categories(*), project:projects(*)")
        .single();

      if (created) createdItems.push({ ...created, reasoning: item.reasoning });
    }

    // Mark dump as processed
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

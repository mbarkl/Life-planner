import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processBrainDump } from "@/lib/ai/process-dump";

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { text } = await request.json();
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

  const { data: dump, error: dumpError } = await supabase
    .from("dumps")
    .insert({ user_id: user.id, raw_text: text.trim() })
    .select()
    .single();

  if (dumpError) return NextResponse.json({ error: "Failed to save dump" }, { status: 500 });

  const [{ data: categories }, { data: existingProjects }, { data: recordCategories }] =
    await Promise.all([
      supabase.from("categories").select("*").eq("user_id", user.id).order("sort_order"),
      supabase.from("projects").select("*").eq("user_id", user.id).eq("status", "active"),
      supabase.from("record_categories").select("*").eq("user_id", user.id).order("sort_order"),
    ]);

  try {
    const extracted = await processBrainDump(
      text.trim(),
      categories ?? [],
      existingProjects ?? [],
      recordCategories ?? []
    );

    // ── ITEMS ──────────────────────────────────────────────────────────────
    const createdItems = [];
    for (const item of extracted.items) {
      const category = (categories ?? []).find(
        (c) => c.name.toLowerCase() === item.category.toLowerCase()
      );
      const existing = (existingProjects ?? []).find(
        (p) => p.name.toLowerCase() === (item.project ?? "").toLowerCase()
      );

      const { data: created } = await supabase
        .from("items")
        .insert({
          user_id: user.id,
          dump_id: dump.id,
          category_id: category?.id ?? null,
          project_id: existing?.id ?? null,
          suggested_project: !existing && item.project ? item.project : null,
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

    // ── RECORDS ────────────────────────────────────────────────────────────
    const createdRecords = [];
    for (const rec of extracted.records) {
      const recCat = (recordCategories ?? []).find(
        (c) => c.name.toLowerCase() === rec.record_category.toLowerCase()
      );
      const recordCategoryId = recCat?.id ?? null;

      // Find or create provider (case-insensitive dedup)
      let providerId: string | null = null;
      if (rec.provider_name) {
        const { data: existing } = await supabase
          .from("providers")
          .select("id, would_use_again, phone, address")
          .eq("user_id", user.id)
          .ilike("name", rec.provider_name)
          .maybeSingle();

        if (existing) {
          providerId = existing.id;
          // Fill in any missing details on the existing provider
          const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
          if (rec.would_use_again !== null && existing.would_use_again === null) updates.would_use_again = rec.would_use_again;
          if (rec.provider_phone && !existing.phone) updates.phone = rec.provider_phone;
          if (rec.provider_address && !existing.address) updates.address = rec.provider_address;
          if (Object.keys(updates).length > 1) {
            await supabase.from("providers").update(updates).eq("id", existing.id);
          }
        } else {
          const { data: newProvider } = await supabase
            .from("providers")
            .insert({
              user_id: user.id,
              name: rec.provider_name,
              record_category_id: recordCategoryId,
              specialty: rec.specialty,
              phone: rec.provider_phone ?? null,
              address: rec.provider_address ?? null,
              would_use_again: rec.would_use_again,
            })
            .select("id")
            .single();
          if (newProvider) providerId = newProvider.id;
        }
      }

      const { data: created } = await supabase
        .from("records")
        .insert({
          user_id: user.id,
          provider_id: providerId,
          record_category_id: recordCategoryId,
          dump_id: dump.id,
          title: rec.title,
          description: rec.description,
          service_date: rec.service_date ?? today(),
          cost: rec.cost,
          follow_up_date: rec.follow_up_date,
          follow_up_notes: rec.follow_up_notes,
          outcome: rec.outcome,
          would_use_again: rec.would_use_again,
        })
        .select("*, provider:providers(*), record_category:record_categories(*)")
        .single();

      if (created) createdRecords.push({ ...created, reasoning: rec.reasoning });
    }

    await supabase.from("dumps").update({ processed: true }).eq("id", dump.id);

    return NextResponse.json({
      items: createdItems,
      records: createdRecords,
      dump_id: dump.id,
    });
  } catch (error) {
    console.error("AI processing error:", error);
    return NextResponse.json(
      { error: "Failed to process with AI", dump_id: dump.id },
      { status: 500 }
    );
  }
}

function today() {
  return new Date().toISOString().split("T")[0];
}

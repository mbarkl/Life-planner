import { type SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_RECORD_CATEGORIES } from "@/lib/types";

export async function seedRecordCategoriesIfNeeded(
  supabase: SupabaseClient,
  userId: string
) {
  const { data: existing } = await supabase
    .from("record_categories")
    .select("id")
    .eq("user_id", userId)
    .limit(1);

  if (existing && existing.length > 0) return;

  const rows = DEFAULT_RECORD_CATEGORIES.map((cat, i) => ({
    user_id: userId,
    name: cat.name,
    color: cat.color,
    icon: cat.icon,
    is_system: true,
    sort_order: i,
  }));

  await supabase.from("record_categories").insert(rows);
}

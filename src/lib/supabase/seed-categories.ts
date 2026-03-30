import { type SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_CATEGORIES } from "@/lib/types";

export async function seedCategoriesIfNeeded(
  supabase: SupabaseClient,
  userId: string
) {
  const { data: existing } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", userId)
    .limit(1);

  if (existing && existing.length > 0) return;

  const rows = DEFAULT_CATEGORIES.map((cat, i) => ({
    user_id: userId,
    name: cat.name,
    color: cat.color,
    icon: cat.icon,
    sort_order: i,
  }));

  await supabase.from("categories").insert(rows);
}

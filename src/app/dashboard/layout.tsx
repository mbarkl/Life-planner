import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { seedCategoriesIfNeeded } from "@/lib/supabase/seed-categories";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  // Seed categories on first login
  await seedCategoriesIfNeeded(supabase, user.id);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

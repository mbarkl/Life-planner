import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchTodayEvents } from "@/lib/calendar/google";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get the Google provider token from the session
  const providerToken = session.provider_token;

  if (!providerToken) {
    return NextResponse.json(
      { events: [], message: "No Google Calendar access. Re-authenticate with calendar scope." },
      { status: 200 }
    );
  }

  try {
    const events = await fetchTodayEvents(providerToken);
    return NextResponse.json({ events });
  } catch (error) {
    console.error("Calendar fetch error:", error);
    return NextResponse.json(
      { events: [], message: "Failed to fetch calendar events" },
      { status: 200 }
    );
  }
}

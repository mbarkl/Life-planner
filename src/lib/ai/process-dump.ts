import Anthropic from "@anthropic-ai/sdk";
import { type AIExtractedItem, type Category, type Project } from "@/lib/types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function processBrainDump(
  rawText: string,
  categories: Category[],
  projects: Project[]
): Promise<AIExtractedItem[]> {
  const categoryNames = categories.map((c) => c.name).join(", ");
  const projectNames = projects.map((p) => `${p.name} (in ${categories.find((c) => c.id === p.category_id)?.name ?? "uncategorized"})`).join(", ");

  const today = new Date().toISOString().split("T")[0];

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `You are an AI assistant for a personal life planning app called "Life Planner". The user has brain-dumped the following text. Your job is to extract structured items from it.

Today's date: ${today}

Existing categories: ${categoryNames || "Work, Personal, Health & Fitness, Finance, Learning, Relationships"}
Existing projects: ${projectNames || "None yet"}

Brain dump:
"""
${rawText}
"""

Extract ALL actionable items, ideas, and notes from this brain dump. For each item, determine:
- title: A clear, concise title (action-oriented for tasks)
- body: Additional context if needed, null if the title captures everything
- type: "task" (something to do), "idea" (something to explore/consider), "note" (information to remember), or "reference" (a link, resource, or contact)
- category: Which existing category this belongs to (use the closest match)
- project: An existing project name OR "new: Project Name" if this needs a new project, or null if standalone
- priority: "high" (urgent/important), "medium" (should do soon), "low" (nice to have/someday)
- suggested_date: When this should be done (YYYY-MM-DD format), null if no timeframe
- reasoning: Brief explanation of why you categorized it this way

Return ONLY a valid JSON array. No markdown, no explanation outside the JSON.
Example: [{"title": "Call dentist", "body": null, "type": "task", "category": "Health & Fitness", "project": null, "priority": "medium", "suggested_date": "2026-03-31", "reasoning": "Direct action item, health-related"}]`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  try {
    const items: AIExtractedItem[] = JSON.parse(content.text);
    return items;
  } catch {
    // Try to extract JSON from the response if it has surrounding text
    const jsonMatch = content.text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("Failed to parse AI response as JSON");
  }
}

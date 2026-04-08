import Anthropic from "@anthropic-ai/sdk";
import {
  type AIExtractedItem,
  type AIExtractedRecord,
  type Category,
  type Project,
  type RecordCategory,
} from "@/lib/types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ProcessDumpResult {
  items: AIExtractedItem[];
  records: AIExtractedRecord[];
}

export async function processBrainDump(
  rawText: string,
  categories: Category[],
  projects: Project[],
  recordCategories: RecordCategory[]
): Promise<ProcessDumpResult> {
  const categoryNames = categories.map((c) => c.name).join(", ");
  const projectNames = projects
    .map((p) => `${p.name} (in ${categories.find((c) => c.id === p.category_id)?.name ?? "uncategorized"})`)
    .join(", ");
  const recordCategoryNames = recordCategories.map((c) => c.name).join(", ");
  const today = new Date().toISOString().split("T")[0];

  const message = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 3000,
    messages: [
      {
        role: "user",
        content: `You are an AI assistant for a personal life planning app called "Life Planner". The user has brain-dumped the following text. Extract two types of information: ITEMS (tasks, ideas, notes) and RECORDS (completed medical/service events worth remembering).

Today's date: ${today}

Task categories: ${categoryNames || "Work, Personal, Health & Fitness, Finance, Learning, Relationships"}
Existing projects: ${projectNames || "None yet"}
Record vault categories: ${recordCategoryNames || "Medical, Home Services, Auto, Financial, Legal"}

Brain dump:
"""
${rawText}
"""

---

PART 1 — ITEMS: Extract actionable tasks, ideas, notes, references.
- title: clear concise title
- body: extra context or null
- type: "task" | "idea" | "note" | "reference"
- category: closest task category
- project: existing project name, or null (do NOT suggest new projects)
- priority: "high" | "medium" | "low"
- suggested_date: YYYY-MM-DD or null
- recurring: true if this is a daily habit/routine, false otherwise
- reasoning: brief explanation

PART 2 — RECORDS: Extract completed medical or service events worth remembering for future reference.

Signs of a MEDICAL record (ALWAYS extract as record, never as task):
- Any biopsy, surgery, procedure, test result, diagnosis, or prescription
- Any doctor/specialist/dentist/dermatologist visit
- Any vaccination, lab work, scan, or imaging
- Anything involving a named provider or outcome

Signs of a SERVICE record (ALWAYS extract as record, never as task):
- A named company/contractor did work at your home or on your car
- Any repair, installation, inspection with a cost or company name
- Any opinion on quality of service received

IMPORTANT: If it mentions a biopsy, procedure, test, or medical appointment that already happened — it MUST be a record, not a task. Even if there is a follow-up mentioned, the original event is a record AND the follow-up date goes in follow_up_date on that record. Do NOT create a separate task for a medical follow-up.

Do NOT put these in items. Put them in records.

For each record:
- type: always "record"
- title: what was done (e.g., "Basal cell removal from shoulder", "AC blower motor replacement")
- description: additional detail or null
- provider_name: name of doctor/company or null
- provider_phone: phone number if mentioned, or null
- provider_address: address if mentioned, or null
- record_category: one of [${recordCategoryNames || "Medical, Home Services, Auto, Financial, Legal"}]
- specialty: provider specialty if inferable (e.g., "Dermatologist", "HVAC") or null
- service_date: YYYY-MM-DD if mentioned, or null
- cost: dollar amount as number if mentioned, or null
- follow_up_date: YYYY-MM-DD if a future follow-up date or interval is mentioned. Calculate from service_date if an interval is given (e.g., "next year" = service_date + 1 year, "in 6 months" = today + 6 months). Null if no follow-up mentioned.
- follow_up_notes: description of follow-up needed or null
- outcome: brief outcome/result description or null
- would_use_again: true if positive sentiment about provider, false if negative, null if not mentioned
- reasoning: brief explanation

Return ONLY this JSON object (no markdown, no extra text):
{
  "items": [...],
  "records": [...]
}`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type from Claude");

  try {
    const result = JSON.parse(content.text);
    return {
      items: result.items ?? [],
      records: result.records ?? [],
    };
  } catch {
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        items: result.items ?? [],
        records: result.records ?? [],
      };
    }
    throw new Error("Failed to parse AI response as JSON");
  }
}

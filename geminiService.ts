import type { DocumentSource, StudentMetadata } from "./types";

export async function generateStudyContent(
  documents: DocumentSource[],
  userPrompt: string,
  mode: "assignment" | "quiz" | "chat",
  studentInfo?: StudentMetadata
): Promise<string> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documents, prompt: userPrompt, mode, studentInfo }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Server generation failed: ${res.status} ${res.statusText} ${errBody}`);
  }

  const data = await res.json();
  return data.text ?? "";
}

export default { generateStudyContent };

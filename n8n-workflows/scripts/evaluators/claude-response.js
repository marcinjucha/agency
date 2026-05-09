// =============================================================
// Canonical Claude/MiniMax response parsing helpers for n8n Code nodes.
// =============================================================
// CANONICAL SOURCE for any Code node that consumes output from the
// MiniMax Agent subworkflow (or directly from the Claude API).
// Inlined into Code node jsCode strings via:
//
//   npm run n8n:build -- regenerate-helpers
//   npm run n8n:build -- regenerate-helpers --target "n8n-workflows/workflows/<file>.json"
//
// Code nodes opt in by including the inline markers:
//
//   // @inline claude-response
//   <helper body — replaced by build tool>
//   // @end-inline claude-response
//
// IMPORTANT: edit the helpers here, never inline copies — they will
// be regenerated and your edits to the JSON will be overwritten.
// =============================================================
// Behavior:
//   - extractTextContent(aiOutput) — finds the `text` entry in the
//     MiniMax/Claude `content[]` array (NOT content[0] — that's the
//     `thinking` entry). Falls back to any entry with `.text`, then
//     to a top-level `.text`, then to `JSON.stringify(aiOutput)`.
//   - stripCodeFences(str) — extracts the body of the first
//     ```json ... ``` (or generic ``` ... ```) markdown fence.
//     Returns trimmed input untouched if no fence present.
// =============================================================

function stripCodeFences(str) {
  const match = str.match(/```(?:json)?\s*([\s\S]*?)```/);
  return match ? match[1].trim() : str.trim();
}

function extractTextContent(aiOutput) {
  // Case 1: content array with typed entries (MiniMax/Claude format)
  if (aiOutput && Array.isArray(aiOutput.content)) {
    const textEntry = aiOutput.content.find(c => c.type === 'text');
    if (textEntry && textEntry.text) return textEntry.text;
    // Fallback: first entry with text
    const anyText = aiOutput.content.find(c => c.text);
    if (anyText) return anyText.text;
  }
  // Case 2: direct text field
  if (aiOutput && aiOutput.text) return aiOutput.text;
  // Case 3: stringified response
  return JSON.stringify(aiOutput);
}

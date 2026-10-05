// Shared helper for text-only JSON generation, used by /api/segment and
// /api/breakdown. Uses Groq exclusively — this keeps 100% of the Gemini
// free quota reserved for /api/recognize (handwriting), which is the only
// feature that needs Gemini's vision support.
//
// A couple of Groq models are tried in order in case one is retired or its
// quota is exhausted — each Groq model has its own separate rate-limit
// bucket, so this alone buys some extra headroom even within Groq.

const GROQ_MODEL_CANDIDATES = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"];

async function tryGroq(prompt, model) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return { ok: false, error: new Error("missing GROQ_API_KEY on server") };

  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (!r.ok) {
      const errText = await r.text();
      return { ok: false, error: new Error(`Groq error ${r.status}: ${errText}`), status: r.status };
    }
    const data = await r.json();
    const raw = data?.choices?.[0]?.message?.content || "";
    const clean = raw.replace(/```json|```/g, "").trim();
    return { ok: true, data: JSON.parse(clean) };
  } catch (e) {
    return { ok: false, error: e };
  }
}

// Calls Groq only, trying each candidate model in turn if one is
// unavailable (404) or rate-limited (429).
export async function callTextLLM(prompt) {
  let lastError = null;
  for (const model of GROQ_MODEL_CANDIDATES) {
    const result = await tryGroq(prompt, model);
    if (result.ok) return result.data;
    lastError = result.error;
    if (result.status && result.status !== 404 && result.status !== 429) {
      // a real error (bad request, auth failure, etc.) — no point trying
      // the next model, it'll fail the same way
      break;
    }
  }
  throw lastError || new Error("all Groq model candidates failed");
}

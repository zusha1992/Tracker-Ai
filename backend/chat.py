"""
AI chat endpoint — uses Groq (llama-3.3-70b) to understand user messages
and return a text reply + an optional app action (navigate / filter / clear).
"""
import os, json, httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL   = "llama-3.3-70b-versatile"

SYSTEM_PROMPT = """
You are a helpful assistant built into TrackerAI, a poker hand history analytics app.
The user's name is Noam.

You can answer questions about Noam's poker stats AND trigger app actions.

=== APP PAGES ===
- dashboard   → overview (chart + stat cards + last session)
- analytics   → interactive charts with all filters
- hands       → hand-by-hand list with filters
- sessions    → session history grouped by date
- opponents   → player pool stats

=== AVAILABLE FILTERS ===
stakes options: "NL10", "NL25", "NL50", "NL100", "NL200" (or null for all)
position options: "BTN", "CO", "HJ", "MP", "UTG", "SB", "BB" (or null for all)
result options: "win", "loss", "neutral" (or null for all)
dateFrom / dateTo: ISO date strings "YYYY-MM-DD" (or null)

=== RESPONSE FORMAT ===
Always reply with a JSON object (no markdown, no code fences) like:

{
  "text": "Your friendly reply to the user here.",
  "action": null
}

OR if you want to trigger an action:

{
  "text": "Sure, here are your NL50 sessions.",
  "action": {
    "type": "navigate+filter",
    "page": "analytics",
    "filter": {
      "stakes": "NL50",
      "position": null,
      "result": null,
      "dateFrom": null,
      "dateTo": null
    }
  }
}

Action types:
- "navigate"        → just go to a page  (requires "page")
- "filter"          → set filters without navigating (requires "filter")
- "navigate+filter" → go to page AND set filters (requires "page" + "filter")
- "clearFilters"    → clear all active filters (no extra fields)

If the user asks a general question about their stats (profit, best day, etc.),
answer using the context provided. Do not make up numbers — only use what's given.
If data is not available in the context, say so politely.

Keep replies short and friendly (1-3 sentences max).
"""


class ChatMessage(BaseModel):
    role: str   # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []
    context: dict = {}          # stats summary passed from frontend


def build_context_string(ctx: dict) -> str:
    if not ctx:
        return ""
    parts = []
    if ctx.get("totalHands"):
        parts.append(f"Total hands in DB: {ctx['totalHands']:,}")
    if ctx.get("totalProfit") is not None:
        parts.append(f"Total profit: ${ctx['totalProfit']:.2f}")
    if ctx.get("bb100") is not None:
        parts.append(f"BB/100: {ctx['bb100']:.2f}")
    if ctx.get("totalRake") is not None:
        parts.append(f"Total rake paid: ${ctx['totalRake']:.2f}")
    if ctx.get("stakes"):
        parts.append(f"Stakes played: {', '.join(ctx['stakes'])}")
    if ctx.get("sessionCount"):
        parts.append(f"Total sessions: {ctx['sessionCount']}")
    if ctx.get("dateRange"):
        parts.append(f"Date range: {ctx['dateRange']}")
    return "\n".join(parts)


@router.post("/api/chat")
async def chat(req: ChatRequest):
    api_key = os.environ.get("GROQ_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not set")

    context_str = build_context_string(req.context)
    system = SYSTEM_PROMPT
    if context_str:
        system += f"\n\n=== NOAM'S CURRENT DATA ===\n{context_str}"

    messages = [{"role": "system", "content": system}]
    for m in req.history[-10:]:          # last 10 turns for context
        messages.append({"role": m.role, "content": m.content})
    messages.append({"role": "user", "content": req.message})

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                GROQ_API_URL,
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={
                    "model": GROQ_MODEL,
                    "messages": messages,
                    "temperature": 0.4,
                    "max_tokens": 300,
                    "response_format": {"type": "json_object"},
                },
            )
        resp.raise_for_status()
        raw = resp.json()["choices"][0]["message"]["content"]
        parsed = json.loads(raw)
        return {"text": parsed.get("text", ""), "action": parsed.get("action")}

    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"Groq error: {e.response.text}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

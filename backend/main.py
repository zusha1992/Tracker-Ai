from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from parsers.gg_parser import parse_files_summary, parse_files_full, compute_pool_stats
from database import init_db, insert_hands, get_all_hands, get_sessions, delete_session, delete_all_hands

app = FastAPI(title="Tracker AI API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()


@app.get("/health")
def health():
    return {"status": "ok"}


# ── Load saved hands ──────────────────────────────────────────────────────────

@app.get("/api/hands")
def load_hands():
    """Return all saved hands + pool stats from the local database."""
    hands = get_all_hands()
    pool_stats = compute_pool_stats(hands)
    return {"hands": hands, "poolStats": pool_stats}


# ── Sessions ──────────────────────────────────────────────────────────────────

@app.get("/api/sessions")
def list_sessions():
    """Return sessions grouped by date and stakes."""
    return {"sessions": get_sessions()}


@app.delete("/api/sessions/{date}")
def remove_session(date: str):
    """Delete all hands from a specific date (YYYY-MM-DD)."""
    count = delete_session(date)
    return {"deleted": count}


@app.delete("/api/hands")
def clear_all():
    """Delete all saved hands."""
    count = delete_all_hands()
    return {"deleted": count}


# ── Parse ─────────────────────────────────────────────────────────────────────

@app.post("/api/parse/summary")
async def parse_summary(files: list[UploadFile] = File(...)):
    contents: list[str] = []
    for f in files:
        if not f.filename or not f.filename.endswith(".txt"):
            raise HTTPException(status_code=400, detail=f"Only .txt files are accepted (got: {f.filename})")
        raw = await f.read()
        try:
            contents.append(raw.decode("utf-8"))
        except UnicodeDecodeError:
            contents.append(raw.decode("latin-1"))

    if not contents:
        raise HTTPException(status_code=400, detail="No files provided")

    return parse_files_summary(contents)


@app.post("/api/parse/hands")
async def parse_hands(files: list[UploadFile] = File(...)):
    """Parse files, save new hands to DB (skip duplicates), return all hands + pool stats."""
    contents: list[str] = []
    for f in files:
        if not f.filename or not f.filename.endswith(".txt"):
            raise HTTPException(status_code=400, detail=f"Only .txt files are accepted (got: {f.filename})")
        raw = await f.read()
        try:
            contents.append(raw.decode("utf-8"))
        except UnicodeDecodeError:
            contents.append(raw.decode("latin-1"))

    if not contents:
        raise HTTPException(status_code=400, detail="No files provided")

    parsed = parse_files_full(contents)
    new_count = insert_hands(parsed)

    # Return full DB (not just the new batch) so frontend stays in sync
    all_hands = get_all_hands()
    pool_stats = compute_pool_stats(all_hands)
    return {"hands": all_hands, "poolStats": pool_stats, "newHands": new_count}

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from parsers.gg_parser import parse_files_summary

app = FastAPI(title="Tracker AI API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "phase": 3}


@app.post("/api/parse/summary")
async def parse_summary(files: list[UploadFile] = File(...)):
    """
    Accept one or more .txt hand history files and return a summary:
    hand count, stakes, date range, site, hero name.
    """
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

    result = parse_files_summary(contents)
    return result

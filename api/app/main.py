from fastapi import FastAPI

app = FastAPI(title="Curb Cut API")


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}

import asyncio
import os
import tempfile
from concurrent.futures import ThreadPoolExecutor

from fastapi import FastAPI, UploadFile
from faster_whisper import WhisperModel

app = FastAPI()
model = WhisperModel("base", device="cpu", compute_type="int8")

# Pool de threads dedicado à transcrição. Limitar o número de workers evita
# que várias transcrições concorrentes disputem a CPU ao mesmo tempo e
# fiquem todas mais lentas — geralmente 1 ou 2 é o ideal pra um modelo "base"
# rodando em CPU comum.
transcribe_executor = ThreadPoolExecutor(max_workers=2)


def _transcribe_sync(temp_path: str) -> str:
    """Função síncrona pura, roda dentro da thread do executor."""
    segments, _ = model.transcribe(temp_path, language="pt")
    return " ".join(s.text for s in segments)


@app.get("/health")
async def health():
    return {"ok": True}


@app.post("/transcribe")
async def transcribe(file: UploadFile):
    audio_bytes = await file.read()

    # 1. Cria um arquivo temporário ÚNICO para esta requisição
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_audio:
        temp_audio.write(audio_bytes)
        temp_path = temp_audio.name  # Ex: C:\Users\...\Temp\tmp123abc.webm

    try:
        # 2. Transcreve o arquivo único, SEM travar o event loop:
        # roda no executor -> outras requisições (inclusive outros
        # /transcribe chegando em paralelo) continuam sendo aceitas
        # e processadas enquanto essa transcrição roda em background.
        loop = asyncio.get_event_loop()
        text = await loop.run_in_executor(transcribe_executor, _transcribe_sync, temp_path)
        return {"text": text}
    finally:
        # 3. Limpa o arquivo logo após usar, para não lotar o HD
        if os.path.exists(temp_path):
            os.remove(temp_path)


if __name__ == "__main__":
    import argparse
    import uvicorn

    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8080)
    args = parser.parse_args()

    uvicorn.run(app, host="127.0.0.1", port=args.port)
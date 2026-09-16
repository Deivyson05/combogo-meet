from fastapi import FastAPI, UploadFile
from faster_whisper import WhisperModel
import asyncio, os, tempfile

app = FastAPI()
model = WhisperModel("base", device="cpu", compute_type="int8")

@app.post("/transcribe")
async def transcribe(file: UploadFile):
    audio_bytes = await file.read()

    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_audio:
        temp_audio.write(audio_bytes)
        temp_path = temp_audio.name

    try:
        # roda o transcribe em thread separada, sem travar o event loop
        loop = asyncio.get_event_loop()
        segments, _ = await loop.run_in_executor(
            None, lambda: model.transcribe(temp_path, language="pt")
        )
        text = " ".join(s.text for s in segments)
        return {"text": text}
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
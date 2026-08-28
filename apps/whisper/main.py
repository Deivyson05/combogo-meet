import os
import tempfile
from fastapi import FastAPI, UploadFile
from faster_whisper import WhisperModel

app = FastAPI()
model = WhisperModel("base", device="cpu", compute_type="int8")

@app.post("/transcribe")
async def transcribe(file: UploadFile):
    audio_bytes = await file.read()
    
    # 1. Cria um arquivo temporário ÚNICO para esta requisição
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_audio:
        temp_audio.write(audio_bytes)
        temp_path = temp_audio.name # Ex: C:\Users\...\Temp\tmp123abc.webm
        
    try:
        # 2. Transcreve o arquivo único
        segments, _ = model.transcribe(temp_path, language="pt")
        text = " ".join(s.text for s in segments)
        return {"text": text}
    finally:
        # 3. Limpa o arquivo logo após usar, para não lotar o HD
        if os.path.exists(temp_path):
            os.remove(temp_path)
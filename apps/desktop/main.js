const { app, BrowserWindow, Menu, session, desktopCapturer, clipboard, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const { fork, spawn } = require('child_process');
const { Document, Packer, Paragraph, HeadingLevel, TextRun } = require('docx');

let nextProcess;
let whisperProcess = null;
const WHISPER_PORT = 8756;

// roomId -> [{ speakerName, text, timestamp }]
const localTranscripts = new Map();

function resourceBaseDir() {
    // Empacotado (instalado): os arquivos do "extraResources" ficam em process.resourcesPath.
    // Em desenvolvimento (npm start direto na pasta apps/desktop): usamos a pasta local.
    return app.isPackaged ? process.resourcesPath : path.join(__dirname, 'resources');
}

function whisperBinaryPath() {
    const binName = process.platform === 'win32' ? 'whisper-server.exe' : 'whisper-server';
    return path.join(resourceBaseDir(), 'whisper-server', binName);
}

function nextServerPath() {
    return path.join(resourceBaseDir(), '.next', 'standalone', 'server.js');
}

function startWhisperServer() {
    whisperProcess = spawn(whisperBinaryPath(), ['--port', String(WHISPER_PORT)]);
    whisperProcess.stdout?.on('data', (d) => console.log(`[whisper] ${d}`));
    whisperProcess.stderr?.on('data', (d) => console.error(`[whisper] ${d}`));
    whisperProcess.on('exit', (code) => console.log(`[whisper] processo encerrou (code ${code})`));
}

function startNextServer() {
    nextProcess = fork(nextServerPath(), [], {
        env: { ...process.env, PORT: 3000, NODE_ENV: 'production' },
    });
}

async function waitUntilReady(url, timeoutMs = 30_000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        try {
            const res = await fetch(url);
            if (res.ok) return true;
        } catch {
            // ainda subindo, tenta de novo
        }
        await new Promise((r) => setTimeout(r, 500));
    }
    return false;
}

function appendLocalTranscript(roomId, speakerName, text) {
    const list = localTranscripts.get(roomId) ?? [];
    list.push({ speakerName, text, timestamp: Date.now() });
    localTranscripts.set(roomId, list);
}

async function buildTranscriptDocx(roomId, entries) {
    const doc = new Document({
        sections: [
            {
                children: [
                    new Paragraph({
                        text: 'Transcrição da chamada — Combogó Meet',
                        heading: HeadingLevel.HEADING_1,
                    }),
                    new Paragraph({
                        text: `Sala: ${roomId} · Gerado em ${new Date().toLocaleString('pt-BR')}`,
                    }),
                    new Paragraph({ text: '' }),
                    ...entries.map(
                        (entry) =>
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: `${new Date(entry.timestamp).toLocaleTimeString('pt-BR', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })} `,
                                        italics: true,
                                    }),
                                    new TextRun({ text: `${entry.speakerName}: `, bold: true }),
                                    new TextRun({ text: entry.text }),
                                ],
                            })
                    ),
                ],
            },
        ],
    });

    return Packer.toBuffer(doc);
}

ipcMain.handle('get-screen-sources', async () => {
    const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] });
    return sources.map((s) => ({
        id: s.id,
        name: s.name,
        thumbnail: s.thumbnail.toDataURL(),
    }));
});

ipcMain.handle('write-clipboard-text', (_event, text) => {
    if (typeof text !== 'string') {
        throw new TypeError('O texto para copiar deve ser uma string');
    }
    clipboard.writeText(text);
});

// A página chama isso via window.combogoDesktop.transcribeChunk(roomId, speakerName, audioBuffer)
ipcMain.handle('transcribe-chunk', async (_event, roomId, speakerName, audioBuffer) => {
    try {
        const form = new FormData();
        form.append('file', new Blob([audioBuffer], { type: 'audio/webm' }), 'chunk.webm');

        const res = await fetch(`http://127.0.0.1:${WHISPER_PORT}/transcribe`, {
            method: 'POST',
            body: form,
        });
        if (!res.ok) {
            console.error('[whisper] falha ao transcrever chunk', res.status);
            return;
        }

        const { text } = await res.json();
        if (text?.trim()) {
            appendLocalTranscript(roomId, speakerName, text.trim());
        }
    } catch (err) {
        console.error('[whisper] erro ao transcrever chunk', err);
    }
});

// A página chama isso quando o host clica em "Encerrar para todos"
ipcMain.handle('finalize-local', async (_event, roomId) => {
    const entries = localTranscripts.get(roomId);
    localTranscripts.delete(roomId);
    if (!entries || entries.length === 0) return { saved: false };

    const buffer = await buildTranscriptDocx(roomId, entries);

    const { filePath, canceled } = await dialog.showSaveDialog({
        defaultPath: `transcricao-${roomId}.docx`,
        filters: [{ name: 'Word', extensions: ['docx'] }],
    });
    if (canceled || !filePath) return { saved: false };

    await fs.writeFile(filePath, buffer);
    return { saved: true, path: filePath };
});

const createWindow = () => {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        icon: path.join(__dirname, 'public', 'combogo-meet-icon-app.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    win.loadURL('http://localhost:3000/');
};

app.whenReady().then(async () => {
    startNextServer();
    startWhisperServer();

    session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
        callback(permission === 'media' || permission === 'camera' || permission === 'microphone');
    });
    session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
        return permission === 'media' || permission === 'camera' || permission === 'microphone';
    });

    session.defaultSession.setDisplayMediaRequestHandler(
        (_request, callback) => {
            // Deixa o Windows/Mac mostrarem o seletor nativo de tela/janela.
            callback({ video: 'desktop', useSystemPicker: true });
        },
        { useSystemPicker: true }
    );

    await waitUntilReady('http://localhost:3000/');
    await waitUntilReady(`http://127.0.0.1:${WHISPER_PORT}/health`);

    Menu.setApplicationMenu(null);
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
    nextProcess?.kill();
    whisperProcess?.kill();
});
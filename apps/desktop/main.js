const { app, BrowserWindow, Menu, session, desktopCapturer, clipboard, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const fsSync = require('fs');
const { fork, spawn } = require('child_process');
const { Document, Packer, Paragraph, HeadingLevel, TextRun } = require('docx');

let nextProcess;
let whisperProcess = null;
const WHISPER_PORT = 8756;
const NEXT_PORT = 3000;

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

// No Mac/Linux, binários dentro de extraResources podem perder a flag de
// executável dependendo de como o pacote foi gerado/transferido. Garantimos
// a permissão em runtime, antes de tentar rodar o processo.
function ensureExecutable(binPath) {
    if (process.platform === 'win32') return;
    try {
        fsSync.chmodSync(binPath, 0o755);
    } catch (err) {
        console.error(`[permissions] não foi possível ajustar permissão de ${binPath}`, err);
    }
}

function startWhisperServer() {
    const binPath = whisperBinaryPath();
    ensureExecutable(binPath);

    whisperProcess = spawn(binPath, ['--port', String(WHISPER_PORT)]);
    whisperProcess.on('error', (err) => {
        console.error('[whisper] falha ao iniciar processo', err);
    });
    whisperProcess.stdout?.on('data', (d) => console.log(`[whisper] ${d}`));
    whisperProcess.stderr?.on('data', (d) => console.error(`[whisper] ${d}`));
    whisperProcess.on('exit', (code) => console.log(`[whisper] processo encerrou (code ${code})`));
}

function startNextServer() {
    nextProcess = fork(nextServerPath(), [], {
        env: { ...process.env, PORT: NEXT_PORT, NODE_ENV: 'production' },
    });
    nextProcess.on('error', (err) => {
        console.error('[next] falha ao iniciar processo', err);
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
    const windowOptions = {
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    };

    // No Windows, "icon" no BrowserWindow define o ícone da janela/taskbar.
    // No Mac isso é ignorado (o ícone do dock vem do bundle .app, configurado
    // em build.mac.icon no package.json), então só setamos no Windows.
    if (process.platform === 'win32') {
        windowOptions.icon = path.join(__dirname, 'public', 'combogo-meet-icon-app.ico');
    }

    const win = new BrowserWindow(windowOptions);
    win.loadURL(`http://localhost:${NEXT_PORT}/`);
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

    const nextOk = await waitUntilReady(`http://localhost:${NEXT_PORT}/`);
    if (!nextOk) {
        dialog.showErrorBox(
            'Erro ao iniciar',
            'Não foi possível iniciar o servidor local (Next.js). O app será encerrado.'
        );
        app.quit();
        return;
    }

    const whisperOk = await waitUntilReady(`http://127.0.0.1:${WHISPER_PORT}/health`);
    if (!whisperOk) {
        // Não travamos o app por causa do whisper: a transcrição fica indisponível,
        // mas o resto do app (chamada, etc.) continua funcionando.
        console.error('[whisper] servidor de transcrição não respondeu a tempo, seguindo sem ele');
    }

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
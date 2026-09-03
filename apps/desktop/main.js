const { app, BrowserWindow, Menu, session, desktopCapturer, clipboard, ipcMain } = require('electron');
const path = require('path');
const { fork } = require('child_process');

let nextProcess;

function startNextServer() {
    const serverPath = path.join(__dirname, 'resources', '.next', 'standalone', 'server.js');
    nextProcess = fork(serverPath, [], {
        env: { ...process.env, PORT: 3000, NODE_ENV: 'production' }
    })
}

ipcMain.handle('get-screen-sources', async () => {
    const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] });
    // retorna só os dados serializáveis (id, name, thumbnail como dataURL)
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

const createWindow = () => {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        icon: path.join(__dirname, 'public', 'combogo-meet-icon-app.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    win.loadURL('http://localhost:3000/');



}



app.whenReady().then(() => {
    startNextServer()
    setTimeout(() => {
        session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
            callback(permission === 'media' || permission === 'camera' || permission === 'microphone');
        });
        session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
            return permission === 'media' || permission === 'camera' || permission === 'microphone';
        });
        createWindow()
    }, 5000) // espera 5 segundos para garantir que o servidor Next.js esteja pronto
    Menu.setApplicationMenu(null)
})
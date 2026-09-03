const { app, BrowserWindow, Menu, session, desktopCapturer, ipcMain } = require('electron');
const path = require('path');
const { fork } = require('child_process');

let nextProcess;

const { systemPreferences } = require('electron');

async function checkMicPermission() {
    if (process.platform === 'darwin') {
        const status = systemPreferences.getMediaAccessStatus('microphone');
        if (status !== 'granted') {
            const granted = await systemPreferences.askForMediaAccess('microphone');
            return granted;
        }
        return true;
    }
    return true; // Windows/Linux não precisam desse passo
}



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

const createWindow = () => {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        icon: path.join(__dirname, 'public', 'combogo-meet-icon.ico'),
        webPreferences: {
            nodeIntegration: true, // permite usar require/import direto
            contextIsolation: false // facilita integração com Electron APIs
        }
    });

    win.loadURL('http://localhost:3000/');



}



app.whenReady().then(() => {
    startNextServer()
    setTimeout(() => {
        session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
            desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
                callback({ video: sources[0] }); // ou abra um seletor de UI aqui
            });
        }, { useSystemPicker: true});
        createWindow()
    }, 5000) // espera 5 segundos para garantir que o servidor Next.js esteja pronto
    Menu.setApplicationMenu(null)
})
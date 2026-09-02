const { app, BrowserWindow, Menu } = require('electron')
const path = require('path')

const createWindow = () => {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        icon: path.join(__dirname, 'public', 'combogo-meet-icon.ico'),
        webPreferences: {
            nodeIntegration: true, // permite usar require/import direto
            contextIsolation: false // facilita integração com Electron APIs
        }
    })


    win.loadURL('https://combogo-meet.vercel.app/')

}



app.whenReady().then(() => {
    createWindow()
    Menu.setApplicationMenu(null)
})
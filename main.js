const { app, BrowserWindow, dialog, ipcMain } = require('electron');

app.allowRendererProcessReuse = false;

let win = null;
function createWindow () {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.on('close', async (e) => {
    e.preventDefault();
    checaSaida();
  });

  ipcMain.handle('checaSaida', () => {
    checaSaida();
  });

  win.setMenu(null);
  win.loadFile('index.html');
  win.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

async function checaSaida() {
  try {
    const resultado = await dialog.showMessageBox(
      win, {message: 'Deseja sair?', buttons: [ 'Sim', 'Não' ]});
      
    if(resultado.response === 0) {
      app.exit();
    }
  } catch(e) {
    console.log(e);
  }
}
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

  // Pergunta ao usuário se quer encerrar a aplicação
  ipcMain.handle('checaSaida', () => {
    checaSaida();
  });

  // Exibe diálogo para salvar arquivo
  ipcMain.handle('salvaDados', () => {
    return dialog.showSaveDialogSync(win);
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
      win, { 
        message: 'Deseja sair?',
        buttons: [ 'Não', 'Sim' ],
        cancelId: 0,
        type: 'question' 
      });
      
    if(resultado.response === 1) {
      console.log(resultado.response);
      app.exit();
    }
  } catch(e) {
    console.log(e);
  }
}
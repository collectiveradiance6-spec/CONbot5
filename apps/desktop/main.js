// ═══════════════════════════════════════════════════════════════════════
// CONbot5 — DESKTOP OPERATOR v5.0 (Electron)
// Premium admin-grade control surface
// ═══════════════════════════════════════════════════════════════════════
'use strict';
require('dotenv').config({ path: require('path').join(__dirname,'../../.env') });

const { app, BrowserWindow, ipcMain, shell, Menu, Tray, nativeImage } = require('electron');
const path = require('path');
const http = require('http');

const API_URL  = process.env.API_URL  || 'http://localhost:3020';
const GUILD_ID = process.env.DISCORD_GUILD_ID || '';

let mainWindow = null;
let tray       = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width:  1400,
    height: 900,
    minWidth:  900,
    minHeight: 600,
    backgroundColor: '#040609',
    titleBarStyle: process.platform==='darwin' ? 'hiddenInset' : 'default',
    frame: process.platform !== 'darwin',
    vibrancy: 'dark',
    visualEffectState: 'active',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    title: 'CONbot5 Supreme',
  });

  // Load web dashboard with guild ID
  const webURL = `file://${path.join(__dirname, 'renderer', 'index.html')}`;
  mainWindow.loadURL(webURL);

  // Open DevTools in dev
  if (process.env.NODE_ENV==='development') mainWindow.webContents.openDevTools();

  mainWindow.on('closed', ()=>{ mainWindow=null; });

  // Set up application menu
  const template = [
    { label:'File', submenu:[
      { label:'Quit CONbot5', accelerator:'CmdOrCtrl+Q', click:()=>app.quit() },
    ]},
    { label:'Control', submenu:[
      { label:'Play/Pause',   accelerator:'Space',           click:()=>sendCmd('pause') },
      { label:'Skip Track',   accelerator:'CmdOrCtrl+Right', click:()=>sendCmd('skip') },
      { label:'Previous',     accelerator:'CmdOrCtrl+Left',  click:()=>sendCmd('prev') },
      { label:'Volume Up',    accelerator:'CmdOrCtrl+Up',    click:()=>sendCmd('volume',{level:Math.min(100,(parseInt(lastVol)||80)+10)}) },
      { label:'Volume Down',  accelerator:'CmdOrCtrl+Down',  click:()=>sendCmd('volume',{level:Math.max(0,(parseInt(lastVol)||80)-10)}) },
      { type:'separator' },
      { label:'Stop',         click:()=>sendCmd('stop') },
      { label:'Clear Queue',  click:()=>sendCmd('clear') },
      { label:'Toggle Shuffle', click:()=>sendCmd('shuffle') },
      { label:'Toggle Loop',  click:()=>sendCmd('loop',{mode:'track'}) },
    ]},
    { label:'View', submenu:[
      { label:'Reload',       accelerator:'CmdOrCtrl+R', role:'reload' },
      { label:'Force Reload', accelerator:'CmdOrCtrl+Shift+R', role:'forceReload' },
      { label:'Toggle DevTools', accelerator:'F12', role:'toggleDevTools' },
      { type:'separator' },
      { label:'Zoom In',  role:'zoomIn' },
      { label:'Zoom Out', role:'zoomOut' },
      { label:'Reset Zoom', role:'resetZoom' },
    ]},
    { label:'Window', submenu:[
      { role:'minimize' }, { role:'zoom' }, { role:'close' },
    ]},
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

let lastVol = 80;

async function sendCmd(command, payload={}) {
  if (!GUILD_ID) return;
  try {
    await fetch(`${API_URL}/commands/${GUILD_ID}`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({command,...payload}),
    });
  } catch {}
}

app.whenReady().then(()=>{
  createWindow();

  // System tray
  try {
    const iconPath = path.join(__dirname,'assets','tray.png');
    tray = new Tray(nativeImage.createEmpty());
    tray.setToolTip('CONbot5 Supreme');
    tray.setContextMenu(Menu.buildFromTemplate([
      { label:'Show CONbot5', click:()=>{ if (mainWindow) mainWindow.show(); else createWindow(); } },
      { label:'Play/Pause',   click:()=>sendCmd('pause') },
      { label:'Skip',         click:()=>sendCmd('skip') },
      { type:'separator' },
      { label:'Quit',         click:()=>app.quit() },
    ]));
    tray.on('double-click', ()=>mainWindow?.show());
  } catch {}

  app.on('activate', ()=>{ if (!mainWindow) createWindow(); });
});

app.on('window-all-closed', ()=>{ if (process.platform!=='darwin') app.quit(); });

// IPC
ipcMain.handle('send-command', async(_e, cmd, payload)=>sendCmd(cmd,payload));
ipcMain.handle('get-config', ()=>({ API_URL, GUILD_ID }));

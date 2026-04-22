// ═══════════════════════════════════════════════════════════════════════
// CONbot5 — WEBSOCKET GATEWAY v5.0
// Real-time bridge: bot ↔ web ↔ desktop via Socket.io
// ═══════════════════════════════════════════════════════════════════════
'use strict';
require('dotenv').config();

const http    = require('http');
const { Server } = require('socket.io');
const cors    = require('cors');

const PORT     = parseInt(process.env.WS_PORT || '3030');
const API_URL  = (process.env.API_URL || 'http://localhost:3020').replace(/\/$/, '');

const server = http.createServer((req, res) => {
  if (req.url==='/health') { res.writeHead(200,{'Content-Type':'application/json'}); res.end(JSON.stringify({status:'ok',service:'conbot5-ws',version:'5.0'})); }
  else { res.writeHead(404); res.end(); }
});

const io = new Server(server, {
  cors: { origin:'*', methods:['GET','POST'] },
  pingTimeout:  20_000,
  pingInterval: 25_000,
});

// ── IN-MEMORY STATE ────────────────────────────────────────────────────
const guildStates = new Map(); // guildId → state object
const pendingCmds = new Map(); // guildId → [{command,payload,ts}]

// ── BOT NAMESPACE ──────────────────────────────────────────────────────
const botNS = io.of('/bot');

botNS.on('connection', socket => {
  console.log('🤖 Bot connected:', socket.id);

  // Bot pushes state updates
  socket.on('state_update', ({ guildId, state }) => {
    if (!guildId || !state) return;
    guildStates.set(guildId, { ...state, updatedAt:Date.now() });
    io.of('/client').to(`guild:${guildId}`).emit('state', guildStates.get(guildId));
  });

  // Bot requests pending commands
  socket.on('poll_commands', ({ guildId }) => {
    const cmds = (pendingCmds.get(guildId)||[]).filter(c=>Date.now()-c.ts<30_000);
    pendingCmds.set(guildId, []);
    socket.emit('commands', { guildId, commands:cmds });
  });

  socket.on('disconnect', () => console.log('🤖 Bot disconnected:', socket.id));
});

// ── CLIENT NAMESPACE (web/desktop) ────────────────────────────────────
const clientNS = io.of('/client');

clientNS.on('connection', socket => {
  console.log('🌐 Client connected:', socket.id);

  socket.on('join', ({ guildId }) => {
    socket.join(`guild:${guildId}`);
    socket.guildId = guildId;
    const state = guildStates.get(guildId);
    if (state) socket.emit('state', state);
  });

  socket.on('command', ({ guildId, command, payload }) => {
    if (!guildId || !command) return;
    if (!pendingCmds.has(guildId)) pendingCmds.set(guildId, []);
    pendingCmds.get(guildId).push({ command, payload:payload||{}, ts:Date.now() });

    // Optimistic state update for snappy UI
    const state = guildStates.get(guildId);
    if (!state) return;

    switch (command) {
      case 'pause':    state.paused=true; break;
      case 'resume':   state.paused=false; break;
      case 'shuffle':  state.shuffle=!state.shuffle; break;
      case 'autoplay': state.autoplay=!state.autoplay; break;
      case 'clear':    state.queue=[]; break;
      case 'volume':   if (payload?.level!==undefined) state.volume=parseInt(payload.level); break;
    }

    // Broadcast optimistic state
    clientNS.to(`guild:${guildId}`).emit('state', state);
  });

  socket.on('disconnect', () => console.log('🌐 Client disconnected:', socket.id));
});

// ── PROGRESS TICK ──────────────────────────────────────────────────────
setInterval(()=>{
  for (const [guildId, state] of guildStates) {
    if (state.current && !state.paused) {
      state.elapsed = (state.elapsed||0) + 1;
      clientNS.to(`guild:${guildId}`).emit('tick', {elapsed:state.elapsed});
    }
  }
}, 1000);

server.listen(PORT, ()=>console.log(`🔌 CONbot5 WS Gateway on :${PORT}`));
module.exports = { io, server };

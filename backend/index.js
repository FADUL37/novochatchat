const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'https://novochatchat-p67l.onrender.com', // frontend Render
    methods: ['GET', 'POST']
  }
});

const users = new Set();

io.on('connection', (socket) => {
  console.log('✅ Usuário conectado:', socket.id);

  socket.on('set nickname', (nickname) => {
    socket.nickname = nickname;
    users.add(nickname);
    io.emit('user list', Array.from(users));
    io.emit('chat message', {
      type: 'info',
      text: `👋 ${nickname} entrou no chat!`
    });
  });

  socket.on('chat message', (msg) => {
    io.emit('chat message', msg);
  });

  socket.on('disconnecting', () => {
    if (socket.nickname) {
      users.delete(socket.nickname);
      io.emit('user list', Array.from(users));
      io.emit('chat message', {
        type: 'info',
        text: `🚪 ${socket.nickname} saiu do chat.`
      });
    }
  });
});

app.get('/', (req, res) => {
  res.send('✅ Backend funcionando com Socket.IO!');
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});

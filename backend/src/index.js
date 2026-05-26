require('dotenv').config();
const express  = require('express');
const http     = require('http');
const cors     = require('cors');
const path     = require('path');
const { Server } = require('socket.io');
const jwt      = require('jsonwebtoken');

const app    = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET','POST'] },
  transports: ['websocket', 'polling'],
});

// JWT auth for sockets
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Unauthorized'));
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  socket.on('join:project',  (pid) => socket.join(`project:${pid}`));
  socket.on('leave:project', (pid) => socket.leave(`project:${pid}`));
});

global.io = io;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth',     require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/tasks',    require('./routes/tasks'));
app.use('/api/stages',   require('./routes/stages'));
app.use('/api/kpi',      require('./routes/kpi'));
app.use('/api/users',    require('./routes/users'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: new Date() }));

const frontendDist = path.join(__dirname, '../../frontend/dist');
const fs = require('fs');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Tankatus IS backend запущен на порту ${PORT} (WebSocket включён)`);
});

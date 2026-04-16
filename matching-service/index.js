const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const initSocketHandler = require('./socket/socketHandler');

// set up http server and socket.io
const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Adjust for production
    methods: ["GET", "POST"]
  },
  pingInterval: 5000,  // send a ping every 5s
  pingTimeout: 10000,  // disconnect if no pong within 10s
});

const PORT = process.env.PORT || 3002;

// Verify JWT on socket connection before any events are handled.
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));

  try {
    const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
    socket.userId = decoded.id; 
    next();
  } catch (err) {
    next(new Error('Invalid or expired token'));
  }
});

// Initialize Socket Handler
initSocketHandler(io);

app.get('/', (req, res) => {
  res.send('Matching Service is running');
});

server.listen(PORT, () => {
  console.log(`Matching Service listening on port ${PORT}`);
});

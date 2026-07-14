import http from 'http';
import { Server } from 'socket.io';
import { app } from './app';
import { ENV } from './config/env';

const server = http.createServer(app);

// Initialize Socket.IO server
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT'],
  },
});

// Inject io into the Express app configuration to make it accessible inside controllers
app.set('io', io);

io.on('connection', (socket) => {
  console.log(`[Socket] New connection established: ${socket.id}`);

  // Let client join an order-specific room for real-time support/customer chat
  socket.on('join_order', (orderId: string) => {
    const room = `order:${orderId}`;
    socket.join(room);
    console.log(`[Socket] Client ${socket.id} joined room: ${room}`);
  });

  // Let client join driver-specific room for notifications
  socket.on('join_driver', (driverId: string) => {
    const room = `driver:${driverId}`;
    socket.join(room);
    console.log(`[Socket] Driver ${socket.id} joined notification room: ${room}`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// Start listening
server.listen(ENV.PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 Delivery Buddy Server initialized successfully!`);
  console.log(`📌 Port: ${ENV.PORT}`);
  console.log(`📌 Mode: ${ENV.NODE_ENV}`);
  console.log(`📌 Interactive Swagger: http://localhost:${ENV.PORT}/docs`);
  console.log(`=================================================`);
});

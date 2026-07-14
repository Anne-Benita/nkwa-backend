"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const app_1 = require("./app");
const env_1 = require("./config/env");
const server = http_1.default.createServer(app_1.app);
// Initialize Socket.IO server
const io = new socket_io_1.Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PATCH', 'PUT'],
    },
});
// Inject io into the Express app configuration to make it accessible inside controllers
app_1.app.set('io', io);
io.on('connection', (socket) => {
    console.log(`[Socket] New connection established: ${socket.id}`);
    // Let client join an order-specific room for real-time support/customer chat
    socket.on('join_order', (orderId) => {
        const room = `order:${orderId}`;
        socket.join(room);
        console.log(`[Socket] Client ${socket.id} joined room: ${room}`);
    });
    // Let client join driver-specific room for notifications
    socket.on('join_driver', (driverId) => {
        const room = `driver:${driverId}`;
        socket.join(room);
        console.log(`[Socket] Driver ${socket.id} joined notification room: ${room}`);
    });
    socket.on('disconnect', () => {
        console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
});
// Start listening
server.listen(env_1.ENV.PORT, () => {
    console.log(`=================================================`);
    console.log(`🚀 Delivery Buddy Server initialized successfully!`);
    console.log(`📌 Port: ${env_1.ENV.PORT}`);
    console.log(`📌 Mode: ${env_1.ENV.NODE_ENV}`);
    console.log(`📌 Interactive Swagger: http://localhost:${env_1.ENV.PORT}/docs`);
    console.log(`=================================================`);
});

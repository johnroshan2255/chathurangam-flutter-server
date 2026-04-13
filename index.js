import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import {
  createRoom,
  joinRoom,
  getRoom,
  removePlayerFromRoom,
  updateGameState,
  resetGame,
  getPlayerSymbol
} from './roomManager.js';
import { makeMove, checkWinner } from './gameLogic.js';

dotenv.config();

const clientOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((o) => o.trim()).filter(Boolean)
  : true;

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: clientOrigins,
    methods: ['GET', 'POST']
  }
});

app.use(cors({ origin: clientOrigins }));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('create-room', () => {
    const { roomCode, room } = createRoom(socket.id);
    socket.join(roomCode);
    socket.emit('room-created', { roomCode, playerSymbol: 0 });
    console.log(`Room created: ${roomCode}`);
  });

  socket.on('join-room', (roomCode) => {
    const result = joinRoom(roomCode, socket.id);
    
    if (!result.success) {
      socket.emit('join-error', { error: result.error });
      return;
    }

    socket.join(roomCode);
    socket.emit('room-joined', { roomCode, playerSymbol: 1 });
    
    io.to(roomCode).emit('game-start', {
      players: result.room.players,
      gameState: result.room.gameState
    });
    
    console.log(`Player joined room: ${roomCode}`);
  });

  socket.on('make-move', ({ roomCode, from, to }) => {
    const room = getRoom(roomCode);
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    const playerSymbol = getPlayerSymbol(roomCode, socket.id);
    if (playerSymbol === null) {
      socket.emit('error', { message: 'Not in this room' });
      return;
    }

    if (room.gameState.currentTurn !== playerSymbol) {
      socket.emit('error', { message: 'Not your turn' });
      return;
    }

    if (room.gameState.winner !== null) {
      socket.emit('error', { message: 'Game already ended' });
      return;
    }

    const moveResult = makeMove(room.gameState, playerSymbol, from, to);
    
    if (!moveResult.success) {
      socket.emit('error', { message: moveResult.error });
      return;
    }

    const updates = {
      board: moveResult.board,
      leftStart: moveResult.leftStart,
      currentTurn: (playerSymbol + 1) % 2,
      selectedPiece: null,
      winLine: null
    };

    const winResult = checkWinner(moveResult.board, moveResult.leftStart);
    if (winResult.winner !== null) {
      updates.winner = winResult.winner;
      updates.winLine = winResult.highlight;
      const newScores = [...room.gameState.scores];
      newScores[winResult.winner]++;
      updates.scores = newScores;
    }

    updateGameState(roomCode, updates);
    io.to(roomCode).emit('game-update', room.gameState);
  });

  socket.on('restart-game', (roomCode) => {
    const room = resetGame(roomCode);
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    io.to(roomCode).emit('game-update', room.gameState);
    console.log(`Game restarted in room: ${roomCode}`);
  });

  socket.on('disconnect', () => {
    const result = removePlayerFromRoom(socket.id);
    if (result) {
      io.to(result.roomCode).emit('player-left');
      console.log(`Player left room: ${result.roomCode}`);
    }
    console.log(`Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5001;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

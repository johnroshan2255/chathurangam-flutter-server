import { createInitialGameState } from './gameLogic.js';

const rooms = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function createRoom(hostSocketId) {
  let roomCode = generateRoomCode();
  while (rooms.has(roomCode)) {
    roomCode = generateRoomCode();
  }
  
  const room = {
    code: roomCode,
    players: [{ id: hostSocketId, symbol: 0 }],
    gameState: createInitialGameState(),
    createdAt: Date.now()
  };
  
  rooms.set(roomCode, room);
  return { roomCode, room };
}

export function joinRoom(roomCode, socketId) {
  const room = rooms.get(roomCode);
  
  if (!room) {
    return { success: false, error: 'Room not found' };
  }
  
  if (room.players.length >= 2) {
    return { success: false, error: 'Room is full' };
  }
  
  if (room.players.some(p => p.id === socketId)) {
    return { success: false, error: 'Already in room' };
  }
  
  room.players.push({ id: socketId, symbol: 1 });
  return { success: true, room };
}

export function getRoom(roomCode) {
  return rooms.get(roomCode);
}

export function removePlayerFromRoom(socketId) {
  for (const [code, room] of rooms.entries()) {
    const playerIndex = room.players.findIndex(p => p.id === socketId);
    if (playerIndex !== -1) {
      room.players.splice(playerIndex, 1);
      if (room.players.length === 0) {
        rooms.delete(code);
      }
      return { roomCode: code, room };
    }
  }
  return null;
}

export function updateGameState(roomCode, updates) {
  const room = rooms.get(roomCode);
  if (!room) return null;

  const next = { ...room.gameState, ...updates };
  delete next.piecesPlaced;
  delete next.goalCells;
  room.gameState = next;
  return room;
}

export function resetGame(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return null;
  
  const currentScores = room.gameState.scores;
  room.gameState = createInitialGameState();
  room.gameState.scores = currentScores;
  
  return room;
}

export function getPlayerSymbol(roomCode, socketId) {
  const room = rooms.get(roomCode);
  if (!room) return null;
  
  const player = room.players.find(p => p.id === socketId);
  return player ? player.symbol : null;
}

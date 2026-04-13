export const BOARD_CONNECTIONS = {
  0: [1, 3, 4],
  1: [0, 2, 4],
  2: [1, 4, 5],
  3: [0, 4, 6],
  4: [0, 1, 2, 3, 5, 6, 7, 8],
  5: [2, 4, 8],
  6: [3, 4, 7],
  7: [4, 6, 8],
  8: [4, 5, 7]
};

export const START_CELLS = {
  0: [6, 7, 8],
  1: [0, 1, 2]
};

export const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6]
];

const EMPTY_LEFT = () => [
  [false, false, false],
  [false, false, false]
];

function buildStartingBoard() {
  const board = Array(9).fill(null);
  for (const i of START_CELLS[0]) board[i] = 0;
  for (const i of START_CELLS[1]) board[i] = 1;
  return board;
}

export function createInitialGameState() {
  return {
    board: buildStartingBoard(),
    currentTurn: 0,
    phase: 'play',
    scores: [0, 0],
    winner: null,
    winLine: null,
    leftStart: EMPTY_LEFT()
  };
}

function cloneLeftStart(ls) {
  const base = ls ?? EMPTY_LEFT();
  return [[...base[0]], [...base[1]]];
}

export function isValidMove(board, from, to, playerId) {
  if (from < 0 || from >= 9 || to < 0 || to >= 9) return false;
  if (board[from] !== playerId) return false;
  if (board[to] !== null) return false;
  return BOARD_CONNECTIONS[from].includes(to);
}

export function checkWinner(board, leftStart) {
  const ls = leftStart ?? EMPTY_LEFT();
  const p0Ready = ls[0].every(Boolean);
  const p1Ready = ls[1].every(Boolean);

  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (p0Ready && board[a] === 0 && board[b] === 0 && board[c] === 0) {
      return { winner: 0, highlight: line };
    }
    if (p1Ready && board[a] === 1 && board[b] === 1 && board[c] === 1) {
      return { winner: 1, highlight: line };
    }
  }
  return { winner: null, highlight: null };
}

export function makeMove(gameState, playerId, from, to) {
  if (from === null || from === undefined || to === null || to === undefined) {
    return { success: false, error: 'Select a piece and a destination' };
  }

  const newBoard = [...gameState.board];

  if (!isValidMove(newBoard, from, to, playerId)) {
    return { success: false, error: 'Invalid move' };
  }

  const leftStart = cloneLeftStart(gameState.leftStart);
  const starts = START_CELLS[playerId];
  const si = starts.indexOf(from);
  if (si !== -1) {
    leftStart[playerId][si] = true;
  }

  newBoard[from] = null;
  newBoard[to] = playerId;

  return { success: true, board: newBoard, leftStart };
}

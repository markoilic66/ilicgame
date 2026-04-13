const BASE_POINTS = 100;
const BEST_SCORE_KEY = 'ilicgame_best_score';

function createEmptyBoard(size) {
  return Array.from({ length: size }, () => Array(size).fill(0));
}

function cloneBoard(board) {
  return board.map((row) => [...row]);
}

function inBounds(size, row, col) {
  return row >= 0 && row < size && col >= 0 && col < size;
}

function getNeighborCoords(size, row, col) {
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  return dirs
    .map(([dr, dc]) => [row + dr, col + dc])
    .filter(([r, c]) => inBounds(size, r, c));
}

function calculatePointsForMove(moveNumber) {
  if (moveNumber <= 0) {
    return 0;
  }
  return BASE_POINTS * 2 ** (moveNumber - 1);
}

function readBestScore() {
  const value = Number(localStorage.getItem(BEST_SCORE_KEY) || 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function writeBestScore(score) {
  localStorage.setItem(BEST_SCORE_KEY, String(score));
}

export class IlicGame {
  constructor(size = 6) {
    this.size = size;
    this.bestScore = readBestScore();
    this.reset();
  }

  reset() {
    this.board = createEmptyBoard(this.size);
    this.moveNumber = 0;
    this.totalScore = 0;
    this.latestGain = 0;
    this.lastMove = null;
    this.validMoves = this.getAllUndiscoveredCells();
    this.history = [];
  }

  getAllUndiscoveredCells() {
    const cells = [];
    for (let r = 0; r < this.size; r += 1) {
      for (let c = 0; c < this.size; c += 1) {
        if (this.board[r][c] === 0) {
          cells.push([r, c]);
        }
      }
    }
    return cells;
  }

  getState() {
    return {
      size: this.size,
      board: cloneBoard(this.board),
      moveNumber: this.moveNumber,
      totalScore: this.totalScore,
      latestGain: this.latestGain,
      bestScore: this.bestScore,
      validMoves: this.validMoves.map(([r, c]) => [r, c]),
      canUndo: this.history.length > 0,
    };
  }

  isValidMove(row, col) {
    return this.validMoves.some(([r, c]) => r === row && c === col);
  }

  saveSnapshot() {
    this.history.push({
      board: cloneBoard(this.board),
      moveNumber: this.moveNumber,
      totalScore: this.totalScore,
      latestGain: this.latestGain,
      lastMove: this.lastMove ? [...this.lastMove] : null,
      validMoves: this.validMoves.map(([r, c]) => [r, c]),
    });
  }

  discover(row, col) {
    if (!this.isValidMove(row, col)) {
      return false;
    }

    this.saveSnapshot();

    this.moveNumber += 1;
    this.latestGain = calculatePointsForMove(this.moveNumber);
    this.totalScore += this.latestGain;

    this.board[row][col] = this.moveNumber;
    this.lastMove = [row, col];

    const nextValid = getNeighborCoords(this.size, row, col).filter(
      ([r, c]) => this.board[r][c] === 0,
    );
    this.validMoves = nextValid;

    if (this.totalScore > this.bestScore) {
      this.bestScore = this.totalScore;
      writeBestScore(this.bestScore);
    }

    return true;
  }

  undo() {
    if (this.history.length === 0) {
      return false;
    }

    const previous = this.history.pop();
    this.board = cloneBoard(previous.board);
    this.moveNumber = previous.moveNumber;
    this.totalScore = previous.totalScore;
    this.latestGain = previous.latestGain;
    this.lastMove = previous.lastMove ? [...previous.lastMove] : null;
    this.validMoves = previous.validMoves.map(([r, c]) => [r, c]);

    return true;
  }
}

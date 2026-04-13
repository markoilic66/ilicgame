import { IlicGame } from './gameLogic.js';

const boardEl = document.getElementById('board');
const moveNumberEl = document.getElementById('moveNumber');
const latestGainEl = document.getElementById('latestGain');
const totalScoreEl = document.getElementById('totalScore');
const bestScoreEl = document.getElementById('bestScore');
const undoBtn = document.getElementById('undoBtn');
const restartBtn = document.getElementById('restartBtn');

const game = new IlicGame(6);

function toKey(row, col) {
  return `${row}:${col}`;
}

function render() {
  const state = game.getState();
  const validSet = new Set(state.validMoves.map(([r, c]) => toKey(r, c)));

  moveNumberEl.textContent = String(state.moveNumber);
  latestGainEl.textContent = String(state.latestGain);
  totalScoreEl.textContent = String(state.totalScore);
  bestScoreEl.textContent = String(state.bestScore);
  undoBtn.disabled = !state.canUndo;

  boardEl.replaceChildren();

  for (let row = 0; row < state.size; row += 1) {
    for (let col = 0; col < state.size; col += 1) {
      const moveValue = state.board[row][col];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cell';
      btn.setAttribute('role', 'gridcell');
      btn.dataset.row = String(row);
      btn.dataset.col = String(col);

      if (moveValue > 0) {
        btn.classList.add('taken');
        btn.disabled = true;
        btn.textContent = String(moveValue);
      } else if (validSet.has(toKey(row, col))) {
        btn.classList.add('valid');
        btn.textContent = '•';
      } else {
        btn.disabled = true;
        btn.textContent = '';
      }

      btn.addEventListener('click', () => {
        if (game.discover(row, col)) {
          render();
        }
      });

      boardEl.append(btn);
    }
  }
}

undoBtn.addEventListener('click', () => {
  if (game.undo()) {
    render();
  }
});

restartBtn.addEventListener('click', () => {
  game.reset();
  render();
});

render();

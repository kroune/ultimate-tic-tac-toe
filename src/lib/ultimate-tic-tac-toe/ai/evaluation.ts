/**
 * Position evaluation heuristics for Ultimate Tic-Tac-Toe.
 * Positive score = X is winning, Negative score = O is winning.
 */

import { GameState, Player, SmallBoardStatus, CellState } from '../types';

// Константы для терминальных состояний
export const SCORE_WIN = 100000;
export const SCORE_LOSS = -100000;
export const SCORE_DRAW = 0;

// Веса для эвристики
const WEIGHTS = {
  wonBoard: 1000,           // Выигранная малая доска
  twoInRowGlobal: 300,      // Два в ряд на глобальной доске
  twoInRowLocal: 30,        // Два в ряд на малой доске
  centerBoard: 150,         // Бонус за центральную доску (1,1)
  cornerBoard: 50,          // Бонус за угловую доску
  centerCell: 10,           // Центральная клетка малой доски
  cornerCell: 5,            // Угловая клетка малой доски
  mobility: 2,              // Бонус за количество доступных ходов
  sendToWonBoard: 100,      // Бонус если отправляем противника на недоступную доску
};

// Позиционные множители для досок (центр важнее углов, углы важнее рёбер)
const BOARD_POSITION_MULTIPLIER: number[][] = [
  [1.2, 1.0, 1.2],
  [1.0, 1.5, 1.0],
  [1.2, 1.0, 1.2],
];

// Все линии для проверки 3 в ряд
const LINES: [number, number][][] = [
  // Горизонтали
  [[0, 0], [0, 1], [0, 2]],
  [[1, 0], [1, 1], [1, 2]],
  [[2, 0], [2, 1], [2, 2]],
  // Вертикали
  [[0, 0], [1, 0], [2, 0]],
  [[0, 1], [1, 1], [2, 1]],
  [[0, 2], [1, 2], [2, 2]],
  // Диагонали
  [[0, 0], [1, 1], [2, 2]],
  [[0, 2], [1, 1], [2, 0]],
];

/**
 * Оценивает позицию с точки зрения игрока X.
 * Положительное значение — X лидирует, отрицательное — O лидирует.
 *
 * @param state - текущее состояние игры
 * @param depth - оставшаяся глубина поиска (для предпочтения быстрой победы)
 * @returns score (±SCORE_WIN для победы, 0 для ничьи, промежуточное значение иначе)
 */
export function evaluatePosition(state: GameState, depth: number = 0): number {
  // Терминальные состояния
  if (state.isGameOver) {
    if (state.winner === 'X') return SCORE_WIN + depth; // Быстрая победа лучше
    if (state.winner === 'O') return SCORE_LOSS - depth;
    return SCORE_DRAW;
  }

  let score = 0;

  // 1. Оценка глобальной доски
  score += evaluateGlobalBoard(state.globalBoard);

  // 2. Оценка малых досок (клетки внутри)
  score += evaluateLocalBoards(state.boards, state.globalBoard);

  // 3. Позиционные факторы
  score += evaluatePositionalFactors(state);

  return score;
}

/**
 * Оценивает глобальную доску: выигранные доски и угрозы.
 */
function evaluateGlobalBoard(globalBoard: SmallBoardStatus[][]): number {
  let score = 0;

  // Подсчёт выигранных досок с позиционными множителями
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const status = globalBoard[row][col];
      if (status.type === 'won') {
        const multiplier = BOARD_POSITION_MULTIPLIER[row][col];
        const value = WEIGHTS.wonBoard * multiplier;
        score += status.winner === 'X' ? value : -value;
      }
    }
  }

  // Проверка "два в ряд" на глобальной доске (угрозы)
  score += countTwoInRowOnGlobalBoard(globalBoard, 'X') * WEIGHTS.twoInRowGlobal;
  score -= countTwoInRowOnGlobalBoard(globalBoard, 'O') * WEIGHTS.twoInRowGlobal;

  return score;
}

/**
 * Подсчитывает количество линий с двумя фигурами игрока и одной свободной клеткой.
 */
function countTwoInRowOnGlobalBoard(globalBoard: SmallBoardStatus[][], player: Player): number {
  let count = 0;

  for (const line of LINES) {
    let playerCount = 0;
    let emptyCount = 0;

    for (const [row, col] of line) {
      const status = globalBoard[row][col];
      if (status.type === 'won' && status.winner === player) {
        playerCount++;
      } else if (status.type === 'playing') {
        emptyCount++;
      }
    }

    // Два в ряд с возможностью завершить линию
    if (playerCount === 2 && emptyCount === 1) {
      count++;
    }
  }

  return count;
}

/**
 * Оценивает все малые доски, которые ещё в игре.
 */
function evaluateLocalBoards(boards: CellState[][][][], globalBoard: SmallBoardStatus[][]): number {
  let score = 0;

  for (let boardRow = 0; boardRow < 3; boardRow++) {
    for (let boardCol = 0; boardCol < 3; boardCol++) {
      const status = globalBoard[boardRow][boardCol];

      // Оцениваем только доски в игре
      if (status.type !== 'playing') continue;

      const cells = boards[boardRow][boardCol];
      const positionMultiplier = BOARD_POSITION_MULTIPLIER[boardRow][boardCol];

      // Оценка позиций на малой доске
      score += evaluateSmallBoard(cells) * positionMultiplier;
    }
  }

  return score;
}

/**
 * Оценивает одну малую доску.
 */
function evaluateSmallBoard(cells: CellState[][]): number {
  let score = 0;

  // Оценка отдельных клеток
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const cell = cells[row][col];
      if (cell === null) continue;

      let value = 0;

      // Центр
      if (row === 1 && col === 1) {
        value = WEIGHTS.centerCell;
      }
      // Углы
      else if ((row === 0 || row === 2) && (col === 0 || col === 2)) {
        value = WEIGHTS.cornerCell;
      }
      // Рёбра (меньший приоритет)
      else {
        value = 2;
      }

      score += cell === 'X' ? value : -value;
    }
  }

  // Два в ряд на малой доске
  score += countTwoInRowOnSmallBoard(cells, 'X') * WEIGHTS.twoInRowLocal;
  score -= countTwoInRowOnSmallBoard(cells, 'O') * WEIGHTS.twoInRowLocal;

  return score;
}

/**
 * Подсчитывает количество линий с двумя фигурами игрока на малой доске.
 */
function countTwoInRowOnSmallBoard(cells: CellState[][], player: Player): number {
  let count = 0;

  for (const line of LINES) {
    let playerCount = 0;
    let emptyCount = 0;

    for (const [row, col] of line) {
      const cell = cells[row][col];
      if (cell === player) {
        playerCount++;
      } else if (cell === null) {
        emptyCount++;
      }
    }

    if (playerCount === 2 && emptyCount === 1) {
      count++;
    }
  }

  return count;
}

/**
 * Оценивает позиционные факторы: мобильность и т.д.
 */
function evaluatePositionalFactors(state: GameState): number {
  let score = 0;

  // Мобильность: количество доступных досок для хода
  if (state.activeBoard === null) {
    // Свободный выбор — это хорошо для текущего игрока
    const bonus = WEIGHTS.mobility * 3;
    score += state.currentPlayer === 'X' ? bonus : -bonus;
  }

  return score;
}


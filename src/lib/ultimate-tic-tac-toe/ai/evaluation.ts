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
  wonBoard: 1000,             // Выигранная малая доска
  twoInRowGlobal: 300,        // Два в ряд на глобальной доске
  twoInRowLocal: 30,          // Два в ряд на малой доске
  blockTwoInRowGlobal: 250,   // Блокировка угрозы на глобальной доске
  blockTwoInRowLocal: 25,     // Блокировка угрозы на малой доске
  centerBoard: 150,           // Бонус за центральную доску (1,1)
  cornerBoard: 50,            // Бонус за угловую доску
  centerCell: 10,             // Центральная клетка малой доски
  cornerCell: 5,              // Угловая клетка малой доски
  mobility: 3,                // Бонус за количество доступных ходов
  sendToWonBoard: 120,        // Бонус если отправляем противника на недоступную доску
  sendToGoodBoard: 40,        // Бонус если отправляем на доску, где мы лидируем
  controlBoard: 15,           // Бонус за контроль доски (больше фигур)
};

// Позиционные множители для досок (центр важнее углов, углы важнее рёбер)
const BOARD_POSITION_MULTIPLIER: readonly number[] = [
  1.2, 1.0, 1.2,
  1.0, 1.5, 1.0,
  1.2, 1.0, 1.2,
];

// Все линии для проверки 3 в ряд - оптимизированная структура
// Каждая линия: [r1, c1, r2, c2, r3, c3]
const LINES: readonly number[][] = [
  // Горизонтали
  [0, 0, 0, 1, 0, 2],
  [1, 0, 1, 1, 1, 2],
  [2, 0, 2, 1, 2, 2],
  // Вертикали
  [0, 0, 1, 0, 2, 0],
  [0, 1, 1, 1, 2, 1],
  [0, 2, 1, 2, 2, 2],
  // Диагонали
  [0, 0, 1, 1, 2, 2],
  [0, 2, 1, 1, 2, 0],
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

  // 4. Оценка куда мы "отправляем" противника
  score += evaluateSendingOpponent(state);

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
        const multiplier = BOARD_POSITION_MULTIPLIER[row * 3 + col];
        const value = WEIGHTS.wonBoard * multiplier;
        score += status.winner === 'X' ? value : -value;
      }
    }
  }

  // Проверка "два в ряд" на глобальной доске (угрозы)
  score += countTwoInRowOnGlobalBoard(globalBoard, 'X') * WEIGHTS.twoInRowGlobal;
  score -= countTwoInRowOnGlobalBoard(globalBoard, 'O') * WEIGHTS.twoInRowGlobal;

  // Блокировка угроз противника
  score += countBlockedThreatsOnGlobalBoard(globalBoard, 'X') * WEIGHTS.blockTwoInRowGlobal;
  score -= countBlockedThreatsOnGlobalBoard(globalBoard, 'O') * WEIGHTS.blockTwoInRowGlobal;

  return score;
}

/**
 * Подсчитывает количество линий с двумя фигурами игрока и одной свободной клеткой.
 */
function countTwoInRowOnGlobalBoard(globalBoard: SmallBoardStatus[][], player: Player): number {
  let count = 0;

  for (let i = 0; i < LINES.length; i++) {
    const line = LINES[i];
    let playerCount = 0;
    let emptyCount = 0;

    // line format: [r1, c1, r2, c2, r3, c3]
    for (let j = 0; j < 6; j += 2) {
      const status = globalBoard[line[j]][line[j + 1]];
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
 * Подсчитывает заблокированные угрозы противника на глобальной доске.
 * Это линии где противник имел два в ряд, но третья позиция занята нами.
 */
function countBlockedThreatsOnGlobalBoard(globalBoard: SmallBoardStatus[][], player: Player): number {
  const opponent: Player = player === 'X' ? 'O' : 'X';
  let count = 0;

  for (let i = 0; i < LINES.length; i++) {
    const line = LINES[i];
    let opponentCount = 0;
    let playerCount = 0;

    for (let j = 0; j < 6; j += 2) {
      const status = globalBoard[line[j]][line[j + 1]];
      if (status.type === 'won') {
        if (status.winner === opponent) opponentCount++;
        else if (status.winner === player) playerCount++;
      }
    }

    // Противник имел 2, но мы заблокировали третью позицию
    if (opponentCount === 2 && playerCount === 1) {
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
      const positionMultiplier = BOARD_POSITION_MULTIPLIER[boardRow * 3 + boardCol];

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
  let xCount = 0;
  let oCount = 0;

  // Оценка отдельных клеток
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const cell = cells[row][col];
      if (cell === null) continue;

      if (cell === 'X') xCount++;
      else oCount++;

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

  // Контроль доски (кто имеет больше фигур)
  if (xCount > oCount) {
    score += WEIGHTS.controlBoard * (xCount - oCount);
  } else if (oCount > xCount) {
    score -= WEIGHTS.controlBoard * (oCount - xCount);
  }

  // Два в ряд на малой доске
  score += countTwoInRowOnSmallBoard(cells, 'X') * WEIGHTS.twoInRowLocal;
  score -= countTwoInRowOnSmallBoard(cells, 'O') * WEIGHTS.twoInRowLocal;

  // Блокировка угроз на малой доске
  score += countBlockedThreatsOnSmallBoard(cells, 'X') * WEIGHTS.blockTwoInRowLocal;
  score -= countBlockedThreatsOnSmallBoard(cells, 'O') * WEIGHTS.blockTwoInRowLocal;

  return score;
}

/**
 * Подсчитывает количество линий с двумя фигурами игрока на малой доске.
 */
function countTwoInRowOnSmallBoard(cells: CellState[][], player: Player): number {
  let count = 0;

  for (let i = 0; i < LINES.length; i++) {
    const line = LINES[i];
    let playerCount = 0;
    let emptyCount = 0;

    for (let j = 0; j < 6; j += 2) {
      const cell = cells[line[j]][line[j + 1]];
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
 * Подсчитывает заблокированные угрозы противника на малой доске.
 */
function countBlockedThreatsOnSmallBoard(cells: CellState[][], player: Player): number {
  const opponent: Player = player === 'X' ? 'O' : 'X';
  let count = 0;

  for (let i = 0; i < LINES.length; i++) {
    const line = LINES[i];
    let opponentCount = 0;
    let playerCount = 0;

    for (let j = 0; j < 6; j += 2) {
      const cell = cells[line[j]][line[j + 1]];
      if (cell === opponent) opponentCount++;
      else if (cell === player) playerCount++;
    }

    // Противник имел 2, но мы заблокировали
    if (opponentCount === 2 && playerCount === 1) {
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

/**
 * Оценивает куда мы "отправляем" противника (на какую доску он должен ходить).
 * Хорошо: отправить на уже выигранную/заполненную доску (даёт свободный выбор)
 * Хорошо: отправить на доску, где мы лидируем
 */
function evaluateSendingOpponent(state: GameState): number {
  // Если у нас свободный выбор — этот бонус не применяется
  // (оценка для предыдущего хода, который привёл к этой ситуации)
  if (state.activeBoard === null) {
    return 0;
  }

  const targetBoard = state.activeBoard;
  const targetStatus = state.globalBoard[targetBoard.row][targetBoard.col];
  const currentPlayer = state.currentPlayer;

  // Если противник отправлен на закрытую доску — это было бы хорошо,
  // но тогда activeBoard был бы null. Если activeBoard не null,
  // значит доска открыта.

  // Оценка позиции на целевой доске
  if (targetStatus.type === 'playing') {
    const cells = state.boards[targetBoard.row][targetBoard.col];
    const { xCount, oCount, xThreats, oThreats } = analyzeBoard(cells);

    // Если текущий игрок (кто ДОЛЖЕН ходить) имеет меньше контроля
    // значит предыдущий игрок хорошо отправил его
    let sendBonus = 0;

    if (currentPlayer === 'X') {
      // X должен ходить, O отправил. Хорошо для O если X слабый на этой доске
      if (oCount > xCount) {
        sendBonus = -WEIGHTS.sendToGoodBoard * (oCount - xCount);
      }
      if (oThreats > 0 && xThreats === 0) {
        sendBonus -= WEIGHTS.sendToGoodBoard; // O имеет угрозу, X нет
      }
    } else {
      // O должен ходить, X отправил. Хорошо для X если O слабый на этой доске
      if (xCount > oCount) {
        sendBonus = WEIGHTS.sendToGoodBoard * (xCount - oCount);
      }
      if (xThreats > 0 && oThreats === 0) {
        sendBonus += WEIGHTS.sendToGoodBoard; // X имеет угрозу, O нет
      }
    }

    return sendBonus;
  }

  return 0;
}

/**
 * Анализирует малую доску и возвращает статистику.
 */
function analyzeBoard(cells: CellState[][]): {
  xCount: number;
  oCount: number;
  xThreats: number;
  oThreats: number;
} {
  let xCount = 0;
  let oCount = 0;

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const cell = cells[row][col];
      if (cell === 'X') xCount++;
      else if (cell === 'O') oCount++;
    }
  }

  const xThreats = countTwoInRowOnSmallBoard(cells, 'X');
  const oThreats = countTwoInRowOnSmallBoard(cells, 'O');

  return { xCount, oCount, xThreats, oThreats };
}

/**
 * Position evaluation heuristics for Ultimate Tic-Tac-Toe.
 * Positive score = X is winning, Negative score = O is winning.
 */

import { GameState, Player, SmallBoardStatus, CellState } from '../types';

// Константы для терминальных состояний
export const SCORE_WIN = 100000;
export const SCORE_LOSS = -100000;
export const SCORE_DRAW = 0;

// Веса для эвристики (улучшенные)
const WEIGHTS = {
  wonBoard: 1200,             // Выигранная малая доска (увеличен)
  twoInRowGlobal: 450,        // Два в ряд на глобальной доске (КРИТИЧНО - увеличен)
  forkGlobal: 800,            // Двойная угроза на глобальной доске (НОВОЕ - очень важно!)
  twoInRowLocal: 35,          // Два в ряд на малой доске
  forkLocal: 70,              // Двойная угроза на малой доске (НОВОЕ)
  blockTwoInRowGlobal: 400,   // Блокировка угрозы на глобальной доске (увеличен)
  blockTwoInRowLocal: 30,     // Блокировка угрозы на малой доске
  centerBoard: 200,           // Бонус за центральную доску (1,1) - увеличен
  cornerBoard: 80,            // Бонус за угловую доску (увеличен)
  centerCell: 15,             // Центральная клетка малой доски
  cornerCell: 8,              // Угловая клетка малой доски
  mobility: 5,                // Бонус за количество доступных ходов
  sendToWonBoard: 180,        // Бонус если отправляем противника на недоступную доску (увеличен)
  sendToGoodBoard: 60,        // Бонус если отправляем на доску, где мы лидируем
  sendToBadBoard: 100,        // Штраф если отправляем на доску где у противника угроза (НОВОЕ)
  controlBoard: 20,           // Бонус за контроль доски (больше фигур)
  boardPotential: 25,         // Бонус за потенциал доски (количество открытых линий) (НОВОЕ)
  tempo: 50,                  // Бонус за темпо (инициативу в игре) (НОВОЕ)
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
  const xThreats = countTwoInRowOnGlobalBoard(globalBoard, 'X');
  const oThreats = countTwoInRowOnGlobalBoard(globalBoard, 'O');
  score += xThreats * WEIGHTS.twoInRowGlobal;
  score -= oThreats * WEIGHTS.twoInRowGlobal;

  // КРИТИЧНО: Двойные угрозы (forks) - если >= 2 угрозы, противник не может заблокировать обе!
  if (xThreats >= 2) {
    score += WEIGHTS.forkGlobal * (xThreats - 1); // Каждая дополнительная угроза увеличивает форк
  }
  if (oThreats >= 2) {
    score -= WEIGHTS.forkGlobal * (oThreats - 1);
  }

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
        value = 3;
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
  const xThreats = countTwoInRowOnSmallBoard(cells, 'X');
  const oThreats = countTwoInRowOnSmallBoard(cells, 'O');
  score += xThreats * WEIGHTS.twoInRowLocal;
  score -= oThreats * WEIGHTS.twoInRowLocal;

  // Fork detection на малой доске (важно для выигрыша доски)
  if (xThreats >= 2) {
    score += WEIGHTS.forkLocal * (xThreats - 1);
  }
  if (oThreats >= 2) {
    score -= WEIGHTS.forkLocal * (oThreats - 1);
  }

  // Блокировка угроз на малой доске
  score += countBlockedThreatsOnSmallBoard(cells, 'X') * WEIGHTS.blockTwoInRowLocal;
  score -= countBlockedThreatsOnSmallBoard(cells, 'O') * WEIGHTS.blockTwoInRowLocal;

  // Потенциал доски: сколько линий ещё открыто для каждого игрока
  const xPotential = countOpenLinesForPlayer(cells, 'X');
  const oPotential = countOpenLinesForPlayer(cells, 'O');
  score += (xPotential - oPotential) * WEIGHTS.boardPotential;

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
 * Подсчитывает количество "открытых" линий для игрока на малой доске.
 * Открытая линия - линия без фигур противника (потенциально можно выиграть).
 */
function countOpenLinesForPlayer(cells: CellState[][], player: Player): number {
  const opponent: Player = player === 'X' ? 'O' : 'X';
  let count = 0;

  for (let i = 0; i < LINES.length; i++) {
    const line = LINES[i];
    let hasOpponent = false;

    for (let j = 0; j < 6; j += 2) {
      const cell = cells[line[j]][line[j + 1]];
      if (cell === opponent) {
        hasOpponent = true;
        break;
      }
    }

    if (!hasOpponent) {
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
 * ПЛОХО: отправить противника на доску где у него угроза или контроль!
 */
function evaluateSendingOpponent(state: GameState): number {
  // Если у нас свободный выбор — этот бонус не применяется
  // (оценка для предыдущего хода, который привёл к этой ситуации)
  if (state.activeBoard === null) {
    // Свободный выбор для текущего игрока - это хорошо для него!
    return state.currentPlayer === 'X' ? WEIGHTS.sendToWonBoard : -WEIGHTS.sendToWonBoard;
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
    const { xCount, oCount, xThreats, oThreats, xPotential, oPotential } = analyzeBoard(cells);

    // Позиционный множитель целевой доски (центр важнее)
    const boardMultiplier = BOARD_POSITION_MULTIPLIER[targetBoard.row * 3 + targetBoard.col];

    let sendBonus = 0;

    if (currentPlayer === 'X') {
      // X должен ходить, O отправил.
      // Хорошо для O (плохо для X) если:
      // - O лидирует по фигурам на этой доске
      // - O имеет угрозу на этой доске (X вынужден защищаться)
      // - У X мало потенциала

      if (oCount > xCount) {
        sendBonus -= WEIGHTS.sendToGoodBoard * (oCount - xCount) * boardMultiplier;
      } else if (xCount > oCount) {
        // Плохо для O - отправил X на доску где X лидирует
        sendBonus += WEIGHTS.sendToGoodBoard * (xCount - oCount) * boardMultiplier * 0.5;
      }

      // КРИТИЧНО: Если O имеет угрозу, X вынужден защищаться!
      if (oThreats > 0) {
        sendBonus -= WEIGHTS.sendToBadBoard * oThreats * boardMultiplier;
      }
      // Если X имеет угрозу - хорошо для X (плохой ход O)
      if (xThreats > 0) {
        sendBonus += WEIGHTS.sendToBadBoard * xThreats * boardMultiplier * 0.8;
      }

      // Потенциал доски
      sendBonus += (xPotential - oPotential) * 5;

    } else {
      // O должен ходить, X отправил.
      // Зеркальная логика

      if (xCount > oCount) {
        sendBonus += WEIGHTS.sendToGoodBoard * (xCount - oCount) * boardMultiplier;
      } else if (oCount > xCount) {
        sendBonus -= WEIGHTS.sendToGoodBoard * (oCount - xCount) * boardMultiplier * 0.5;
      }

      // КРИТИЧНО: Если X имеет угрозу, O вынужден защищаться!
      if (xThreats > 0) {
        sendBonus += WEIGHTS.sendToBadBoard * xThreats * boardMultiplier;
      }
      // Если O имеет угрозу - хорошо для O (плохой ход X)
      if (oThreats > 0) {
        sendBonus -= WEIGHTS.sendToBadBoard * oThreats * boardMultiplier * 0.8;
      }

      // Потенциал доски
      sendBonus -= (oPotential - xPotential) * 5;
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
  xPotential: number;
  oPotential: number;
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
  const xPotential = countOpenLinesForPlayer(cells, 'X');
  const oPotential = countOpenLinesForPlayer(cells, 'O');

  return { xCount, oCount, xThreats, oThreats, xPotential, oPotential };
}

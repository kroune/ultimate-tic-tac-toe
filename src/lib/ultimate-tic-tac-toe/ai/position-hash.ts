/**
 * Position hashing for transposition table.
 * Uses Zobrist hashing for efficient incremental updates.
 */

import { GameState } from '../types';

// Zobrist таблица: случайные числа для каждой комбинации (позиция, фигура)
// 81 клетка × 2 фигуры (X, O) + 9 активных досок + 1 для null activeBoard + 2 игрока
const ZOBRIST_TABLE: bigint[] = [];
const BOARD_SIZE = 81;
const CELL_OFFSET_X = 0;
const CELL_OFFSET_O = BOARD_SIZE;
const ACTIVE_BOARD_OFFSET = BOARD_SIZE * 2;  // 9 позиций + 1 для null
const PLAYER_OFFSET = ACTIVE_BOARD_OFFSET + 10;

// Инициализация Zobrist таблицы с детерминированными "случайными" числами
// Используем xorshift128+ для лучшего качества случайных чисел
function initZobristTable(): void {
  if (ZOBRIST_TABLE.length > 0) return; // Уже инициализирована

  // xorshift128+ PRNG - хорошее качество для Zobrist хэширования
  // Состояние: два 64-битных числа
  let s0 = BigInt('0x12345678DEADBEEF');
  let s1 = BigInt('0xCAFEBABE87654321');

  const MASK_64 = (BigInt(1) << BigInt(64)) - BigInt(1);

  function next(): bigint {
    let x = s0;
    const y = s1;
    s0 = y;
    // xorshift128+ step
    x ^= (x << BigInt(23)) & MASK_64;
    x ^= x >> BigInt(17);
    x ^= y ^ (y >> BigInt(26));
    s1 = x;
    return (x + y) & MASK_64;
  }

  const totalEntries = PLAYER_OFFSET + 2;

  for (let i = 0; i < totalEntries; i++) {
    ZOBRIST_TABLE.push(next());
  }
}

// Инициализируем при загрузке модуля
initZobristTable();

/**
 * Вычисляет полный Zobrist хэш для игрового состояния.
 * Используется для начальной позиции, далее можно обновлять инкрементально.
 */
export function computeZobristHash(state: GameState): bigint {
  let hash = BigInt(0);

  // Хэш всех клеток
  for (let boardRow = 0; boardRow < 3; boardRow++) {
    for (let boardCol = 0; boardCol < 3; boardCol++) {
      for (let cellRow = 0; cellRow < 3; cellRow++) {
        for (let cellCol = 0; cellCol < 3; cellCol++) {
          const cell = state.boards[boardRow][boardCol][cellRow][cellCol];
          if (cell !== null) {
            const position = boardRow * 27 + boardCol * 9 + cellRow * 3 + cellCol;
            const offset = cell === 'X' ? CELL_OFFSET_X : CELL_OFFSET_O;
            hash ^= ZOBRIST_TABLE[offset + position];
          }
        }
      }
    }
  }

  // Хэш активной доски
  if (state.activeBoard) {
    const activeBoardIdx = state.activeBoard.row * 3 + state.activeBoard.col;
    hash ^= ZOBRIST_TABLE[ACTIVE_BOARD_OFFSET + activeBoardIdx];
  } else {
    hash ^= ZOBRIST_TABLE[ACTIVE_BOARD_OFFSET + 9]; // null activeBoard
  }

  // Хэш текущего игрока
  const playerIdx = state.currentPlayer === 'X' ? 0 : 1;
  hash ^= ZOBRIST_TABLE[PLAYER_OFFSET + playerIdx];

  return hash;
}

/**
 * Обновляет хэш после хода (для инкрементального обновления).
 *
 * @param hash - текущий хэш
 * @param boardRow - ряд доски (0-2)
 * @param boardCol - колонка доски (0-2)
 * @param cellRow - ряд клетки (0-2)
 * @param cellCol - колонка клетки (0-2)
 * @param player - игрок, сделавший ход
 * @param oldActiveBoard - предыдущая активная доска (row, col) или null
 * @param newActiveBoard - новая активная доска (row, col) или null
 * @returns обновлённый хэш
 */
export function updateZobristHash(
  hash: bigint,
  boardRow: number,
  boardCol: number,
  cellRow: number,
  cellCol: number,
  player: 'X' | 'O',
  oldActiveBoard: { row: number; col: number } | null,
  newActiveBoard: { row: number; col: number } | null
): bigint {
  // XOR для новой фигуры
  const position = boardRow * 27 + boardCol * 9 + cellRow * 3 + cellCol;
  const offset = player === 'X' ? CELL_OFFSET_X : CELL_OFFSET_O;
  hash ^= ZOBRIST_TABLE[offset + position];

  // XOR для старой активной доски
  if (oldActiveBoard) {
    const oldIdx = oldActiveBoard.row * 3 + oldActiveBoard.col;
    hash ^= ZOBRIST_TABLE[ACTIVE_BOARD_OFFSET + oldIdx];
  } else {
    hash ^= ZOBRIST_TABLE[ACTIVE_BOARD_OFFSET + 9];
  }

  // XOR для новой активной доски
  if (newActiveBoard) {
    const newIdx = newActiveBoard.row * 3 + newActiveBoard.col;
    hash ^= ZOBRIST_TABLE[ACTIVE_BOARD_OFFSET + newIdx];
  } else {
    hash ^= ZOBRIST_TABLE[ACTIVE_BOARD_OFFSET + 9];
  }

  // XOR для смены игрока (X→O или O→X)
  hash ^= ZOBRIST_TABLE[PLAYER_OFFSET]; // XOR обоих игроков = смена игрока
  hash ^= ZOBRIST_TABLE[PLAYER_OFFSET + 1];

  return hash;
}

/**
 * Преобразует bigint хэш в строку для использования в Map.
 * Используем base36 для компактности.
 */
export function hashToString(hash: bigint): string {
  return hash.toString(36);
}

/**
 * Совместимость: вычисляет строковый хэш напрямую из состояния.
 * Это обёртка вокруг Zobrist для существующего API.
 */
export function computePositionHash(state: GameState): string {
  const hash = computeZobristHash(state);
  return hashToString(hash);
}

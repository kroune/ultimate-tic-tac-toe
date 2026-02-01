/**
 * Position hashing for transposition table.
 * Computes a unique hash key for the game state.
 */

import { GameState } from '../types';

/**
 * Вычисляет уникальный хэш-ключ для позиции.
 * Используется как ключ в транспозиционной таблице.
 *
 * Структура:
 * - 81 клетка кодируются в base-3 (0=пусто, 1=X, 2=O)
 * - Группируем по 18 клеток (2 доски) для компактности
 * - Добавляем текущего игрока и активную доску
 */
export function computePositionHash(state: GameState): string {
  const parts: number[] = [];

  // Кодируем 9 малых досок, каждая по 9 клеток
  // Группируем по 2 доски (18 клеток) — 3^18 = 387_420_489 < 2^29
  for (let group = 0; group < 5; group++) {
    let value = 0;
    const startBoard = group * 2;
    const endBoard = Math.min(startBoard + 2, 9);

    for (let boardIdx = startBoard; boardIdx < endBoard; boardIdx++) {
      const boardRow = Math.floor(boardIdx / 3);
      const boardCol = boardIdx % 3;

      for (let cellRow = 0; cellRow < 3; cellRow++) {
        for (let cellCol = 0; cellCol < 3; cellCol++) {
          const cell = state.boards[boardRow][boardCol][cellRow][cellCol];
          const cellValue = cell === null ? 0 : cell === 'X' ? 1 : 2;
          value = value * 3 + cellValue;
        }
      }
    }
    parts.push(value);
  }

  // Метаданные: игрок (0/1) + активная доска (0-9, где 9 = null)
  const playerBit = state.currentPlayer === 'X' ? 0 : 1;
  const activeBoardValue = state.activeBoard
    ? state.activeBoard.row * 3 + state.activeBoard.col
    : 9;

  // Формируем строку — base36 для компактности
  return parts.map(p => p.toString(36)).join('.') + '.' + playerBit + activeBoardValue;
}


import { CellState, Player, GlobalPosition } from './types';

export function checkLine(a: CellState, b: CellState, c: CellState): Player | null {
  if (a !== null && a === b && b === c) {
    return a;
  }
  return null;
}

export function checkWinnerOnGrid(grid: CellState[][]): Player | null {
  for (let row = 0; row < 3; row++) {
    const winner = checkLine(grid[row][0], grid[row][1], grid[row][2]);
    if (winner) return winner;
  }

  for (let col = 0; col < 3; col++) {
    const winner = checkLine(grid[0][col], grid[1][col], grid[2][col]);
    if (winner) return winner;
  }

  const diag1 = checkLine(grid[0][0], grid[1][1], grid[2][2]);
  if (diag1) return diag1;

  const diag2 = checkLine(grid[0][2], grid[1][1], grid[2][0]);
  if (diag2) return diag2;

  return null;
}

export function isValidPosition(row: number, col: number): boolean {
  return row >= 0 && row <= 2 && col >= 0 && col <= 2;
}

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function createEmptyGrid(): CellState[][] {
  return [
    [null, null, null],
    [null, null, null],
    [null, null, null]
  ];
}

/**
 * Encode a move as a single base-81 digit (0-80 mapped to characters)
 * Each move has 4 coordinates (boardRow, boardCol, cellRow, cellCol) each 0-2
 * Total: 3*3*3*3 = 81 possibilities
 * Using URL-safe characters: A-Z (26) + a-z (26) + 0-9 (10) + special (19) = 81
 * Special chars used: -_.~!*,;()[]{}:@#
 */
// 26 uppercase + 26 lowercase + 10 digits = 62
// Need 19 more URL-safe special chars: -_.~!*,;()[]{}:@#$%&
const ENCODING_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.~!*,;()[]{}:@#$%';

export function encodeMoveToChar(move: GlobalPosition): string {
  const index = move.boardRow * 27 + move.boardCol * 9 + move.cellRow * 3 + move.cellCol;
  return ENCODING_ALPHABET[index];
}

export function decodeCharToMove(char: string): GlobalPosition | null {
  const index = ENCODING_ALPHABET.indexOf(char);
  if (index === -1 || index >= 81) return null;

  return {
    boardRow: Math.floor(index / 27),
    boardCol: Math.floor((index % 27) / 9),
    cellRow: Math.floor((index % 9) / 3),
    cellCol: index % 3
  };
}

export function encodeMoves(moves: GlobalPosition[]): string {
  return moves.map(encodeMoveToChar).join('');
}

export function decodeMoves(encoded: string): GlobalPosition[] | null {
  const moves: GlobalPosition[] = [];
  for (const char of encoded) {
    const move = decodeCharToMove(char);
    if (move === null) return null;
    moves.push(move);
  }
  return moves;
}

export function validateEncodedMoves(encoded: string): boolean {
  if (typeof encoded !== 'string') return false;
  if (encoded.length > 81) return false; // Max possible moves
  for (const char of encoded) {
    if (ENCODING_ALPHABET.indexOf(char) === -1 || ENCODING_ALPHABET.indexOf(char) >= 81) {
      return false;
    }
  }
  return true;
}


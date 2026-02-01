import { CellState, Player } from './types';

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


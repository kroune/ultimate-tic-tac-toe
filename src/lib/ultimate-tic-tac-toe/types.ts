/**
 * Ultimate Tic-Tac-Toe Library Types
 */

/** Игрок: X или O */
export type Player = 'X' | 'O';

/** Состояние клетки: игрок или пусто */
export type CellState = Player | null;

/** Позиция на доске 3×3 */
export interface Position {
  row: number;
  col: number;
}

/** Глобальная позиция: координаты малой доски + координаты клетки */
export interface GlobalPosition {
  boardRow: number;
  boardCol: number;
  cellRow: number;
  cellCol: number;
}

/** Статус малой доски */
export type SmallBoardStatus =
  | { type: 'playing' }
  | { type: 'won'; winner: Player }
  | { type: 'draw' };

/** Полное состояние игры */
export interface GameState {
  currentPlayer: Player;
  activeBoard: Position | null;
  globalBoard: SmallBoardStatus[][];
  boards: CellState[][][][];
  isGameOver: boolean;
  winner: Player | null;
}

/** Результат хода */
export type MoveResult =
  | { success: true; newState: GameState }
  | { success: false; error: string };

/** Результат завершённой игры */
export interface GameResult {
  winner: Player | null;
  wonBoardsX: number;
  wonBoardsO: number;
}


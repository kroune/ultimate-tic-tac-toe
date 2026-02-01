export { GameEngine } from './game-engine';
export { SmallBoard } from './small-board';
export { GlobalBoard } from './global-board';
export {
  checkLine,
  checkWinnerOnGrid,
  isValidPosition,
  deepClone,
  createEmptyGrid,
  encodeMoves,
  decodeMoves,
  validateEncodedMoves,
  encodeMoveToChar,
  decodeCharToMove
} from './utils';
export type {
  Player,
  CellState,
  Position,
  GlobalPosition,
  SmallBoardStatus,
  GameState,
  MoveResult,
  GameResult
} from './types';


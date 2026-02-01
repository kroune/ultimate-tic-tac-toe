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

// AI Module exports
export { AIPlayer, evaluatePosition, SCORE_WIN, SCORE_LOSS, SCORE_DRAW } from './ai';
export type { AIConfig, AIMove, SearchStats } from './ai';


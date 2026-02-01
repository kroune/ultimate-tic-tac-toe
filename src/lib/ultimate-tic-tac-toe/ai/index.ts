/**
 * AI Module for Ultimate Tic-Tac-Toe
 *
 * Provides Minimax-based AI player with alpha-beta pruning
 * and transposition table optimization.
 */

export { AIPlayer } from './ai-player';
export type { AIConfig, AIMove, SearchStats } from './types';
export { evaluatePosition, SCORE_WIN, SCORE_LOSS, SCORE_DRAW } from './evaluation';


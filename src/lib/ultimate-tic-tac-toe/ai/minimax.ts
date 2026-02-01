/**
 * Minimax search with alpha-beta pruning and transposition table.
 */

import { GameEngine } from '../game-engine';
import { GlobalPosition } from '../types';
import { AIConfig, TranspositionEntry, BoundType, SearchStats, AIMove } from './types';
import { evaluatePosition } from './evaluation';
import { computePositionHash } from './position-hash';

export class MinimaxSearch {
  private transpositionTable: Map<string, TranspositionEntry>;
  private config: AIConfig;
  private stats: SearchStats;

  constructor(config: AIConfig) {
    this.config = config;
    this.transpositionTable = new Map();
    this.stats = { nodesVisited: 0, cacheHits: 0, cutoffs: 0 };
  }

  /**
   * Находит лучший ход для текущего игрока.
   */
  findBestMove(engine: GameEngine): AIMove | null {
    this.stats = { nodesVisited: 0, cacheHits: 0, cutoffs: 0 };

    const moves = engine.getValidMoves();
    if (moves.length === 0) return null;

    const isMaximizing = engine.getCurrentPlayer() === 'X';
    let bestMove: GlobalPosition | null = null;
    let bestScore = isMaximizing ? -Infinity : Infinity;
    let alpha = -Infinity;
    let beta = Infinity;

    // Сортировка ходов для лучшего отсечения
    const sortedMoves = this.orderMoves(moves, engine);

    for (const move of sortedMoves) {
      // Применяем ход на копии
      const engineCopy = engine.clone();
      engineCopy.makeMove(move.boardRow, move.boardCol, move.cellRow, move.cellCol);

      const score = this.minimax(
        engineCopy,
        this.config.maxDepth - 1,
        alpha,
        beta,
        !isMaximizing
      );

      if (isMaximizing) {
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
        alpha = Math.max(alpha, score);
      } else {
        if (score < bestScore) {
          bestScore = score;
          bestMove = move;
        }
        beta = Math.min(beta, score);
      }
    }

    return bestMove ? { move: bestMove, score: bestScore } : null;
  }

  private minimax(
    engine: GameEngine,
    depth: number,
    alpha: number,
    beta: number,
    isMaximizing: boolean
  ): number {
    this.stats.nodesVisited++;

    // Терминальное условие
    if (depth === 0 || engine.isGameOver()) {
      return evaluatePosition(engine.getGameState(), depth);
    }

    // Проверка транспозиционной таблицы
    const hash = this.config.useTranspositionTable
      ? computePositionHash(engine.getGameState())
      : null;

    if (hash) {
      const entry = this.transpositionTable.get(hash);
      if (entry && entry.depth >= depth) {
        this.stats.cacheHits++;
        if (entry.boundType === 'exact') return entry.score;
        if (entry.boundType === 'lower') alpha = Math.max(alpha, entry.score);
        if (entry.boundType === 'upper') beta = Math.min(beta, entry.score);
        if (alpha >= beta) return entry.score;
      }
    }

    const moves = engine.getValidMoves();

    // Нет ходов — терминальное состояние
    if (moves.length === 0) {
      return evaluatePosition(engine.getGameState(), depth);
    }

    const sortedMoves = this.orderMoves(moves, engine);

    let bestScore: number;
    let bestMove: GlobalPosition | null = null;
    let boundType: BoundType = 'exact';

    if (isMaximizing) {
      bestScore = -Infinity;
      for (const move of sortedMoves) {
        const engineCopy = engine.clone();
        engineCopy.makeMove(move.boardRow, move.boardCol, move.cellRow, move.cellCol);

        const score = this.minimax(engineCopy, depth - 1, alpha, beta, false);

        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
        alpha = Math.max(alpha, score);
        if (beta <= alpha) {
          this.stats.cutoffs++;
          boundType = 'lower';
          break;
        }
      }
    } else {
      bestScore = Infinity;
      for (const move of sortedMoves) {
        const engineCopy = engine.clone();
        engineCopy.makeMove(move.boardRow, move.boardCol, move.cellRow, move.cellCol);

        const score = this.minimax(engineCopy, depth - 1, alpha, beta, true);

        if (score < bestScore) {
          bestScore = score;
          bestMove = move;
        }
        beta = Math.min(beta, score);
        if (beta <= alpha) {
          this.stats.cutoffs++;
          boundType = 'upper';
          break;
        }
      }
    }

    // Сохраняем в транспозиционную таблицу
    if (hash) {
      this.storeInTable(hash, { score: bestScore, depth, boundType, bestMove });
    }

    return bestScore;
  }

  /**
   * Сортировка ходов для улучшения alpha-beta отсечения.
   * Приоритет: ход из кэша, центральные клетки, угловые клетки.
   */
  private orderMoves(moves: GlobalPosition[], engine: GameEngine): GlobalPosition[] {
    // Проверяем есть ли bestMove в транспозиционной таблице
    let ttBestMove: GlobalPosition | null = null;
    if (this.config.useTranspositionTable) {
      const hash = computePositionHash(engine.getGameState());
      const entry = this.transpositionTable.get(hash);
      if (entry?.bestMove) {
        ttBestMove = entry.bestMove;
      }
    }

    return moves.slice().sort((a, b) => {
      // Ход из транспозиционной таблицы — максимальный приоритет
      const aIsTTMove = ttBestMove &&
        a.boardRow === ttBestMove.boardRow && a.boardCol === ttBestMove.boardCol &&
        a.cellRow === ttBestMove.cellRow && a.cellCol === ttBestMove.cellCol;
      const bIsTTMove = ttBestMove &&
        b.boardRow === ttBestMove.boardRow && b.boardCol === ttBestMove.boardCol &&
        b.cellRow === ttBestMove.cellRow && b.cellCol === ttBestMove.cellCol;

      if (aIsTTMove && !bIsTTMove) return -1;
      if (bIsTTMove && !aIsTTMove) return 1;

      // Приоритет центральным клеткам
      const aCenter = (a.cellRow === 1 && a.cellCol === 1) ? 2 : 0;
      const bCenter = (b.cellRow === 1 && b.cellCol === 1) ? 2 : 0;

      // Приоритет центральной доске
      const aBoardCenter = (a.boardRow === 1 && a.boardCol === 1) ? 1 : 0;
      const bBoardCenter = (b.boardRow === 1 && b.boardCol === 1) ? 1 : 0;

      return (bCenter + bBoardCenter) - (aCenter + aBoardCenter);
    });
  }

  private storeInTable(hash: string, entry: TranspositionEntry): void {
    // LRU-подобное поведение: удаляем старые записи при переполнении
    const maxSize = this.config.maxTableSize || 100000;
    if (this.transpositionTable.size >= maxSize) {
      // Удаляем первую запись (приблизительный LRU)
      const firstKey = this.transpositionTable.keys().next().value;
      if (firstKey !== undefined) {
        this.transpositionTable.delete(firstKey);
      }
    }
    this.transpositionTable.set(hash, entry);
  }

  getStats(): SearchStats {
    return { ...this.stats };
  }

  clearTable(): void {
    this.transpositionTable.clear();
  }
}


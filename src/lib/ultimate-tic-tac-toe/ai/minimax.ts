/**
 * Minimax search with alpha-beta pruning, iterative deepening,
 * transposition table, and advanced move ordering.
 */

import { GameEngine } from '../game-engine';
import { GlobalPosition, Player } from '../types';
import { AIConfig, TranspositionEntry, BoundType, SearchStats, AIMove } from './types';
import { evaluatePosition } from './evaluation';
import { computePositionHash } from './position-hash';


export class MinimaxSearch {
  private transpositionTable: Map<string, TranspositionEntry>;
  private config: AIConfig;
  private stats: SearchStats;

  // Killer moves: killerMoves[depth][0..1] = ходы, вызвавшие cutoff на этой глубине
  private killerMoves: (GlobalPosition | null)[][];

  // History heuristic: historyTable[boardRow*27 + boardCol*9 + cellRow*3 + cellCol][player] = score
  private historyTable: Map<string, number>;

  constructor(config: AIConfig) {
    this.config = config;
    this.transpositionTable = new Map();
    this.stats = { nodesVisited: 0, cacheHits: 0, cutoffs: 0, maxPlyReached: 0 };
    this.killerMoves = [];
    this.historyTable = new Map();
    this.initKillerMoves();
  }

  private initKillerMoves(): void {
    this.killerMoves = [];
    for (let i = 0; i <= this.config.maxDepth + 1; i++) {
      this.killerMoves.push([null, null]);
    }
  }

  /**
   * Находит лучший ход для текущего игрока с использованием Iterative Deepening.
   */
  findBestMove(engine: GameEngine): AIMove | null {
    this.stats = { nodesVisited: 0, cacheHits: 0, cutoffs: 0, maxPlyReached: 0 };
    this.initKillerMoves();

    const moves = engine.getValidMoves();
    if (moves.length === 0) return null;

    // Единственный ход - не тратим время на поиск
    if (moves.length === 1) {
      return { move: moves[0], score: 0 };
    }

    const isMaximizing = engine.getCurrentPlayer() === 'X';
    let bestResult: AIMove | null = null;

    // Iterative Deepening: начинаем с глубины 1 и увеличиваем
    // Примечание: TT очищается между итерациями для корректности оценок.
    // ID всё ещё полезен для move ordering (bestResult.move используется для сортировки).
    for (let depth = 1; depth <= this.config.maxDepth; depth++) {
      this.transpositionTable.clear();

      const result = this.searchAtDepth(engine, depth, isMaximizing, bestResult?.move);
      if (result) {
        bestResult = result;
      }
    }

    return bestResult;
  }

  /**
   * Поиск на заданной глубине.
   */
  private searchAtDepth(
    engine: GameEngine,
    depth: number,
    isMaximizing: boolean,
    previousBestMove: GlobalPosition | null | undefined
  ): AIMove | null {
    const moves = engine.getValidMoves();
    if (moves.length === 0) return null;

    let bestMove: GlobalPosition | null = null;
    let bestScore = isMaximizing ? -Infinity : Infinity;
    let alpha = -Infinity;
    let beta = Infinity;

    // Сортировка ходов с учётом лучшего хода из предыдущей итерации
    const sortedMoves = this.orderMoves(moves, engine, depth, previousBestMove);

    for (const move of sortedMoves) {
      const engineCopy = engine.clone();
      engineCopy.makeMove(move.boardRow, move.boardCol, move.cellRow, move.cellCol);

      const score = this.minimax(
        engineCopy,
        depth - 1,
        alpha,
        beta,
        !isMaximizing,
        depth - 1
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
    isMaximizing: boolean,
    ply: number // текущая глубина от корня (для killer moves)
  ): number {
    this.stats.nodesVisited++;

    // Отслеживаем реальную глубину поиска
    if (ply > this.stats.maxPlyReached) {
      this.stats.maxPlyReached = ply;
    }

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

    // Получаем лучший ход из TT для сортировки
    let ttBestMove: GlobalPosition | null = null;
    if (hash) {
      const entry = this.transpositionTable.get(hash);
      ttBestMove = entry?.bestMove ?? null;
    }

    const sortedMoves = this.orderMoves(moves, engine, ply, ttBestMove);

    let bestScore: number;
    let bestMove: GlobalPosition | null = null;
    let boundType: BoundType = 'exact';

    if (isMaximizing) {
      bestScore = -Infinity;
      for (const move of sortedMoves) {
        const engineCopy = engine.clone();
        engineCopy.makeMove(move.boardRow, move.boardCol, move.cellRow, move.cellCol);

        const score = this.minimax(engineCopy, depth - 1, alpha, beta, false, ply + 1);

        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
        alpha = Math.max(alpha, score);
        if (beta <= alpha) {
          this.stats.cutoffs++;
          boundType = 'lower';
          // Сохраняем killer move
          this.addKillerMove(ply, move);
          // Обновляем history heuristic
          this.updateHistory(move, depth, 'X');
          break;
        }
      }
    } else {
      bestScore = Infinity;
      for (const move of sortedMoves) {
        const engineCopy = engine.clone();
        engineCopy.makeMove(move.boardRow, move.boardCol, move.cellRow, move.cellCol);

        const score = this.minimax(engineCopy, depth - 1, alpha, beta, true, ply + 1);

        if (score < bestScore) {
          bestScore = score;
          bestMove = move;
        }
        beta = Math.min(beta, score);
        if (beta <= alpha) {
          this.stats.cutoffs++;
          boundType = 'upper';
          // Сохраняем killer move
          this.addKillerMove(ply, move);
          // Обновляем history heuristic
          this.updateHistory(move, depth, 'O');
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
   * Добавляет ход в killer moves для данной глубины.
   */
  private addKillerMove(ply: number, move: GlobalPosition): void {
    if (ply >= this.killerMoves.length) return;

    const killers = this.killerMoves[ply];
    // Не добавляем дубликат
    if (killers[0] && this.movesEqual(killers[0], move)) return;

    // Сдвигаем: killer[1] = killer[0], killer[0] = move
    killers[1] = killers[0];
    killers[0] = move;
  }

  /**
   * Обновляет history heuristic для хода.
   */
  private updateHistory(move: GlobalPosition, depth: number, player: Player): void {
    const key = `${move.boardRow},${move.boardCol},${move.cellRow},${move.cellCol},${player}`;
    const current = this.historyTable.get(key) || 0;
    // Бонус растёт с глубиной (глубокие cutoffs важнее)
    this.historyTable.set(key, current + depth * depth);
  }

  /**
   * Получает history score для хода.
   */
  private getHistoryScore(move: GlobalPosition, player: Player): number {
    const key = `${move.boardRow},${move.boardCol},${move.cellRow},${move.cellCol},${player}`;
    return this.historyTable.get(key) || 0;
  }

  /**
   * Проверяет равенство двух ходов.
   */
  private movesEqual(a: GlobalPosition, b: GlobalPosition): boolean {
    return a.boardRow === b.boardRow && a.boardCol === b.boardCol &&
           a.cellRow === b.cellRow && a.cellCol === b.cellCol;
  }

  /**
   * Сортировка ходов для улучшения alpha-beta отсечения.
   * Приоритет:
   * 1. Лучший ход из предыдущей итерации / TT
   * 2. Killer moves
   * 3. History heuristic
   * 4. Центральные клетки/доски
   */
  private orderMoves(
    moves: GlobalPosition[],
    engine: GameEngine,
    ply: number,
    bestMoveHint: GlobalPosition | null | undefined
  ): GlobalPosition[] {
    const currentPlayer = engine.getCurrentPlayer();

    // Killer moves для текущей глубины
    const killers = ply < this.killerMoves.length ? this.killerMoves[ply] : [null, null];

    return moves.slice().sort((a, b) => {
      // 1. Лучший ход из TT/предыдущей итерации — максимальный приоритет
      if (bestMoveHint) {
        const aIsBest = this.movesEqual(a, bestMoveHint);
        const bIsBest = this.movesEqual(b, bestMoveHint);
        if (aIsBest && !bIsBest) return -1;
        if (bIsBest && !aIsBest) return 1;
      }

      // 2. Killer moves
      const aIsKiller = killers[0] && this.movesEqual(a, killers[0]) ? 2 :
                        killers[1] && this.movesEqual(a, killers[1]) ? 1 : 0;
      const bIsKiller = killers[0] && this.movesEqual(b, killers[0]) ? 2 :
                        killers[1] && this.movesEqual(b, killers[1]) ? 1 : 0;
      if (aIsKiller !== bIsKiller) return bIsKiller - aIsKiller;

      // 3. History heuristic
      const aHistory = this.getHistoryScore(a, currentPlayer);
      const bHistory = this.getHistoryScore(b, currentPlayer);
      if (aHistory !== bHistory) return bHistory - aHistory;

      // 4. Позиционные эвристики
      // Центральные клетки
      const aCenter = (a.cellRow === 1 && a.cellCol === 1) ? 2 : 0;
      const bCenter = (b.cellRow === 1 && b.cellCol === 1) ? 2 : 0;

      // Центральная доска
      const aBoardCenter = (a.boardRow === 1 && a.boardCol === 1) ? 1 : 0;
      const bBoardCenter = (b.boardRow === 1 && b.boardCol === 1) ? 1 : 0;

      return (bCenter + bBoardCenter) - (aCenter + aBoardCenter);
    });
  }

  private storeInTable(hash: string, entry: TranspositionEntry): void {
    const maxSize = this.config.maxTableSize || 100000;

    // Улучшенная политика замены: всегда заменяем если новая глубина >= старой
    const existingEntry = this.transpositionTable.get(hash);
    if (existingEntry && existingEntry.depth > entry.depth) {
      // Не заменяем более глубокую запись менее глубокой
      return;
    }

    // LRU-подобное поведение при переполнении
    if (this.transpositionTable.size >= maxSize && !existingEntry) {
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
    this.historyTable.clear();
    this.initKillerMoves();
  }
}


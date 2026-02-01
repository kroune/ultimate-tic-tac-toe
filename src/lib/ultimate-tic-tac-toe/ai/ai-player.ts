/**
 * Main AI Player class for Ultimate Tic-Tac-Toe.
 * Provides simple API for getting best moves using Minimax search.
 */

import { GameEngine } from '../game-engine';
import { AIConfig, AIMove, SearchStats } from './types';
import { MinimaxSearch } from './minimax';
import { evaluatePosition } from './evaluation';

const DEFAULT_CONFIG: AIConfig = {
  maxDepth: 4,
  useTranspositionTable: true,
  maxTableSize: 100000,
};

export class AIPlayer {
  private search: MinimaxSearch;
  private config: AIConfig;

  constructor(config: Partial<AIConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.search = new MinimaxSearch(this.config);
  }

  /**
   * Находит лучший ход для текущего игрока.
   * @returns Лучший ход и его оценка, или null если ходов нет.
   */
  getBestMove(engine: GameEngine): AIMove | null {
    if (engine.isGameOver()) return null;
    return this.search.findBestMove(engine);
  }

  /**
   * Оценивает текущую позицию.
   * Положительное значение — X лидирует, отрицательное — O.
   */
  evaluateCurrentPosition(engine: GameEngine): number {
    return evaluatePosition(engine.getGameState());
  }

  /**
   * Устанавливает глубину поиска.
   * Можно использовать для изменения уровня сложности.
   */
  setMaxDepth(depth: number): void {
    this.config.maxDepth = Math.max(1, depth);
    this.search = new MinimaxSearch(this.config);
  }

  /**
   * Возвращает текущую глубину поиска.
   */
  getMaxDepth(): number {
    return this.config.maxDepth;
  }

  /**
   * Очищает транспозиционную таблицу.
   * Рекомендуется вызывать при начале новой игры.
   */
  clearCache(): void {
    this.search.clearTable();
  }

  /**
   * Возвращает статистику последнего поиска.
   * Полезно для отладки и тестирования.
   */
  getLastSearchStats(): SearchStats {
    return this.search.getStats();
  }
}


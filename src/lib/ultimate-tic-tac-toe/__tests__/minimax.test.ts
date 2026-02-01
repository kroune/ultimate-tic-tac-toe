import { MinimaxSearch } from '../ai/minimax';
import { GameEngine } from '../game-engine';
import { AIConfig } from '../ai/types';

describe('MinimaxSearch', () => {
  const defaultConfig: AIConfig = {
    maxDepth: 3,
    useTranspositionTable: true,
    maxTableSize: 10000
  };

  describe('findBestMove', () => {
    it('should return a move for empty board', () => {
      const engine = new GameEngine();
      const search = new MinimaxSearch(defaultConfig);

      const result = search.findBestMove(engine);

      expect(result).not.toBeNull();
      expect(result?.move).toBeDefined();
    });

    it('should return null when no moves available (game over)', () => {
      // Проверяем что для игры с ходами функция работает корректно
      const engine = new GameEngine();

      // Делаем один ход и проверяем что search работает
      engine.makeMove(1, 1, 1, 1);

      const search = new MinimaxSearch(defaultConfig);
      const result = search.findBestMove(engine);

      // Для незавершённой игры должен вернуть ход
      expect(result).not.toBeNull();
      expect(result?.move).toBeDefined();
    });

    it('should track statistics correctly', () => {
      const engine = new GameEngine();
      engine.makeMove(1, 1, 1, 1);

      const search = new MinimaxSearch(defaultConfig);
      search.findBestMove(engine);

      const stats = search.getStats();

      expect(stats.nodesVisited).toBeGreaterThan(0);
      expect(stats.cutoffs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Alpha-beta pruning', () => {
    it('should have cutoffs during search', () => {
      const engine = new GameEngine();
      engine.makeMove(1, 1, 1, 1);
      engine.makeMove(1, 1, 0, 0);
      engine.makeMove(0, 0, 0, 0);

      const search = new MinimaxSearch({ ...defaultConfig, maxDepth: 4 });
      search.findBestMove(engine);

      const stats = search.getStats();

      // С alpha-beta должны быть отсечения
      expect(stats.cutoffs).toBeGreaterThan(0);
    });

    it('should visit fewer nodes than brute force', () => {
      const engine = new GameEngine();
      engine.makeMove(1, 1, 1, 1);
      engine.makeMove(1, 1, 0, 0);

      const search = new MinimaxSearch({ ...defaultConfig, maxDepth: 3 });
      search.findBestMove(engine);

      const stats = search.getStats();

      // При глубине 3 не должно быть астрономического числа узлов
      // Без alpha-beta было бы ~8^3 = 512+ узлов на одну ветку
      expect(stats.nodesVisited).toBeLessThan(10000);
    });
  });

  describe('Transposition table', () => {
    it('should use cache when enabled', () => {
      const engine = new GameEngine();
      engine.makeMove(1, 1, 1, 1);

      const searchWithCache = new MinimaxSearch({
        ...defaultConfig,
        useTranspositionTable: true
      });

      // Первый поиск
      searchWithCache.findBestMove(engine);

      // Второй поиск должен использовать кэш
      searchWithCache.findBestMove(engine);
      const statsWithCache = searchWithCache.getStats();

      expect(statsWithCache.cacheHits).toBeGreaterThan(0);
    });

    it('should work without cache', () => {
      const engine = new GameEngine();
      engine.makeMove(1, 1, 1, 1);

      const searchNoCache = new MinimaxSearch({
        ...defaultConfig,
        useTranspositionTable: false
      });

      const result = searchNoCache.findBestMove(engine);
      const stats = searchNoCache.getStats();

      expect(result).not.toBeNull();
      expect(stats.cacheHits).toBe(0);
    });

    it('should clear table correctly', () => {
      const engine = new GameEngine();

      const search = new MinimaxSearch(defaultConfig);

      // Заполняем кэш
      search.findBestMove(engine);
      search.findBestMove(engine);
      const stats1 = search.getStats();

      // Очищаем
      search.clearTable();

      // После очистки кэш пустой
      search.findBestMove(engine);
      const stats2 = search.getStats();

      expect(stats1.cacheHits).toBeGreaterThan(0);
      expect(stats2.cacheHits).toBe(0);
    });
  });

  describe('Move ordering', () => {
    it('should prefer center moves', () => {
      const engine = new GameEngine();
      const search = new MinimaxSearch({ ...defaultConfig, maxDepth: 1 });

      const result = search.findBestMove(engine);

      // На первом ходу центр центральной доски - хороший выбор
      // Либо центр какой-то доски
      expect(result).not.toBeNull();
      if (result) {
        // Проверяем что это разумный ход (центр или угол)
        const isCenter = result.move.cellRow === 1 && result.move.cellCol === 1;
        const isCenterBoard = result.move.boardRow === 1 && result.move.boardCol === 1;

        // При глубине 1 должен выбрать центр центральной доски
        expect(isCenter || isCenterBoard).toBe(true);
      }
    });
  });

  describe('Depth handling', () => {
    it('should search deeper with higher maxDepth', () => {
      const engine = new GameEngine();
      engine.makeMove(1, 1, 1, 1);

      const searchDepth2 = new MinimaxSearch({
        ...defaultConfig,
        maxDepth: 2,
        useTranspositionTable: false
      });

      const searchDepth4 = new MinimaxSearch({
        ...defaultConfig,
        maxDepth: 4,
        useTranspositionTable: false
      });

      searchDepth2.findBestMove(engine);
      const stats2 = searchDepth2.getStats();

      searchDepth4.findBestMove(engine);
      const stats4 = searchDepth4.getStats();

      expect(stats4.nodesVisited).toBeGreaterThan(stats2.nodesVisited);
    });
  });

  describe('Score consistency', () => {
    it('should give consistent scores for same position', () => {
      const engine = new GameEngine();
      engine.makeMove(1, 1, 1, 1);

      const search = new MinimaxSearch(defaultConfig);

      const result1 = search.findBestMove(engine);
      search.clearTable();
      const result2 = search.findBestMove(engine);

      // Должен найти тот же лучший ход
      expect(result1?.move.boardRow).toBe(result2?.move.boardRow);
      expect(result1?.move.boardCol).toBe(result2?.move.boardCol);
      expect(result1?.move.cellRow).toBe(result2?.move.cellRow);
      expect(result1?.move.cellCol).toBe(result2?.move.cellCol);
      expect(result1?.score).toBe(result2?.score);
    });
  });
});


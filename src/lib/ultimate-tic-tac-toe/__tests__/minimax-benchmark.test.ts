/**
 * Benchmark tests for Minimax performance
 * Run with: npm test -- --testPathPattern=minimax-benchmark
 */

import { GameEngine } from '../game-engine';
import { MinimaxSearch } from '../ai/minimax';
import { AIConfig } from '../ai/types';

// Helper to measure time in ms
function measureTime(fn: () => void): number {
  const start = performance.now();
  fn();
  return performance.now() - start;
}

// Helper to create engine with specific moves
function createEngineWithMoves(moves: [number, number, number, number][]): GameEngine {
  const engine = new GameEngine();
  for (const [boardRow, boardCol, cellRow, cellCol] of moves) {
    engine.makeMove(boardRow, boardCol, cellRow, cellCol);
  }
  return engine;
}

// Common AI config
function createConfig(depth: number, useTable: boolean = true): AIConfig {
  return {
    maxDepth: depth,
    useTranspositionTable: useTable,
    maxTableSize: 100000,
  };
}

describe('Minimax Benchmark', () => {
  // Scenario 1: Empty board (first move) - maximum branching factor
  describe('Scenario 1: Empty board (first move)', () => {
    test('benchmark depth 3', () => {
      const engine = new GameEngine();
      const search = new MinimaxSearch(createConfig(3));

      const times: number[] = [];
      const iterations = 5;

      for (let i = 0; i < iterations; i++) {
        const time = measureTime(() => {
          search.findBestMove(engine);
        });
        times.push(time);
        search.clearTable();
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / iterations;
      const stats = search.getStats();

      console.log(`\n[Empty Board] Depth 3:`);
      console.log(`  Average time: ${avgTime.toFixed(2)}ms`);
      console.log(`  Nodes visited: ${stats.nodesVisited}`);
      console.log(`  Cache hits: ${stats.cacheHits}`);
      console.log(`  Cutoffs: ${stats.cutoffs}`);

      expect(avgTime).toBeGreaterThan(0);
    });

    test('benchmark depth 4', () => {
      const engine = new GameEngine();
      const search = new MinimaxSearch(createConfig(4));

      const times: number[] = [];
      const iterations = 3;

      for (let i = 0; i < iterations; i++) {
        const time = measureTime(() => {
          search.findBestMove(engine);
        });
        times.push(time);
        search.clearTable();
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / iterations;
      const stats = search.getStats();

      console.log(`\n[Empty Board] Depth 4:`);
      console.log(`  Average time: ${avgTime.toFixed(2)}ms`);
      console.log(`  Nodes visited: ${stats.nodesVisited}`);
      console.log(`  Cache hits: ${stats.cacheHits}`);
      console.log(`  Cutoffs: ${stats.cutoffs}`);

      expect(avgTime).toBeGreaterThan(0);
    });

    test('benchmark depth 5', () => {
      const engine = new GameEngine();
      const search = new MinimaxSearch(createConfig(5));

      const time = measureTime(() => {
        search.findBestMove(engine);
      });

      const stats = search.getStats();

      console.log(`\n[Empty Board] Depth 5:`);
      console.log(`  Time: ${time.toFixed(2)}ms`);
      console.log(`  Nodes visited: ${stats.nodesVisited}`);
      console.log(`  Cache hits: ${stats.cacheHits}`);
      console.log(`  Cutoffs: ${stats.cutoffs}`);

      expect(time).toBeGreaterThan(0);
    });
  });

  // Scenario 2: Mid-game with restricted board
  describe('Scenario 2: Mid-game (restricted board)', () => {
    const midGameMoves: [number, number, number, number][] = [
      [1, 1, 1, 1], // X center of center
      [1, 1, 0, 0], // O
      [0, 0, 1, 1], // X
      [1, 1, 2, 2], // O
      [2, 2, 1, 1], // X
    ];

    test('benchmark depth 4', () => {
      const engine = createEngineWithMoves(midGameMoves);
      const search = new MinimaxSearch(createConfig(4));

      const times: number[] = [];
      const iterations = 3;

      for (let i = 0; i < iterations; i++) {
        const time = measureTime(() => {
          search.findBestMove(engine);
        });
        times.push(time);
        search.clearTable();
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / iterations;
      const stats = search.getStats();

      console.log(`\n[Mid-game Restricted] Depth 4:`);
      console.log(`  Valid moves: ${engine.getValidMoves().length}`);
      console.log(`  Average time: ${avgTime.toFixed(2)}ms`);
      console.log(`  Nodes visited: ${stats.nodesVisited}`);
      console.log(`  Cache hits: ${stats.cacheHits}`);
      console.log(`  Cutoffs: ${stats.cutoffs}`);

      expect(avgTime).toBeGreaterThan(0);
    });

    test('benchmark depth 6', () => {
      const engine = createEngineWithMoves(midGameMoves);
      const search = new MinimaxSearch(createConfig(6));

      const time = measureTime(() => {
        search.findBestMove(engine);
      });

      const stats = search.getStats();

      console.log(`\n[Mid-game Restricted] Depth 6:`);
      console.log(`  Valid moves: ${engine.getValidMoves().length}`);
      console.log(`  Time: ${time.toFixed(2)}ms`);
      console.log(`  Nodes visited: ${stats.nodesVisited}`);
      console.log(`  Cache hits: ${stats.cacheHits}`);
      console.log(`  Cutoffs: ${stats.cutoffs}`);

      expect(time).toBeGreaterThan(0);
    });
  });

  // Scenario 3: Free board choice (after sending to won/full board)
  describe('Scenario 3: Free board choice (high branching)', () => {
    // Setup where activeBoard = null (free choice)
    const freeBoardMoves: [number, number, number, number][] = [
      [0, 0, 0, 0], // X
      [0, 0, 1, 1], // O
      [1, 1, 0, 0], // X
      [0, 0, 2, 2], // O wins (0,0) board
      // Now if X plays to send O to (0,0), O gets free choice
    ];

    test('benchmark depth 4', () => {
      const engine = createEngineWithMoves(freeBoardMoves);
      // X plays to send O somewhere that gives them free choice
      engine.makeMove(2, 2, 0, 0); // X
      // Now O has free choice (activeBoard might be restricted or not)

      const search = new MinimaxSearch(createConfig(4));

      const times: number[] = [];
      const iterations = 3;

      for (let i = 0; i < iterations; i++) {
        const time = measureTime(() => {
          search.findBestMove(engine);
        });
        times.push(time);
        search.clearTable();
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / iterations;
      const stats = search.getStats();

      console.log(`\n[Free Board Choice] Depth 4:`);
      console.log(`  Active board: ${JSON.stringify(engine.getActiveBoard())}`);
      console.log(`  Valid moves: ${engine.getValidMoves().length}`);
      console.log(`  Average time: ${avgTime.toFixed(2)}ms`);
      console.log(`  Nodes visited: ${stats.nodesVisited}`);
      console.log(`  Cache hits: ${stats.cacheHits}`);
      console.log(`  Cutoffs: ${stats.cutoffs}`);

      expect(avgTime).toBeGreaterThan(0);
    });
  });

  // Scenario 4: Late game with many filled boards
  describe('Scenario 4: Late game (fewer options)', () => {
    test('benchmark depth 6', () => {
      const engine = new GameEngine();
      // Play a longer game to reach late-game state
      const moves: [number, number, number, number][] = [
        [1, 1, 1, 1], // X - center
        [1, 1, 0, 0], // O
        [0, 0, 0, 0], // X
        [0, 0, 1, 1], // O
        [1, 1, 2, 2], // X
        [2, 2, 1, 1], // O
        [1, 1, 0, 1], // X
        [0, 1, 1, 1], // O
        [1, 1, 2, 0], // X
        [2, 0, 1, 1], // O
        [1, 1, 0, 2], // X - X wins center board!
      ];

      for (const [br, bc, cr, cc] of moves) {
        const result = engine.makeMove(br, bc, cr, cc);
        if (!result.success) break;
      }

      if (engine.isGameOver()) {
        console.log(`\n[Late Game] Game ended early, skipping benchmark`);
        expect(true).toBe(true);
        return;
      }

      const search = new MinimaxSearch(createConfig(6));

      const time = measureTime(() => {
        search.findBestMove(engine);
      });

      const stats = search.getStats();

      console.log(`\n[Late Game] Depth 6:`);
      console.log(`  Valid moves: ${engine.getValidMoves().length}`);
      console.log(`  Time: ${time.toFixed(2)}ms`);
      console.log(`  Nodes visited: ${stats.nodesVisited}`);
      console.log(`  Cache hits: ${stats.cacheHits}`);
      console.log(`  Cutoffs: ${stats.cutoffs}`);

      expect(time).toBeGreaterThan(0);
    });
  });

  // Scenario 5: Compare with/without transposition table
  describe('Scenario 5: Transposition table effectiveness', () => {
    test('compare TT on vs off', () => {
      const engine = createEngineWithMoves([
        [1, 1, 1, 1],
        [1, 1, 0, 0],
        [0, 0, 1, 1],
      ]);

      const searchWithTT = new MinimaxSearch(createConfig(4, true));
      const searchWithoutTT = new MinimaxSearch(createConfig(4, false));

      const timeWithTT = measureTime(() => {
        searchWithTT.findBestMove(engine);
      });
      const statsWithTT = searchWithTT.getStats();

      const timeWithoutTT = measureTime(() => {
        searchWithoutTT.findBestMove(engine);
      });
      const statsWithoutTT = searchWithoutTT.getStats();

      console.log(`\n[TT Comparison] Depth 4:`);
      console.log(`  WITH TT:`);
      console.log(`    Time: ${timeWithTT.toFixed(2)}ms`);
      console.log(`    Nodes: ${statsWithTT.nodesVisited}`);
      console.log(`    Cache hits: ${statsWithTT.cacheHits}`);
      console.log(`  WITHOUT TT:`);
      console.log(`    Time: ${timeWithoutTT.toFixed(2)}ms`);
      console.log(`    Nodes: ${statsWithoutTT.nodesVisited}`);
      console.log(`    Cache hits: ${statsWithoutTT.cacheHits}`);
      console.log(`  Speedup: ${(timeWithoutTT / timeWithTT).toFixed(2)}x`);

      expect(timeWithTT).toBeGreaterThan(0);
      expect(timeWithoutTT).toBeGreaterThan(0);
    });
  });

  // Summary benchmark for tracking overall performance
  describe('Performance Summary', () => {
    test('standard benchmark (depth 4, mid-game)', () => {
      const engine = createEngineWithMoves([
        [1, 1, 1, 1],
        [1, 1, 0, 0],
        [0, 0, 1, 1],
        [1, 1, 2, 2],
      ]);

      const search = new MinimaxSearch(createConfig(4));
      const iterations = 5;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const engineCopy = engine.clone();
        const searchCopy = new MinimaxSearch(createConfig(4));

        const time = measureTime(() => {
          searchCopy.findBestMove(engineCopy);
        });
        times.push(time);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / iterations;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);

      console.log(`\n========================================`);
      console.log(`PERFORMANCE SUMMARY (Standard Benchmark)`);
      console.log(`========================================`);
      console.log(`  Config: depth=4, TT=on`);
      console.log(`  Iterations: ${iterations}`);
      console.log(`  Average time: ${avgTime.toFixed(2)}ms`);
      console.log(`  Min time: ${minTime.toFixed(2)}ms`);
      console.log(`  Max time: ${maxTime.toFixed(2)}ms`);
      console.log(`========================================\n`);

      expect(avgTime).toBeGreaterThan(0);
    });
  });
});


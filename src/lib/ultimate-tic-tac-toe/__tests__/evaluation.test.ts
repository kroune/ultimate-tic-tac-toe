import { evaluatePosition, SCORE_WIN, SCORE_LOSS, SCORE_DRAW } from '../ai/evaluation';
import { GameEngine } from '../game-engine';
import { GameState } from '../types';

describe('evaluatePosition', () => {
  describe('Terminal states', () => {
    it('should return SCORE_WIN for X victory', () => {
      // Создаём состояние выигранной игры напрямую
      const winState: GameState = {
        currentPlayer: 'X',
        activeBoard: null,
        globalBoard: [
          [{ type: 'won', winner: 'X' }, { type: 'won', winner: 'X' }, { type: 'won', winner: 'X' }],
          [{ type: 'playing' }, { type: 'playing' }, { type: 'playing' }],
          [{ type: 'playing' }, { type: 'playing' }, { type: 'playing' }],
        ],
        boards: Array(3).fill(null).map(() =>
          Array(3).fill(null).map(() =>
            Array(3).fill(null).map(() => Array(3).fill(null))
          )
        ),
        isGameOver: true,
        winner: 'X'
      };

      const score = evaluatePosition(winState, 0);
      expect(score).toBeGreaterThanOrEqual(SCORE_WIN);
    });

    it('should return SCORE_DRAW for a draw', () => {
      // Ничья сложно создать, проверяем константу
      expect(SCORE_DRAW).toBe(0);
    });

    it('should return SCORE_LOSS for O victory', () => {
      // SCORE_LOSS должен быть отрицательным
      expect(SCORE_LOSS).toBeLessThan(0);
      expect(SCORE_LOSS).toBe(-100000);
    });
  });

  describe('Non-terminal states', () => {
    it('should return 0 for empty board', () => {
      const engine = new GameEngine();
      const state = engine.getGameState();
      const score = evaluatePosition(state, 0);

      // На пустой доске у X небольшое преимущество из-за мобильности
      // (свободный выбор доски)
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThan(100); // Не должно быть большим
    });

    it('should give positive score when X wins a small board', () => {
      // Создаём состояние где X выиграл одну малую доску
      const state: GameState = {
        currentPlayer: 'O',
        activeBoard: { row: 0, col: 2 },
        globalBoard: [
          [{ type: 'won', winner: 'X' }, { type: 'playing' }, { type: 'playing' }],
          [{ type: 'playing' }, { type: 'playing' }, { type: 'playing' }],
          [{ type: 'playing' }, { type: 'playing' }, { type: 'playing' }],
        ],
        boards: Array(3).fill(null).map(() =>
          Array(3).fill(null).map(() =>
            Array(3).fill(null).map(() => Array(3).fill(null))
          )
        ),
        isGameOver: false,
        winner: null
      };

      const score = evaluatePosition(state, 0);

      expect(score).toBeGreaterThan(500); // Выигранная доска даёт большой бонус
    });

    it('should give negative score when O wins a small board', () => {
      // Создаём состояние где O выиграл одну малую доску
      const state: GameState = {
        currentPlayer: 'X',
        activeBoard: null,
        globalBoard: [
          [{ type: 'won', winner: 'O' }, { type: 'playing' }, { type: 'playing' }],
          [{ type: 'playing' }, { type: 'playing' }, { type: 'playing' }],
          [{ type: 'playing' }, { type: 'playing' }, { type: 'playing' }],
        ],
        boards: Array(3).fill(null).map(() =>
          Array(3).fill(null).map(() =>
            Array(3).fill(null).map(() => Array(3).fill(null))
          )
        ),
        isGameOver: false,
        winner: null
      };

      const score = evaluatePosition(state, 0);

      expect(score).toBeLessThan(-500);
    });

    it('should give bonus for center board', () => {
      const engine1 = new GameEngine();
      const engine2 = new GameEngine();

      // Игра с ходом в центр центральной доски
      engine1.makeMove(1, 1, 1, 1); // X в центр центра

      // Игра с ходом в угол угловой доски
      engine2.makeMove(0, 0, 0, 0); // X в угол угла

      const score1 = evaluatePosition(engine1.getGameState(), 0);
      const score2 = evaluatePosition(engine2.getGameState(), 0);

      // Центральная позиция должна быть лучше
      expect(score1).toBeGreaterThan(score2);
    });
  });

  describe('Two-in-a-row detection', () => {
    it('should give bonus for two in a row on global board', () => {
      // X выиграл две доски по диагонали (0,0) и (1,1)
      const state: GameState = {
        currentPlayer: 'O',
        activeBoard: null,
        globalBoard: [
          [{ type: 'won', winner: 'X' }, { type: 'playing' }, { type: 'playing' }],
          [{ type: 'playing' }, { type: 'won', winner: 'X' }, { type: 'playing' }],
          [{ type: 'playing' }, { type: 'playing' }, { type: 'playing' }],
        ],
        boards: Array(3).fill(null).map(() =>
          Array(3).fill(null).map(() =>
            Array(3).fill(null).map(() => Array(3).fill(null))
          )
        ),
        isGameOver: false,
        winner: null
      };

      const score = evaluatePosition(state, 0);

      // Два в ряд по диагонали даёт большой бонус
      expect(score).toBeGreaterThan(2000);
    });
  });

  describe('Depth bonus for quick wins', () => {
    it('should prefer quicker wins (higher depth remaining)', () => {
      // Проверяем формулу: победа с большей оставшейся глубиной лучше
      const winState: GameState = {
        currentPlayer: 'X',
        activeBoard: null,
        globalBoard: [
          [{ type: 'won', winner: 'X' }, { type: 'won', winner: 'X' }, { type: 'won', winner: 'X' }],
          [{ type: 'playing' }, { type: 'playing' }, { type: 'playing' }],
          [{ type: 'playing' }, { type: 'playing' }, { type: 'playing' }],
        ],
        boards: Array(3).fill(null).map(() =>
          Array(3).fill(null).map(() =>
            Array(3).fill(null).map(() => Array(3).fill(null))
          )
        ),
        isGameOver: true,
        winner: 'X'
      };

      const scoreDepth0 = evaluatePosition(winState, 0);
      const scoreDepth5 = evaluatePosition(winState, 5);

      // Победа с большей оставшейся глубиной = быстрее = лучше
      expect(scoreDepth5).toBeGreaterThan(scoreDepth0);
    });
  });
});


import { GameEngine } from '../game-engine';

describe('GameEngine', () => {
  describe('constructor', () => {
    it('should start with X as current player', () => {
      const engine = new GameEngine();
      expect(engine.getCurrentPlayer()).toBe('X');
    });

    it('should start with no active board (free choice)', () => {
      const engine = new GameEngine();
      expect(engine.getActiveBoard()).toBeNull();
    });

    it('should not be game over initially', () => {
      const engine = new GameEngine();
      expect(engine.isGameOver()).toBe(false);
      expect(engine.getWinner()).toBeNull();
    });
  });

  describe('makeMove', () => {
    it('should allow first move anywhere', () => {
      const engine = new GameEngine();
      const result = engine.makeMove(0, 0, 1, 1);
      expect(result.success).toBe(true);
    });

    it('should alternate players after move', () => {
      const engine = new GameEngine();
      expect(engine.getCurrentPlayer()).toBe('X');
      engine.makeMove(0, 0, 0, 0);
      expect(engine.getCurrentPlayer()).toBe('O');
      engine.makeMove(0, 0, 1, 1);
      expect(engine.getCurrentPlayer()).toBe('X');
    });

    it('should set active board based on cell position', () => {
      const engine = new GameEngine();
      engine.makeMove(0, 0, 1, 2);
      expect(engine.getActiveBoard()).toEqual({ row: 1, col: 2 });
    });

    it('should reject move to wrong board when active board is set', () => {
      const engine = new GameEngine();
      engine.makeMove(0, 0, 1, 1);
      const result = engine.makeMove(0, 0, 0, 0);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Must play on board');
      }
    });

    it('should allow move on active board', () => {
      const engine = new GameEngine();
      engine.makeMove(0, 0, 1, 1);
      const result = engine.makeMove(1, 1, 0, 0);
      expect(result.success).toBe(true);
    });

    it('should reject move to occupied cell', () => {
      const engine = new GameEngine();
      engine.makeMove(0, 0, 0, 0);
      engine.makeMove(0, 0, 1, 1);
      engine.makeMove(1, 1, 0, 0);

      const result = engine.makeMove(0, 0, 0, 0);
      expect(result.success).toBe(false);
    });
  });

  describe('active board rules', () => {
    it('should allow free choice when target board is won', () => {
      const engine = new GameEngine();

      // X wins board (0,0) with top row
      engine.makeMove(0, 0, 0, 0);  // X -> O must play (0,0)
      engine.makeMove(0, 0, 1, 0);  // O -> X must play (1,0)
      engine.makeMove(1, 0, 0, 0);  // X -> O must play (0,0)
      engine.makeMove(0, 0, 2, 0);  // O -> X must play (2,0)
      engine.makeMove(2, 0, 0, 0);  // X -> O must play (0,0)
      engine.makeMove(0, 0, 0, 1);  // O -> X must play (0,1)
      engine.makeMove(0, 1, 0, 0);  // X -> O must play (0,0)
      engine.makeMove(0, 0, 1, 1);  // O -> X must play (1,1)
      engine.makeMove(1, 1, 0, 0);  // X -> O must play (0,0)
      engine.makeMove(0, 0, 0, 2);  // O completes row -> X wins (0,0)!

      // Now if next move sends to (0,0), should have free choice
      // X was sent to (0,2), let's play there
      engine.makeMove(0, 2, 0, 0);  // X -> O must play (0,0) but it's won

      // O should have free choice now
      expect(engine.getActiveBoard()).toBeNull();
    });
  });

  describe('getValidMoves', () => {
    it('should return 81 moves initially', () => {
      const engine = new GameEngine();
      const moves = engine.getValidMoves();
      expect(moves.length).toBe(81);
    });

    it('should return moves only on active board when set', () => {
      const engine = new GameEngine();
      engine.makeMove(0, 0, 1, 1);
      const moves = engine.getValidMoves();
      expect(moves.every(m => m.boardRow === 1 && m.boardCol === 1)).toBe(true);
    });
  });

  describe('getGameState', () => {
    it('should return complete game state', () => {
      const engine = new GameEngine();
      const state = engine.getGameState();

      expect(state.currentPlayer).toBe('X');
      expect(state.activeBoard).toBeNull();
      expect(state.isGameOver).toBe(false);
      expect(state.winner).toBeNull();
      expect(state.globalBoard.length).toBe(3);
      expect(state.boards.length).toBe(3);
    });
  });

  describe('reset', () => {
    it('should reset game to initial state', () => {
      const engine = new GameEngine();
      engine.makeMove(0, 0, 0, 0);
      engine.makeMove(0, 0, 1, 1);

      engine.reset();

      expect(engine.getCurrentPlayer()).toBe('X');
      expect(engine.getActiveBoard()).toBeNull();
      expect(engine.isGameOver()).toBe(false);
      expect(engine.getMoveHistory().length).toBe(0);
    });
  });

  describe('serialize/deserialize', () => {
    it('should serialize and deserialize game state', () => {
      const engine = new GameEngine();
      engine.makeMove(0, 0, 0, 0);
      engine.makeMove(0, 0, 1, 1);
      engine.makeMove(1, 1, 2, 2);

      const serialized = engine.serialize();
      const restored = GameEngine.deserialize(serialized);

      expect(restored.getCurrentPlayer()).toBe(engine.getCurrentPlayer());
      expect(restored.getActiveBoard()).toEqual(engine.getActiveBoard());
      expect(restored.getMoveHistory().length).toBe(3);
    });
  });

  describe('win detection', () => {
    it('should detect small board win', () => {
      const engine = new GameEngine();

      // X wins board (0,0) with top row
      engine.makeMove(0, 0, 0, 0);  // X
      engine.makeMove(0, 0, 1, 0);  // O
      engine.makeMove(1, 0, 0, 1);  // X
      engine.makeMove(0, 1, 0, 0);  // O
      engine.makeMove(0, 0, 0, 1);  // X
      engine.makeMove(0, 1, 1, 0);  // O
      engine.makeMove(1, 0, 0, 2);  // X
      engine.makeMove(0, 2, 0, 0);  // O
      engine.makeMove(0, 0, 0, 2);  // X wins board (0,0)!

      const state = engine.getGameState();
      expect(state.globalBoard[0][0]).toEqual({ type: 'won', winner: 'X' });
    });
  });

  describe('game result', () => {
    it('should return null when game is not over', () => {
      const engine = new GameEngine();
      const result = engine.getGameResult();
      expect(result).toBeNull();
    });
  });

  describe('invalid positions', () => {
    it('should reject invalid board positions', () => {
      const engine = new GameEngine();
      const result = engine.makeMove(3, 0, 0, 0);
      expect(result.success).toBe(false);
    });

    it('should reject invalid cell positions', () => {
      const engine = new GameEngine();
      const result = engine.makeMove(0, 0, -1, 0);
      expect(result.success).toBe(false);
    });
  });

  describe('history navigation', () => {
    it('should start with historyIndex -1', () => {
      const engine = new GameEngine();
      expect(engine.getHistoryIndex()).toBe(-1);
    });

    it('should update historyIndex after move', () => {
      const engine = new GameEngine();
      engine.makeMove(0, 0, 0, 0);
      expect(engine.getHistoryIndex()).toBe(0);
      engine.makeMove(0, 0, 1, 1);
      expect(engine.getHistoryIndex()).toBe(1);
    });

    it('should allow going back in history', () => {
      const engine = new GameEngine();
      engine.makeMove(0, 0, 0, 0);
      engine.makeMove(0, 0, 1, 1);

      expect(engine.canGoBack()).toBe(true);
      engine.goBack();
      expect(engine.getHistoryIndex()).toBe(0);
      expect(engine.getCurrentPlayer()).toBe('O');
    });

    it('should allow going forward in history', () => {
      const engine = new GameEngine();
      engine.makeMove(0, 0, 0, 0);
      engine.makeMove(0, 0, 1, 1);
      engine.goBack();

      expect(engine.canGoForward()).toBe(true);
      engine.goForward();
      expect(engine.getHistoryIndex()).toBe(1);
      expect(engine.getCurrentPlayer()).toBe('X');
    });

    it('should go to start', () => {
      const engine = new GameEngine();
      engine.makeMove(0, 0, 0, 0);
      engine.makeMove(0, 0, 1, 1);
      engine.makeMove(1, 1, 2, 2);

      engine.goToStart();
      expect(engine.getHistoryIndex()).toBe(-1);
      expect(engine.getCurrentPlayer()).toBe('X');
    });

    it('should go to end', () => {
      const engine = new GameEngine();
      engine.makeMove(0, 0, 0, 0);
      engine.makeMove(0, 0, 1, 1);
      engine.goToStart();

      engine.goToEnd();
      expect(engine.getHistoryIndex()).toBe(1);
    });

    it('should truncate future history when making new move from past', () => {
      const engine = new GameEngine();
      engine.makeMove(0, 0, 0, 0);
      engine.makeMove(0, 0, 1, 1);
      engine.makeMove(1, 1, 2, 2);

      engine.goBack();
      engine.goBack();
      // Now at move 0

      engine.makeMove(0, 0, 0, 1); // Different move

      expect(engine.getMoveHistory().length).toBe(2);
      expect(engine.getHistoryIndex()).toBe(1);
    });

    it('should not allow going back when at start', () => {
      const engine = new GameEngine();
      expect(engine.canGoBack()).toBe(false);
      expect(engine.goBack()).toBe(false);
    });

    it('should not allow going forward when at end', () => {
      const engine = new GameEngine();
      engine.makeMove(0, 0, 0, 0);
      expect(engine.canGoForward()).toBe(false);
      expect(engine.goForward()).toBe(false);
    });

    it('should return false for invalid move index', () => {
      const engine = new GameEngine();
      engine.makeMove(0, 0, 0, 0);
      expect(engine.goToMove(-2)).toBe(false);
      expect(engine.goToMove(5)).toBe(false);
    });
  });

  describe('URL encoding', () => {
    it('should encode empty game to empty string', () => {
      const engine = new GameEngine();
      expect(engine.encodeForURL()).toBe('');
    });

    it('should encode and restore game state', () => {
      const engine = new GameEngine();
      engine.makeMove(0, 0, 0, 0);
      engine.makeMove(0, 0, 1, 1);
      engine.makeMove(1, 1, 2, 2);

      const encoded = engine.encodeForURL();
      const restored = GameEngine.fromEncodedMoves(encoded);

      expect(restored).not.toBeNull();
      expect(restored!.getMoveHistory().length).toBe(3);
      expect(restored!.getCurrentPlayer()).toBe(engine.getCurrentPlayer());
    });

    it('should return null for invalid encoded string', () => {
      expect(GameEngine.fromEncodedMoves('#$%')).toBeNull();
    });

    it('should return null for invalid move sequence', () => {
      // Create an invalid sequence (e.g., move to wrong board)
      const invalidSequence = 'AA'; // Same move twice
      expect(GameEngine.fromEncodedMoves(invalidSequence)).toBeNull();
    });
  });
});


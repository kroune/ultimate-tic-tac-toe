import { SmallBoard } from '../small-board';

describe('SmallBoard', () => {
  describe('constructor', () => {
    it('should create an empty board', () => {
      const board = new SmallBoard();
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          expect(board.getCell(row, col)).toBeNull();
        }
      }
    });

    it('should have status "playing" initially', () => {
      const board = new SmallBoard();
      expect(board.getStatus()).toEqual({ type: 'playing' });
    });
  });

  describe('makeMove', () => {
    it('should allow move to empty cell', () => {
      const board = new SmallBoard();
      const result = board.makeMove(0, 0, 'X');
      expect(result).toBe(true);
      expect(board.getCell(0, 0)).toBe('X');
    });

    it('should reject move to occupied cell', () => {
      const board = new SmallBoard();
      board.makeMove(0, 0, 'X');
      const result = board.makeMove(0, 0, 'O');
      expect(result).toBe(false);
      expect(board.getCell(0, 0)).toBe('X');
    });

    it('should reject move with invalid position', () => {
      const board = new SmallBoard();
      expect(board.makeMove(-1, 0, 'X')).toBe(false);
      expect(board.makeMove(0, 3, 'X')).toBe(false);
      expect(board.makeMove(3, 3, 'X')).toBe(false);
    });
  });

  describe('checkWinner - horizontal', () => {
    it('should detect winner in row 0', () => {
      const board = new SmallBoard();
      board.makeMove(0, 0, 'X');
      board.makeMove(0, 1, 'X');
      board.makeMove(0, 2, 'X');
      expect(board.checkWinner()).toBe('X');
      expect(board.getStatus()).toEqual({ type: 'won', winner: 'X' });
    });

    it('should detect winner in row 1', () => {
      const board = new SmallBoard();
      board.makeMove(1, 0, 'O');
      board.makeMove(1, 1, 'O');
      board.makeMove(1, 2, 'O');
      expect(board.checkWinner()).toBe('O');
    });

    it('should detect winner in row 2', () => {
      const board = new SmallBoard();
      board.makeMove(2, 0, 'X');
      board.makeMove(2, 1, 'X');
      board.makeMove(2, 2, 'X');
      expect(board.checkWinner()).toBe('X');
    });
  });

  describe('checkWinner - vertical', () => {
    it('should detect winner in col 0', () => {
      const board = new SmallBoard();
      board.makeMove(0, 0, 'O');
      board.makeMove(1, 0, 'O');
      board.makeMove(2, 0, 'O');
      expect(board.checkWinner()).toBe('O');
    });

    it('should detect winner in col 1', () => {
      const board = new SmallBoard();
      board.makeMove(0, 1, 'X');
      board.makeMove(1, 1, 'X');
      board.makeMove(2, 1, 'X');
      expect(board.checkWinner()).toBe('X');
    });

    it('should detect winner in col 2', () => {
      const board = new SmallBoard();
      board.makeMove(0, 2, 'O');
      board.makeMove(1, 2, 'O');
      board.makeMove(2, 2, 'O');
      expect(board.checkWinner()).toBe('O');
    });
  });

  describe('checkWinner - diagonal', () => {
    it('should detect winner on main diagonal', () => {
      const board = new SmallBoard();
      board.makeMove(0, 0, 'X');
      board.makeMove(1, 1, 'X');
      board.makeMove(2, 2, 'X');
      expect(board.checkWinner()).toBe('X');
    });

    it('should detect winner on anti-diagonal', () => {
      const board = new SmallBoard();
      board.makeMove(0, 2, 'O');
      board.makeMove(1, 1, 'O');
      board.makeMove(2, 0, 'O');
      expect(board.checkWinner()).toBe('O');
    });
  });

  describe('draw detection', () => {
    it('should detect draw when board is full with no winner', () => {
      const board = new SmallBoard();
      // X O X
      // X O O
      // O X X
      board.makeMove(0, 0, 'X');
      board.makeMove(0, 1, 'O');
      board.makeMove(0, 2, 'X');
      board.makeMove(1, 0, 'X');
      board.makeMove(1, 1, 'O');
      board.makeMove(1, 2, 'O');
      board.makeMove(2, 0, 'O');
      board.makeMove(2, 1, 'X');
      board.makeMove(2, 2, 'X');

      expect(board.checkWinner()).toBeNull();
      expect(board.isFull()).toBe(true);
      expect(board.getStatus()).toEqual({ type: 'draw' });
    });
  });

  describe('getAvailableMoves', () => {
    it('should return all 9 positions for empty board', () => {
      const board = new SmallBoard();
      const moves = board.getAvailableMoves();
      expect(moves.length).toBe(9);
    });

    it('should return remaining positions after moves', () => {
      const board = new SmallBoard();
      board.makeMove(0, 0, 'X');
      board.makeMove(1, 1, 'O');
      const moves = board.getAvailableMoves();
      expect(moves.length).toBe(7);
      expect(moves).not.toContainEqual({ row: 0, col: 0 });
      expect(moves).not.toContainEqual({ row: 1, col: 1 });
    });

    it('should return empty array when board is won', () => {
      const board = new SmallBoard();
      board.makeMove(0, 0, 'X');
      board.makeMove(0, 1, 'X');
      board.makeMove(0, 2, 'X');
      expect(board.getAvailableMoves()).toEqual([]);
    });

    it('should return empty array when board is full', () => {
      const board = new SmallBoard();
      board.makeMove(0, 0, 'X');
      board.makeMove(0, 1, 'O');
      board.makeMove(0, 2, 'X');
      board.makeMove(1, 0, 'X');
      board.makeMove(1, 1, 'O');
      board.makeMove(1, 2, 'O');
      board.makeMove(2, 0, 'O');
      board.makeMove(2, 1, 'X');
      board.makeMove(2, 2, 'X');
      expect(board.getAvailableMoves()).toEqual([]);
    });
  });

  describe('status transitions', () => {
    it('should transition from playing to won', () => {
      const board = new SmallBoard();
      expect(board.getStatus().type).toBe('playing');

      board.makeMove(0, 0, 'X');
      expect(board.getStatus().type).toBe('playing');

      board.makeMove(0, 1, 'X');
      expect(board.getStatus().type).toBe('playing');

      board.makeMove(0, 2, 'X');
      expect(board.getStatus()).toEqual({ type: 'won', winner: 'X' });
    });

    it('should not allow moves after board is won', () => {
      const board = new SmallBoard();
      board.makeMove(0, 0, 'X');
      board.makeMove(0, 1, 'X');
      board.makeMove(0, 2, 'X');

      const result = board.makeMove(1, 1, 'O');
      expect(result).toBe(false);
    });
  });

  describe('clone', () => {
    it('should create independent copy', () => {
      const board = new SmallBoard();
      board.makeMove(0, 0, 'X');
      board.makeMove(1, 1, 'O');

      const cloned = board.clone();

      expect(cloned.getCell(0, 0)).toBe('X');
      expect(cloned.getCell(1, 1)).toBe('O');

      board.makeMove(2, 2, 'X');
      expect(cloned.getCell(2, 2)).toBeNull();
    });
  });

  describe('isPlayable', () => {
    it('should return true for playing board', () => {
      const board = new SmallBoard();
      expect(board.isPlayable()).toBe(true);
    });

    it('should return false for won board', () => {
      const board = new SmallBoard();
      board.makeMove(0, 0, 'X');
      board.makeMove(0, 1, 'X');
      board.makeMove(0, 2, 'X');
      expect(board.isPlayable()).toBe(false);
    });

    it('should return false for draw board', () => {
      const board = new SmallBoard();
      board.makeMove(0, 0, 'X');
      board.makeMove(0, 1, 'O');
      board.makeMove(0, 2, 'X');
      board.makeMove(1, 0, 'X');
      board.makeMove(1, 1, 'O');
      board.makeMove(1, 2, 'O');
      board.makeMove(2, 0, 'O');
      board.makeMove(2, 1, 'X');
      board.makeMove(2, 2, 'X');
      expect(board.isPlayable()).toBe(false);
    });
  });
});


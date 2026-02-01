import { GlobalBoard } from '../global-board';

describe('GlobalBoard', () => {
  describe('constructor', () => {
    it('should create 9 empty small boards', () => {
      const board = new GlobalBoard();
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const smallBoard = board.getSmallBoard(row, col);
          expect(smallBoard.getStatus()).toEqual({ type: 'playing' });
          expect(smallBoard.getAvailableMoves().length).toBe(9);
        }
      }
    });
  });

  describe('getSmallBoard', () => {
    it('should return small board at specified position', () => {
      const board = new GlobalBoard();
      const smallBoard = board.getSmallBoard(1, 2);
      smallBoard.makeMove(0, 0, 'X');

      expect(board.getSmallBoard(1, 2).getCell(0, 0)).toBe('X');
    });
  });

  describe('getGlobalStatus', () => {
    it('should return all playing statuses initially', () => {
      const board = new GlobalBoard();
      const status = board.getGlobalStatus();

      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          expect(status[row][col]).toEqual({ type: 'playing' });
        }
      }
    });

    it('should reflect won board status', () => {
      const board = new GlobalBoard();
      const smallBoard = board.getSmallBoard(0, 0);
      smallBoard.makeMove(0, 0, 'X');
      smallBoard.makeMove(0, 1, 'X');
      smallBoard.makeMove(0, 2, 'X');

      const status = board.getGlobalStatus();
      expect(status[0][0]).toEqual({ type: 'won', winner: 'X' });
    });
  });

  describe('checkGlobalWinner - horizontal', () => {
    it('should detect winner when 3 boards won horizontally in row 0', () => {
      const board = new GlobalBoard();

      for (let col = 0; col < 3; col++) {
        const smallBoard = board.getSmallBoard(0, col);
        smallBoard.makeMove(0, 0, 'X');
        smallBoard.makeMove(0, 1, 'X');
        smallBoard.makeMove(0, 2, 'X');
      }

      expect(board.checkGlobalWinner()).toBe('X');
    });

    it('should detect winner when 3 boards won horizontally in row 1', () => {
      const board = new GlobalBoard();

      for (let col = 0; col < 3; col++) {
        const smallBoard = board.getSmallBoard(1, col);
        smallBoard.makeMove(0, 0, 'O');
        smallBoard.makeMove(0, 1, 'O');
        smallBoard.makeMove(0, 2, 'O');
      }

      expect(board.checkGlobalWinner()).toBe('O');
    });

    it('should detect winner when 3 boards won horizontally in row 2', () => {
      const board = new GlobalBoard();

      for (let col = 0; col < 3; col++) {
        const smallBoard = board.getSmallBoard(2, col);
        smallBoard.makeMove(1, 0, 'X');
        smallBoard.makeMove(1, 1, 'X');
        smallBoard.makeMove(1, 2, 'X');
      }

      expect(board.checkGlobalWinner()).toBe('X');
    });
  });

  describe('checkGlobalWinner - vertical', () => {
    it('should detect winner when 3 boards won vertically in col 0', () => {
      const board = new GlobalBoard();

      for (let row = 0; row < 3; row++) {
        const smallBoard = board.getSmallBoard(row, 0);
        smallBoard.makeMove(0, 0, 'O');
        smallBoard.makeMove(1, 1, 'O');
        smallBoard.makeMove(2, 2, 'O');
      }

      expect(board.checkGlobalWinner()).toBe('O');
    });

    it('should detect winner when 3 boards won vertically in col 1', () => {
      const board = new GlobalBoard();

      for (let row = 0; row < 3; row++) {
        const smallBoard = board.getSmallBoard(row, 1);
        smallBoard.makeMove(0, 0, 'X');
        smallBoard.makeMove(0, 1, 'X');
        smallBoard.makeMove(0, 2, 'X');
      }

      expect(board.checkGlobalWinner()).toBe('X');
    });

    it('should detect winner when 3 boards won vertically in col 2', () => {
      const board = new GlobalBoard();

      for (let row = 0; row < 3; row++) {
        const smallBoard = board.getSmallBoard(row, 2);
        smallBoard.makeMove(2, 0, 'O');
        smallBoard.makeMove(2, 1, 'O');
        smallBoard.makeMove(2, 2, 'O');
      }

      expect(board.checkGlobalWinner()).toBe('O');
    });
  });

  describe('checkGlobalWinner - diagonal', () => {
    it('should detect winner on main diagonal', () => {
      const board = new GlobalBoard();

      for (let i = 0; i < 3; i++) {
        const smallBoard = board.getSmallBoard(i, i);
        smallBoard.makeMove(0, 0, 'X');
        smallBoard.makeMove(0, 1, 'X');
        smallBoard.makeMove(0, 2, 'X');
      }

      expect(board.checkGlobalWinner()).toBe('X');
    });

    it('should detect winner on anti-diagonal', () => {
      const board = new GlobalBoard();

      const positions = [[0, 2], [1, 1], [2, 0]];
      for (const [row, col] of positions) {
        const smallBoard = board.getSmallBoard(row, col);
        smallBoard.makeMove(0, 0, 'O');
        smallBoard.makeMove(1, 1, 'O');
        smallBoard.makeMove(2, 2, 'O');
      }

      expect(board.checkGlobalWinner()).toBe('O');
    });
  });

  describe('countWonBoards', () => {
    it('should return 0 initially', () => {
      const board = new GlobalBoard();
      expect(board.countWonBoards('X')).toBe(0);
      expect(board.countWonBoards('O')).toBe(0);
    });

    it('should count won boards correctly', () => {
      const board = new GlobalBoard();

      board.getSmallBoard(0, 0).makeMove(0, 0, 'X');
      board.getSmallBoard(0, 0).makeMove(0, 1, 'X');
      board.getSmallBoard(0, 0).makeMove(0, 2, 'X');

      board.getSmallBoard(1, 1).makeMove(0, 0, 'X');
      board.getSmallBoard(1, 1).makeMove(0, 1, 'X');
      board.getSmallBoard(1, 1).makeMove(0, 2, 'X');

      board.getSmallBoard(2, 2).makeMove(0, 0, 'O');
      board.getSmallBoard(2, 2).makeMove(0, 1, 'O');
      board.getSmallBoard(2, 2).makeMove(0, 2, 'O');

      expect(board.countWonBoards('X')).toBe(2);
      expect(board.countWonBoards('O')).toBe(1);
    });
  });

  describe('isSmallBoardPlayable', () => {
    it('should return true for empty boards', () => {
      const board = new GlobalBoard();
      expect(board.isSmallBoardPlayable(0, 0)).toBe(true);
      expect(board.isSmallBoardPlayable(1, 1)).toBe(true);
      expect(board.isSmallBoardPlayable(2, 2)).toBe(true);
    });

    it('should return false for won boards', () => {
      const board = new GlobalBoard();
      const smallBoard = board.getSmallBoard(0, 0);
      smallBoard.makeMove(0, 0, 'X');
      smallBoard.makeMove(0, 1, 'X');
      smallBoard.makeMove(0, 2, 'X');

      expect(board.isSmallBoardPlayable(0, 0)).toBe(false);
    });
  });

  describe('getPlayableBoards', () => {
    it('should return all 9 boards initially', () => {
      const board = new GlobalBoard();
      const playable = board.getPlayableBoards();
      expect(playable.length).toBe(9);
    });

    it('should exclude won boards', () => {
      const board = new GlobalBoard();

      board.getSmallBoard(0, 0).makeMove(0, 0, 'X');
      board.getSmallBoard(0, 0).makeMove(0, 1, 'X');
      board.getSmallBoard(0, 0).makeMove(0, 2, 'X');

      const playable = board.getPlayableBoards();
      expect(playable.length).toBe(8);
      expect(playable).not.toContainEqual({ row: 0, col: 0 });
    });
  });

  describe('clone', () => {
    it('should create independent copy', () => {
      const board = new GlobalBoard();
      board.getSmallBoard(0, 0).makeMove(0, 0, 'X');

      const cloned = board.clone();

      expect(cloned.getSmallBoard(0, 0).getCell(0, 0)).toBe('X');

      board.getSmallBoard(0, 0).makeMove(1, 1, 'O');
      expect(cloned.getSmallBoard(0, 0).getCell(1, 1)).toBeNull();
    });
  });
});


import {
  checkLine,
  checkWinnerOnGrid,
  isValidPosition,
  deepClone,
  createEmptyGrid,
  encodeMoveToChar,
  decodeCharToMove,
  encodeMoves,
  decodeMoves,
  validateEncodedMoves
} from '../utils';
import { CellState, GlobalPosition } from '../types';

describe('utils', () => {
  describe('checkLine', () => {
    it('should return X when all three cells are X', () => {
      expect(checkLine('X', 'X', 'X')).toBe('X');
    });

    it('should return O when all three cells are O', () => {
      expect(checkLine('O', 'O', 'O')).toBe('O');
    });

    it('should return null for mixed line', () => {
      expect(checkLine('X', 'O', 'X')).toBeNull();
    });

    it('should return null for partial line with null', () => {
      expect(checkLine('X', 'X', null)).toBeNull();
      expect(checkLine(null, 'O', 'O')).toBeNull();
      expect(checkLine('X', null, 'X')).toBeNull();
    });

    it('should return null for all null', () => {
      expect(checkLine(null, null, null)).toBeNull();
    });
  });

  describe('checkWinnerOnGrid', () => {
    it('should return X for horizontal win in row 0', () => {
      const grid: CellState[][] = [
        ['X', 'X', 'X'],
        [null, 'O', null],
        ['O', null, null]
      ];
      expect(checkWinnerOnGrid(grid)).toBe('X');
    });

    it('should return X for horizontal win in row 1', () => {
      const grid: CellState[][] = [
        [null, 'O', null],
        ['X', 'X', 'X'],
        ['O', null, null]
      ];
      expect(checkWinnerOnGrid(grid)).toBe('X');
    });

    it('should return X for horizontal win in row 2', () => {
      const grid: CellState[][] = [
        [null, 'O', null],
        ['O', null, null],
        ['X', 'X', 'X']
      ];
      expect(checkWinnerOnGrid(grid)).toBe('X');
    });

    it('should return O for vertical win in col 0', () => {
      const grid: CellState[][] = [
        ['O', 'X', null],
        ['O', 'X', null],
        ['O', null, null]
      ];
      expect(checkWinnerOnGrid(grid)).toBe('O');
    });

    it('should return O for vertical win in col 1', () => {
      const grid: CellState[][] = [
        ['X', 'O', null],
        [null, 'O', 'X'],
        [null, 'O', null]
      ];
      expect(checkWinnerOnGrid(grid)).toBe('O');
    });

    it('should return O for vertical win in col 2', () => {
      const grid: CellState[][] = [
        ['X', null, 'O'],
        [null, 'X', 'O'],
        [null, null, 'O']
      ];
      expect(checkWinnerOnGrid(grid)).toBe('O');
    });

    it('should return X for diagonal win (top-left to bottom-right)', () => {
      const grid: CellState[][] = [
        ['X', 'O', null],
        ['O', 'X', null],
        [null, null, 'X']
      ];
      expect(checkWinnerOnGrid(grid)).toBe('X');
    });

    it('should return O for diagonal win (top-right to bottom-left)', () => {
      const grid: CellState[][] = [
        ['X', 'X', 'O'],
        [null, 'O', null],
        ['O', null, 'X']
      ];
      expect(checkWinnerOnGrid(grid)).toBe('O');
    });

    it('should return null for empty grid', () => {
      const grid = createEmptyGrid();
      expect(checkWinnerOnGrid(grid)).toBeNull();
    });

    it('should return null for grid with no winner', () => {
      const grid: CellState[][] = [
        ['X', 'O', 'X'],
        ['O', 'O', 'X'],
        ['X', 'X', 'O']
      ];
      expect(checkWinnerOnGrid(grid)).toBeNull();
    });
  });

  describe('isValidPosition', () => {
    it('should return true for valid positions (0-2)', () => {
      expect(isValidPosition(0, 0)).toBe(true);
      expect(isValidPosition(0, 2)).toBe(true);
      expect(isValidPosition(2, 0)).toBe(true);
      expect(isValidPosition(2, 2)).toBe(true);
      expect(isValidPosition(1, 1)).toBe(true);
    });

    it('should return false for negative positions', () => {
      expect(isValidPosition(-1, 0)).toBe(false);
      expect(isValidPosition(0, -1)).toBe(false);
      expect(isValidPosition(-1, -1)).toBe(false);
    });

    it('should return false for positions > 2', () => {
      expect(isValidPosition(3, 0)).toBe(false);
      expect(isValidPosition(0, 3)).toBe(false);
      expect(isValidPosition(3, 3)).toBe(false);
    });
  });

  describe('deepClone', () => {
    it('should clone primitive values', () => {
      expect(deepClone(5)).toBe(5);
      expect(deepClone('test')).toBe('test');
      expect(deepClone(true)).toBe(true);
    });

    it('should deep clone objects', () => {
      const obj = { a: 1, b: { c: 2 } };
      const cloned = deepClone(obj);
      expect(cloned).toEqual(obj);
      expect(cloned).not.toBe(obj);
      expect(cloned.b).not.toBe(obj.b);
    });

    it('should deep clone arrays', () => {
      const arr = [[1, 2], [3, 4]];
      const cloned = deepClone(arr);
      expect(cloned).toEqual(arr);
      expect(cloned).not.toBe(arr);
      expect(cloned[0]).not.toBe(arr[0]);
    });
  });

  describe('createEmptyGrid', () => {
    it('should create 3x3 grid of nulls', () => {
      const grid = createEmptyGrid();
      expect(grid.length).toBe(3);
      expect(grid[0].length).toBe(3);
      expect(grid[1].length).toBe(3);
      expect(grid[2].length).toBe(3);

      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          expect(grid[row][col]).toBeNull();
        }
      }
    });
  });

  describe('move encoding/decoding', () => {
    describe('encodeMoveToChar / decodeCharToMove', () => {
      it('should encode (0,0,0,0) to first character', () => {
        const char = encodeMoveToChar({ boardRow: 0, boardCol: 0, cellRow: 0, cellCol: 0 });
        expect(char).toBe('A');
      });

      it('should decode first character back to (0,0,0,0)', () => {
        const move = decodeCharToMove('A');
        expect(move).toEqual({ boardRow: 0, boardCol: 0, cellRow: 0, cellCol: 0 });
      });

      it('should encode and decode all 81 positions correctly', () => {
        for (let boardRow = 0; boardRow < 3; boardRow++) {
          for (let boardCol = 0; boardCol < 3; boardCol++) {
            for (let cellRow = 0; cellRow < 3; cellRow++) {
              for (let cellCol = 0; cellCol < 3; cellCol++) {
                const original: GlobalPosition = { boardRow, boardCol, cellRow, cellCol };
                const encoded = encodeMoveToChar(original);
                const decoded = decodeCharToMove(encoded);
                expect(decoded).toEqual(original);
              }
            }
          }
        }
      });

      it('should return null for invalid characters', () => {
        expect(decodeCharToMove('^')).toBeNull();
        expect(decodeCharToMove('+')).toBeNull();
        expect(decodeCharToMove(' ')).toBeNull();
      });
    });

    describe('encodeMoves / decodeMoves', () => {
      it('should encode empty array to empty string', () => {
        expect(encodeMoves([])).toBe('');
      });

      it('should decode empty string to empty array', () => {
        expect(decodeMoves('')).toEqual([]);
      });

      it('should encode and decode a sequence of moves', () => {
        const moves: GlobalPosition[] = [
          { boardRow: 0, boardCol: 0, cellRow: 1, cellCol: 1 },
          { boardRow: 1, boardCol: 1, cellRow: 0, cellCol: 0 },
          { boardRow: 0, boardCol: 0, cellRow: 2, cellCol: 2 }
        ];

        const encoded = encodeMoves(moves);
        const decoded = decodeMoves(encoded);
        expect(decoded).toEqual(moves);
      });

      it('should return null for invalid encoded string', () => {
        expect(decodeMoves('^+=')).toBeNull();
      });
    });

    describe('validateEncodedMoves', () => {
      it('should return true for valid encoded moves', () => {
        expect(validateEncodedMoves('ABC')).toBe(true);
        expect(validateEncodedMoves('')).toBe(true);
        expect(validateEncodedMoves('AaBbCc')).toBe(true);
      });

      it('should return false for invalid characters', () => {
        expect(validateEncodedMoves('^+=')).toBe(false);
        expect(validateEncodedMoves('AB^C')).toBe(false);
      });

      it('should return false for non-string input', () => {
        expect(validateEncodedMoves(null as any)).toBe(false);
        expect(validateEncodedMoves(123 as any)).toBe(false);
      });

      it('should return false for too long string (>81 moves)', () => {
        const tooLong = 'A'.repeat(82);
        expect(validateEncodedMoves(tooLong)).toBe(false);
      });

      it('should return true for max length string (81 moves)', () => {
        const maxLength = 'A'.repeat(81);
        expect(validateEncodedMoves(maxLength)).toBe(true);
      });
    });
  });
});


import { CellState, Player, Position, SmallBoardStatus } from './types';
import { checkWinnerOnGrid, createEmptyGrid, isValidPosition } from './utils';

export class SmallBoard {
  private cells: CellState[][];
  private _status: SmallBoardStatus;

  constructor() {
    this.cells = createEmptyGrid();
    this._status = { type: 'playing' };
  }

  makeMove(row: number, col: number, player: Player): boolean {
    if (!isValidPosition(row, col)) {
      return false;
    }

    if (this._status.type !== 'playing') {
      return false;
    }

    if (this.cells[row][col] !== null) {
      return false;
    }

    this.cells[row][col] = player;
    this.updateStatus();
    return true;
  }

  private updateStatus(): void {
    const winner = this.checkWinner();
    if (winner) {
      this._status = { type: 'won', winner };
    } else if (this.isFull()) {
      this._status = { type: 'draw' };
    }
  }

  checkWinner(): Player | null {
    return checkWinnerOnGrid(this.cells);
  }

  isFull(): boolean {
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        if (this.cells[row][col] === null) {
          return false;
        }
      }
    }
    return true;
  }

  getStatus(): SmallBoardStatus {
    return this._status;
  }

  getAvailableMoves(): Position[] {
    if (this._status.type !== 'playing') {
      return [];
    }

    const moves: Position[] = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        if (this.cells[row][col] === null) {
          moves.push({ row, col });
        }
      }
    }
    return moves;
  }

  getCell(row: number, col: number): CellState {
    if (!isValidPosition(row, col)) {
      return null;
    }
    return this.cells[row][col];
  }

  getCells(): CellState[][] {
    return this.cells.map(row => [...row]);
  }

  clone(): SmallBoard {
    const board = new SmallBoard();
    board.cells = this.cells.map(row => [...row]);
    board._status = { ...this._status };
    return board;
  }

  isPlayable(): boolean {
    return this._status.type === 'playing';
  }
}


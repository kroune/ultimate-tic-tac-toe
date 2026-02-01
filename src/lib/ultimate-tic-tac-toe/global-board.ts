import { SmallBoard } from './small-board';
import { Player, Position, SmallBoardStatus, CellState } from './types';
import { checkWinnerOnGrid } from './utils';

export class GlobalBoard {
  private boards: SmallBoard[][];

  constructor() {
    this.boards = [];
    for (let row = 0; row < 3; row++) {
      this.boards[row] = [];
      for (let col = 0; col < 3; col++) {
        this.boards[row][col] = new SmallBoard();
      }
    }
  }

  getSmallBoard(row: number, col: number): SmallBoard {
    return this.boards[row][col];
  }

  getGlobalStatus(): SmallBoardStatus[][] {
    const status: SmallBoardStatus[][] = [];
    for (let row = 0; row < 3; row++) {
      status[row] = [];
      for (let col = 0; col < 3; col++) {
        status[row][col] = this.boards[row][col].getStatus();
      }
    }
    return status;
  }

  getAllCells(): CellState[][][][] {
    const cells: CellState[][][][] = [];
    for (let row = 0; row < 3; row++) {
      cells[row] = [];
      for (let col = 0; col < 3; col++) {
        cells[row][col] = this.boards[row][col].getCells();
      }
    }
    return cells;
  }

  checkGlobalWinner(): Player | null {
    const winnerGrid: CellState[][] = [];
    for (let row = 0; row < 3; row++) {
      winnerGrid[row] = [];
      for (let col = 0; col < 3; col++) {
        const status = this.boards[row][col].getStatus();
        winnerGrid[row][col] = status.type === 'won' ? status.winner : null;
      }
    }
    return checkWinnerOnGrid(winnerGrid);
  }

  countWonBoards(player: Player): number {
    let count = 0;
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const status = this.boards[row][col].getStatus();
        if (status.type === 'won' && status.winner === player) {
          count++;
        }
      }
    }
    return count;
  }

  isSmallBoardPlayable(row: number, col: number): boolean {
    return this.boards[row][col].isPlayable();
  }

  getPlayableBoards(): Position[] {
    const playable: Position[] = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        if (this.boards[row][col].isPlayable()) {
          playable.push({ row, col });
        }
      }
    }
    return playable;
  }

  hasAvailableMoves(): boolean {
    return this.getPlayableBoards().length > 0;
  }

  clone(): GlobalBoard {
    const board = new GlobalBoard();
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        board.boards[row][col] = this.boards[row][col].clone();
      }
    }
    return board;
  }
}


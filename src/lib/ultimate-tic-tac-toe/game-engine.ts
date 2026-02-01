import { GlobalBoard } from './global-board';
import {
  Player,
  Position,
  GlobalPosition,
  GameState,
  MoveResult,
  GameResult
} from './types';
import { isValidPosition } from './utils';

export class GameEngine {
  private globalBoard: GlobalBoard;
  private currentPlayer: Player;
  private activeBoard: Position | null;
  private _isGameOver: boolean;
  private _winner: Player | null;
  private moveHistory: GlobalPosition[];

  constructor() {
    this.globalBoard = new GlobalBoard();
    this.currentPlayer = 'X';
    this.activeBoard = null;
    this._isGameOver = false;
    this._winner = null;
    this.moveHistory = [];
  }

  makeMove(
    boardRow: number,
    boardCol: number,
    cellRow: number,
    cellCol: number
  ): MoveResult {
    if (this._isGameOver) {
      return { success: false, error: 'Game is already over' };
    }

    if (!isValidPosition(boardRow, boardCol)) {
      return { success: false, error: 'Invalid board position' };
    }
    if (!isValidPosition(cellRow, cellCol)) {
      return { success: false, error: 'Invalid cell position' };
    }

    if (this.activeBoard !== null) {
      if (boardRow !== this.activeBoard.row || boardCol !== this.activeBoard.col) {
        return {
          success: false,
          error: `Must play on board (${this.activeBoard.row}, ${this.activeBoard.col})`
        };
      }
    }

    if (!this.globalBoard.isSmallBoardPlayable(boardRow, boardCol)) {
      return { success: false, error: 'This board is not playable' };
    }

    const smallBoard = this.globalBoard.getSmallBoard(boardRow, boardCol);
    const moveSuccess = smallBoard.makeMove(cellRow, cellCol, this.currentPlayer);

    if (!moveSuccess) {
      return { success: false, error: 'Cell is already occupied' };
    }

    this.moveHistory.push({ boardRow, boardCol, cellRow, cellCol });

    const globalWinner = this.globalBoard.checkGlobalWinner();
    if (globalWinner) {
      this._isGameOver = true;
      this._winner = globalWinner;
    } else if (!this.globalBoard.hasAvailableMoves()) {
      this._isGameOver = true;
      const xBoards = this.globalBoard.countWonBoards('X');
      const oBoards = this.globalBoard.countWonBoards('O');
      if (xBoards > oBoards) {
        this._winner = 'X';
      } else if (oBoards > xBoards) {
        this._winner = 'O';
      } else {
        this._winner = null;
      }
    }

    if (!this._isGameOver) {
      if (this.globalBoard.isSmallBoardPlayable(cellRow, cellCol)) {
        this.activeBoard = { row: cellRow, col: cellCol };
      } else {
        this.activeBoard = null;
      }
    }

    if (!this._isGameOver) {
      this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
    }

    return { success: true, newState: this.getGameState() };
  }

  getValidMoves(): GlobalPosition[] {
    if (this._isGameOver) {
      return [];
    }

    const moves: GlobalPosition[] = [];

    if (this.activeBoard !== null) {
      const smallBoard = this.globalBoard.getSmallBoard(
        this.activeBoard.row,
        this.activeBoard.col
      );
      const cellMoves = smallBoard.getAvailableMoves();
      for (const cell of cellMoves) {
        moves.push({
          boardRow: this.activeBoard.row,
          boardCol: this.activeBoard.col,
          cellRow: cell.row,
          cellCol: cell.col
        });
      }
    } else {
      const playableBoards = this.globalBoard.getPlayableBoards();
      for (const board of playableBoards) {
        const smallBoard = this.globalBoard.getSmallBoard(board.row, board.col);
        const cellMoves = smallBoard.getAvailableMoves();
        for (const cell of cellMoves) {
          moves.push({
            boardRow: board.row,
            boardCol: board.col,
            cellRow: cell.row,
            cellCol: cell.col
          });
        }
      }
    }

    return moves;
  }

  getCurrentPlayer(): Player {
    return this.currentPlayer;
  }

  getActiveBoard(): Position | null {
    return this.activeBoard;
  }

  getGameState(): GameState {
    return {
      currentPlayer: this.currentPlayer,
      activeBoard: this.activeBoard,
      globalBoard: this.globalBoard.getGlobalStatus(),
      boards: this.globalBoard.getAllCells(),
      isGameOver: this._isGameOver,
      winner: this._winner
    };
  }

  isGameOver(): boolean {
    return this._isGameOver;
  }

  getWinner(): Player | null {
    return this._winner;
  }

  getGameResult(): GameResult | null {
    if (!this._isGameOver) {
      return null;
    }
    return {
      winner: this._winner,
      wonBoardsX: this.globalBoard.countWonBoards('X'),
      wonBoardsO: this.globalBoard.countWonBoards('O')
    };
  }

  getMoveHistory(): GlobalPosition[] {
    return [...this.moveHistory];
  }

  reset(): void {
    this.globalBoard = new GlobalBoard();
    this.currentPlayer = 'X';
    this.activeBoard = null;
    this._isGameOver = false;
    this._winner = null;
    this.moveHistory = [];
  }

  serialize(): string {
    return JSON.stringify({
      state: this.getGameState(),
      moveHistory: this.moveHistory
    });
  }

  static deserialize(data: string): GameEngine {
    const parsed = JSON.parse(data);
    const engine = new GameEngine();

    for (const move of parsed.moveHistory) {
      engine.globalBoard.getSmallBoard(move.boardRow, move.boardCol)
        .makeMove(move.cellRow, move.cellCol, engine.currentPlayer);
      engine.currentPlayer = engine.currentPlayer === 'X' ? 'O' : 'X';
      engine.moveHistory.push(move);
    }

    engine.currentPlayer = parsed.state.currentPlayer;
    engine.activeBoard = parsed.state.activeBoard;
    engine._isGameOver = parsed.state.isGameOver;
    engine._winner = parsed.state.winner;

    return engine;
  }
}


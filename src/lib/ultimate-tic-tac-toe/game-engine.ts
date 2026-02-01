import { GlobalBoard } from './global-board';
import {
  Player,
  Position,
  GlobalPosition,
  GameState,
  MoveResult,
  GameResult,
  SmallBoardStatus
} from './types';
import { isValidPosition, encodeMoves, decodeMoves, validateEncodedMoves } from './utils';

export class GameEngine {
  private globalBoard: GlobalBoard;
  private currentPlayer: Player;
  private activeBoard: Position | null;
  private _isGameOver: boolean;
  private _winner: Player | null;
  private moveHistory: GlobalPosition[];
  private historyIndex: number; // -1 = start, n = after move n

  constructor() {
    this.globalBoard = new GlobalBoard();
    this.currentPlayer = 'X';
    this.activeBoard = null;
    this._isGameOver = false;
    this._winner = null;
    this.moveHistory = [];
    this.historyIndex = -1;
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

    // If we're not at the end of history, truncate future moves
    if (this.historyIndex < this.moveHistory.length - 1) {
      this.moveHistory = this.moveHistory.slice(0, this.historyIndex + 1);
    }

    this.moveHistory.push({ boardRow, boardCol, cellRow, cellCol });
    this.historyIndex = this.moveHistory.length - 1;

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

  getHistoryIndex(): number {
    return this.historyIndex;
  }

  canGoBack(): boolean {
    return this.historyIndex >= 0;
  }

  canGoForward(): boolean {
    return this.historyIndex < this.moveHistory.length - 1;
  }

  goToMove(index: number): boolean {
    if (index < -1 || index >= this.moveHistory.length) {
      return false;
    }

    // Rebuild state from scratch up to the given index
    this.globalBoard = new GlobalBoard();
    this.currentPlayer = 'X';
    this.activeBoard = null;
    this._isGameOver = false;
    this._winner = null;

    for (let i = 0; i <= index; i++) {
      const move = this.moveHistory[i];
      const smallBoard = this.globalBoard.getSmallBoard(move.boardRow, move.boardCol);
      smallBoard.makeMove(move.cellRow, move.cellCol, this.currentPlayer);

      // Check game over conditions
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
        if (this.globalBoard.isSmallBoardPlayable(move.cellRow, move.cellCol)) {
          this.activeBoard = { row: move.cellRow, col: move.cellCol };
        } else {
          this.activeBoard = null;
        }
        this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
      }
    }

    this.historyIndex = index;
    return true;
  }

  goBack(): boolean {
    return this.goToMove(this.historyIndex - 1);
  }

  goForward(): boolean {
    return this.goToMove(this.historyIndex + 1);
  }

  goToStart(): boolean {
    return this.goToMove(-1);
  }

  goToEnd(): boolean {
    return this.goToMove(this.moveHistory.length - 1);
  }

  reset(): void {
    this.globalBoard = new GlobalBoard();
    this.currentPlayer = 'X';
    this.activeBoard = null;
    this._isGameOver = false;
    this._winner = null;
    this.moveHistory = [];
    this.historyIndex = -1;
  }

  serialize(): string {
    return JSON.stringify({
      state: this.getGameState(),
      moveHistory: this.moveHistory
    });
  }

  /** Compact encoding for URL sharing */
  encodeForURL(): string {
    return encodeMoves(this.moveHistory);
  }

  /** Restore from compact URL encoding */
  static fromEncodedMoves(encoded: string): GameEngine | null {
    if (!validateEncodedMoves(encoded)) {
      return null;
    }

    const moves = decodeMoves(encoded);
    if (moves === null) {
      return null;
    }

    const engine = new GameEngine();
    for (const move of moves) {
      const result = engine.makeMove(move.boardRow, move.boardCol, move.cellRow, move.cellCol);
      if (!result.success) {
        return null; // Invalid move sequence
      }
    }
    return engine;
  }

  static deserialize(data: string): GameEngine {
    const parsed = JSON.parse(data);
    const engine = new GameEngine();

    for (const move of parsed.moveHistory) {
      engine.globalBoard.getSmallBoard(move.boardRow, move.boardCol)
        .makeMove(move.cellRow, move.cellCol, engine.currentPlayer);
      engine.currentPlayer = engine.currentPlayer === 'X' ? 'O' : 'X';
      engine.moveHistory.push(move);
      engine.historyIndex++;
    }

    engine.currentPlayer = parsed.state.currentPlayer;
    engine.activeBoard = parsed.state.activeBoard;
    engine._isGameOver = parsed.state.isGameOver;
    engine._winner = parsed.state.winner;

    return engine;
  }

  /**
   * Creates a deep clone of the game engine.
   * Used by AI for minimax search - optimized for performance.
   * Does not copy move history (not needed for AI).
   */
  clone(): GameEngine {
    const cloned = new GameEngine();
    cloned.globalBoard = this.globalBoard.clone();
    cloned.currentPlayer = this.currentPlayer;
    cloned.activeBoard = this.activeBoard ? { ...this.activeBoard } : null;
    cloned._isGameOver = this._isGameOver;
    cloned._winner = this._winner;
    // Не копируем историю — не нужна для AI
    cloned.moveHistory = [];
    cloned.historyIndex = -1;
    return cloned;
  }

  /**
   * Makes a move without validation (for AI performance).
   * Returns data needed to undo the move.
   * ONLY use when you know the move is valid!
   */
  makeMoveUnsafe(
    boardRow: number,
    boardCol: number,
    cellRow: number,
    cellCol: number
  ): {
    prevActiveBoard: Position | null;
    prevIsGameOver: boolean;
    prevWinner: Player | null;
    boardStatusBefore: SmallBoardStatus;
    player: Player;
  } {
    const prevActiveBoard = this.activeBoard;
    const prevIsGameOver = this._isGameOver;
    const prevWinner = this._winner;
    const player = this.currentPlayer;

    const smallBoard = this.globalBoard.getSmallBoard(boardRow, boardCol);
    const boardStatusBefore = smallBoard.getStatus();

    smallBoard.makeMove(cellRow, cellCol, player);

    // Check for game over
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

    // Update active board
    if (!this._isGameOver) {
      if (this.globalBoard.isSmallBoardPlayable(cellRow, cellCol)) {
        this.activeBoard = { row: cellRow, col: cellCol };
      } else {
        this.activeBoard = null;
      }
      this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
    }

    return { prevActiveBoard, prevIsGameOver, prevWinner, boardStatusBefore, player };
  }

  /**
   * Undoes a move made with makeMoveUnsafe.
   */
  undoMove(
    boardRow: number,
    boardCol: number,
    cellRow: number,
    cellCol: number,
    undoData: {
      prevActiveBoard: Position | null;
      prevIsGameOver: boolean;
      prevWinner: Player | null;
      boardStatusBefore: SmallBoardStatus;
      player: Player;
    }
  ): void {
    const smallBoard = this.globalBoard.getSmallBoard(boardRow, boardCol);
    smallBoard.undoMove(cellRow, cellCol);
    // Restore board status if it was won/draw before
    (smallBoard as any)._status = undoData.boardStatusBefore;

    this.activeBoard = undoData.prevActiveBoard;
    this._isGameOver = undoData.prevIsGameOver;
    this._winner = undoData.prevWinner;
    this.currentPlayer = undoData.player;
  }
}

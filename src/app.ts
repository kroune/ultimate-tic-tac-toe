import { GameEngine, GameState, Player } from './lib/ultimate-tic-tac-toe';

class UltimateTicTacToeUI {
  private engine: GameEngine;
  private boardElement: HTMLElement;
  private currentPlayerElement: HTMLElement;
  private activeBoardInfoElement: HTMLElement;
  private scoreXElement: HTMLElement;
  private scoreOElement: HTMLElement;
  private modalElement: HTMLElement;
  private modalTitleElement: HTMLElement;
  private modalMessageElement: HTMLElement;

  constructor() {
    this.engine = new GameEngine();

    this.boardElement = document.getElementById('game-board')!;
    this.currentPlayerElement = document.getElementById('current-player')!;
    this.activeBoardInfoElement = document.getElementById('active-board-info')!;
    this.scoreXElement = document.getElementById('score-x')!;
    this.scoreOElement = document.getElementById('score-o')!;
    this.modalElement = document.getElementById('game-over-modal')!;
    this.modalTitleElement = document.getElementById('game-over-title')!;
    this.modalMessageElement = document.getElementById('game-over-message')!;

    this.setupEventListeners();
    this.render();
  }

  private setupEventListeners(): void {
    document.getElementById('reset-btn')!.addEventListener('click', () => this.resetGame());
    document.getElementById('new-game-btn')!.addEventListener('click', () => this.resetGame());
  }

  private resetGame(): void {
    this.engine.reset();
    this.modalElement.hidden = true;
    this.render();
  }

  private render(): void {
    const state = this.engine.getGameState();
    this.renderBoard(state);
    this.renderGameInfo(state);
  }

  private renderBoard(state: GameState): void {
    this.boardElement.innerHTML = '';

    for (let boardRow = 0; boardRow < 3; boardRow++) {
      for (let boardCol = 0; boardCol < 3; boardCol++) {
        const smallBoardElement = this.createSmallBoard(state, boardRow, boardCol);
        this.boardElement.appendChild(smallBoardElement);
      }
    }
  }

  private createSmallBoard(state: GameState, boardRow: number, boardCol: number): HTMLElement {
    const smallBoard = document.createElement('div');
    smallBoard.className = 'small-board';
    smallBoard.dataset.boardRow = boardRow.toString();
    smallBoard.dataset.boardCol = boardCol.toString();

    const boardStatus = state.globalBoard[boardRow][boardCol];
    const isActive = state.activeBoard === null ||
      (state.activeBoard.row === boardRow && state.activeBoard.col === boardCol);
    const isPlayable = boardStatus.type === 'playing' && isActive && !state.isGameOver;

    if (boardStatus.type === 'won') {
      smallBoard.classList.add('won', `won-${boardStatus.winner.toLowerCase()}`);
      const overlay = document.createElement('div');
      overlay.className = 'small-board-overlay';
      overlay.textContent = boardStatus.winner;
      smallBoard.appendChild(overlay);
    } else if (boardStatus.type === 'draw') {
      smallBoard.classList.add('draw');
      const overlay = document.createElement('div');
      overlay.className = 'small-board-overlay';
      overlay.textContent = '—';
      smallBoard.appendChild(overlay);
    }

    if (isPlayable) {
      smallBoard.classList.add('playable');
      if (state.activeBoard !== null) {
        smallBoard.classList.add('active');
      }
    }

    // Create cells
    for (let cellRow = 0; cellRow < 3; cellRow++) {
      for (let cellCol = 0; cellCol < 3; cellCol++) {
        const cell = this.createCell(state, boardRow, boardCol, cellRow, cellCol, isPlayable);
        smallBoard.appendChild(cell);
      }
    }

    return smallBoard;
  }

  private createCell(
    state: GameState,
    boardRow: number,
    boardCol: number,
    cellRow: number,
    cellCol: number,
    boardPlayable: boolean
  ): HTMLElement {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.boardRow = boardRow.toString();
    cell.dataset.boardCol = boardCol.toString();
    cell.dataset.cellRow = cellRow.toString();
    cell.dataset.cellCol = cellCol.toString();

    const cellState = state.boards[boardRow][boardCol][cellRow][cellCol];

    if (cellState !== null) {
      cell.textContent = cellState;
      cell.classList.add('occupied', cellState.toLowerCase());
    } else if (boardPlayable) {
      cell.addEventListener('click', () => this.handleCellClick(boardRow, boardCol, cellRow, cellCol));
    }

    return cell;
  }

  private handleCellClick(boardRow: number, boardCol: number, cellRow: number, cellCol: number): void {
    const result = this.engine.makeMove(boardRow, boardCol, cellRow, cellCol);

    if (result.success) {
      this.render();

      if (this.engine.isGameOver()) {
        this.showGameOverModal();
      }
    }
  }

  private renderGameInfo(state: GameState): void {
    // Current player
    this.currentPlayerElement.textContent = state.currentPlayer;
    this.currentPlayerElement.className = `player-${state.currentPlayer.toLowerCase()}`;

    // Active board info
    if (state.isGameOver) {
      this.activeBoardInfoElement.textContent = 'Игра окончена';
    } else if (state.activeBoard === null) {
      this.activeBoardInfoElement.textContent = 'Можно ходить на любую доску';
    } else {
      this.activeBoardInfoElement.textContent =
        `Ходить на доску (${state.activeBoard.row + 1}, ${state.activeBoard.col + 1})`;
    }

    // Score
    const xBoards = this.countWonBoards(state, 'X');
    const oBoards = this.countWonBoards(state, 'O');
    this.scoreXElement.textContent = xBoards.toString();
    this.scoreOElement.textContent = oBoards.toString();
  }

  private countWonBoards(state: GameState, player: Player): number {
    let count = 0;
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const status = state.globalBoard[row][col];
        if (status.type === 'won' && status.winner === player) {
          count++;
        }
      }
    }
    return count;
  }

  private showGameOverModal(): void {
    const result = this.engine.getGameResult();

    if (result) {
      if (result.winner) {
        this.modalTitleElement.textContent = `Победитель: ${result.winner}!`;
        this.modalTitleElement.className = `player-${result.winner.toLowerCase()}`;
      } else {
        this.modalTitleElement.textContent = 'Ничья!';
        this.modalTitleElement.className = '';
      }

      this.modalMessageElement.textContent =
        `Выиграно досок: X — ${result.wonBoardsX}, O — ${result.wonBoardsO}`;
    }

    this.modalElement.hidden = false;
  }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new UltimateTicTacToeUI();
});


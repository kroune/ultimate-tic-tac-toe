import { GameEngine, GameState, Player, GlobalPosition } from './lib/ultimate-tic-tac-toe';

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
  private historyListElement: HTMLElement;
  private historyFirstBtn: HTMLButtonElement;
  private historyPrevBtn: HTMLButtonElement;
  private historyNextBtn: HTMLButtonElement;
  private historyLastBtn: HTMLButtonElement;

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
    this.historyListElement = document.getElementById('history-list')!;
    this.historyFirstBtn = document.getElementById('history-first') as HTMLButtonElement;
    this.historyPrevBtn = document.getElementById('history-prev') as HTMLButtonElement;
    this.historyNextBtn = document.getElementById('history-next') as HTMLButtonElement;
    this.historyLastBtn = document.getElementById('history-last') as HTMLButtonElement;

    this.loadFromURL();
    this.setupEventListeners();
    this.render();
  }

  private loadFromURL(): void {
    const params = new URLSearchParams(window.location.search);
    const gameState = params.get('g');

    if (gameState) {
      const restored = GameEngine.fromEncodedMoves(gameState);
      if (restored) {
        this.engine = restored;
      }
    }
  }

  private updateURL(): void {
    const encoded = this.engine.encodeForURL();
    const newURL = encoded
      ? `${window.location.pathname}?g=${encoded}`
      : window.location.pathname;

    window.history.replaceState(null, '', newURL);
  }

  private setupEventListeners(): void {
    document.getElementById('reset-btn')!.addEventListener('click', () => this.resetGame());
    document.getElementById('new-game-btn')!.addEventListener('click', () => this.resetGame());

    this.historyFirstBtn.addEventListener('click', () => this.goToStart());
    this.historyPrevBtn.addEventListener('click', () => this.goBack());
    this.historyNextBtn.addEventListener('click', () => this.goForward());
    this.historyLastBtn.addEventListener('click', () => this.goToEnd());

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' && this.engine.canGoBack()) {
        this.goBack();
      } else if (e.key === 'ArrowRight' && this.engine.canGoForward()) {
        this.goForward();
      }
    });
  }

  private goToStart(): void {
    this.engine.goToStart();
    this.render();
    this.updateURL();
  }

  private goBack(): void {
    this.engine.goBack();
    this.render();
    this.updateURL();
  }

  private goForward(): void {
    this.engine.goForward();
    this.render();
    this.updateURL();
  }

  private goToEnd(): void {
    this.engine.goToEnd();
    this.render();
    this.updateURL();
  }

  private goToMove(index: number): void {
    this.engine.goToMove(index);
    this.render();
    this.updateURL();
  }

  private resetGame(): void {
    this.engine.reset();
    this.modalElement.hidden = true;
    this.render();
    this.updateURL();
  }

  private render(): void {
    const state = this.engine.getGameState();
    this.renderBoard(state);
    this.renderGameInfo(state);
    this.renderHistory();
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
      this.updateURL();

      if (this.engine.isGameOver()) {
        this.showGameOverModal();
      }
    }
  }

  private getBoardPositionName(row: number, col: number): string {
    const rowNames = ['верхняя', 'средняя', 'нижняя'];
    const colNames = ['левая', 'центральная', 'правая'];
    return `${rowNames[row]} ${colNames[col]}`;
  }

  private renderGameInfo(state: GameState): void {
    // Current player
    this.currentPlayerElement.textContent = state.currentPlayer;
    this.currentPlayerElement.className = `player-${state.currentPlayer.toLowerCase()}`;

    // Active board info
    if (state.isGameOver) {
      this.activeBoardInfoElement.textContent = 'Игра окончена';
    } else if (state.activeBoard === null) {
      this.activeBoardInfoElement.textContent = 'Свободный ход — выбери любую доску';
    } else {
      const posName = this.getBoardPositionName(state.activeBoard.row, state.activeBoard.col);
      this.activeBoardInfoElement.textContent = `Твой ход: ${posName} доска`;
    }

    // Score
    const xBoards = this.countWonBoards(state, 'X');
    const oBoards = this.countWonBoards(state, 'O');
    this.scoreXElement.textContent = xBoards.toString();
    this.scoreOElement.textContent = oBoards.toString();
  }

  private renderHistory(): void {
    const history = this.engine.getMoveHistory();
    const currentIndex = this.engine.getHistoryIndex();

    // Update navigation buttons
    this.historyFirstBtn.disabled = !this.engine.canGoBack();
    this.historyPrevBtn.disabled = !this.engine.canGoBack();
    this.historyNextBtn.disabled = !this.engine.canGoForward();
    this.historyLastBtn.disabled = !this.engine.canGoForward();

    // Render history list
    if (history.length === 0) {
      this.historyListElement.innerHTML = '<div class="history-empty">Ходов пока нет</div>';
      return;
    }

    this.historyListElement.innerHTML = '';

    // Add start position item
    const startItem = document.createElement('div');
    startItem.className = `history-item${currentIndex === -1 ? ' active' : ''}`;
    startItem.innerHTML = '<span class="move-number">0</span> Старт';
    startItem.addEventListener('click', () => this.goToMove(-1));
    this.historyListElement.appendChild(startItem);

    history.forEach((move, index) => {
      const item = document.createElement('div');
      const isActive = index === currentIndex;
      const isFuture = index > currentIndex;

      item.className = 'history-item';
      if (isActive) item.classList.add('active');
      if (isFuture) item.classList.add('future');

      const player = index % 2 === 0 ? 'X' : 'O';
      const moveNotation = this.getMoveNotation(move);

      item.innerHTML = `<span class="move-number">${index + 1}.</span> <span class="move-player ${player.toLowerCase()}">${player}</span> ${moveNotation}`;
      item.addEventListener('click', () => this.goToMove(index));

      this.historyListElement.appendChild(item);
    });

    // Scroll to active item
    const activeItem = this.historyListElement.querySelector('.history-item.active');
    if (activeItem) {
      activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  private getMoveNotation(move: GlobalPosition): string {
    // Notation: board position (row, col) -> cell position (row, col)
    // Using chess-like notation: a1-i9 style or simple coordinates
    const boardLetter = String.fromCharCode(97 + move.boardCol); // a, b, c
    const boardNum = 3 - move.boardRow; // 3, 2, 1
    const cellLetter = String.fromCharCode(97 + move.cellCol);
    const cellNum = 3 - move.cellRow;
    return `${boardLetter}${boardNum}:${cellLetter}${cellNum}`;
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

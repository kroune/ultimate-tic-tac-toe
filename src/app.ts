import { GameEngine, GameState, Player, GlobalPosition } from './lib/ultimate-tic-tac-toe';

type GameMode = 'friend' | 'bot';

interface WorkerResponse {
  type: 'result';
  id: number;
  move: GlobalPosition | null;
  score: number;
}

class UltimateTicTacToeUI {
  private engine: GameEngine;
  private aiWorker: Worker;
  private aiRequestId: number = 0;
  private pendingAIRequests: Map<number, (move: GlobalPosition | null) => void> = new Map();
  private aiDepth: number = 4;
  private hintDepth: number = 6;
  private gameMode: GameMode = 'friend';
  private humanPlayer: Player = 'X';
  private isThinking: boolean = false;
  private hintMove: GlobalPosition | null = null;
  private hintTimeoutId: number | null = null;
  private hoveredCell: GlobalPosition | null = null;

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

  // New elements for bot mode
  private modeFriendBtn: HTMLButtonElement;
  private modeBotBtn: HTMLButtonElement;
  private botSettingsElement: HTMLElement;
  private botDifficultyInput: HTMLInputElement;
  private playerSideSelect: HTMLSelectElement;
  private hintBtn: HTMLButtonElement;
  private thinkingIndicator: HTMLElement;
  private hintDepthInput: HTMLInputElement;
  private modalCloseBtn: HTMLButtonElement;

  constructor() {
    this.engine = new GameEngine();
    this.aiWorker = new Worker('./js/ai-worker.js');
    this.setupWorkerListener();

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

    // New elements for bot mode
    this.modeFriendBtn = document.getElementById('mode-friend') as HTMLButtonElement;
    this.modeBotBtn = document.getElementById('mode-bot') as HTMLButtonElement;
    this.botSettingsElement = document.getElementById('bot-settings')!;
    this.botDifficultyInput = document.getElementById('bot-difficulty') as HTMLInputElement;
    this.playerSideSelect = document.getElementById('player-side') as HTMLSelectElement;
    this.hintBtn = document.getElementById('hint-btn') as HTMLButtonElement;
    this.thinkingIndicator = document.getElementById('thinking-indicator')!;
    this.hintDepthInput = document.getElementById('hint-depth') as HTMLInputElement;
    this.modalCloseBtn = document.getElementById('modal-close-btn') as HTMLButtonElement;

    this.loadFromURL();
    this.setupEventListeners();
    this.render();
  }

  private loadFromURL(): void {
    const params = new URLSearchParams(window.location.search);
    const gameState = params.get('g');
    const mode = params.get('mode');
    const botDepth = params.get('botDepth');
    const side = params.get('side');

    if (gameState) {
      const restored = GameEngine.fromEncodedMoves(gameState);
      if (restored) {
        this.engine = restored;
      }
    }

    // Load game mode from URL
    if (mode === 'bot') {
      this.gameMode = 'bot';
      this.modeFriendBtn.classList.remove('active');
      this.modeBotBtn.classList.add('active');
      this.botSettingsElement.hidden = false;
    }

    // Load bot depth from URL
    if (botDepth) {
      const depth = parseInt(botDepth);
      if (!isNaN(depth) && depth >= 1 && depth <= 50) {
        this.aiDepth = depth;
        this.botDifficultyInput.value = depth.toString();
      }
    }

    // Load human player side from URL
    if (side === 'O') {
      this.humanPlayer = 'O';
      this.playerSideSelect.value = 'O';
    }

    // Load hint depth from localStorage
    const savedHintDepth = localStorage.getItem('hintDepth');
    if (savedHintDepth) {
      const depth = parseInt(savedHintDepth);
      if (!isNaN(depth) && depth >= 1 && depth <= 12) {
        this.hintDepth = depth;
        this.hintDepthInput.value = depth.toString();
      }
    }
  }

  private setupWorkerListener(): void {
    this.aiWorker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { id, move } = event.data;
      const resolver = this.pendingAIRequests.get(id);
      if (resolver) {
        this.pendingAIRequests.delete(id);
        resolver(move);
      }
    };
  }

  private requestAIMove(depth: number): Promise<GlobalPosition | null> {
    return new Promise((resolve) => {
      const id = ++this.aiRequestId;
      this.pendingAIRequests.set(id, resolve);

      this.aiWorker.postMessage({
        type: 'getBestMove',
        id,
        encodedState: this.engine.encodeForURL(),
        maxDepth: depth,
      });
    });
  }

  private updateURL(): void {
    const params = new URLSearchParams();

    const encoded = this.engine.encodeForURL();
    if (encoded) {
      params.set('g', encoded);
    }

    // Save game mode
    if (this.gameMode === 'bot') {
      params.set('mode', 'bot');
      params.set('botDepth', this.aiDepth.toString());
      params.set('side', this.humanPlayer);
    }

    const queryString = params.toString();
    const newURL = queryString
      ? `${window.location.pathname}?${queryString}`
      : window.location.pathname;

    window.history.replaceState(null, '', newURL);
  }

  private setupEventListeners(): void {
    document.getElementById('reset-btn')!.addEventListener('click', () => this.resetGame());
    document.getElementById('new-game-btn')!.addEventListener('click', () => this.resetGame());

    // Modal close handlers
    this.modalCloseBtn.addEventListener('click', () => this.closeModal());
    this.modalElement.addEventListener('click', (e) => {
      if (e.target === this.modalElement) {
        this.closeModal();
      }
    });

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

    // Game mode switching
    this.modeFriendBtn.addEventListener('click', () => this.setGameMode('friend'));
    this.modeBotBtn.addEventListener('click', () => this.setGameMode('bot'));

    // Bot settings
    this.botDifficultyInput.addEventListener('change', () => {
      const depth = parseInt(this.botDifficultyInput.value) || 4;
      this.aiDepth = Math.max(1, Math.min(81, depth));
      this.updateURL();
    });

    // Hint depth settings
    this.hintDepthInput.addEventListener('change', () => {
      const depth = parseInt(this.hintDepthInput.value) || 6;
      this.hintDepth = Math.max(1, Math.min(12, depth));
      localStorage.setItem('hintDepth', this.hintDepth.toString());
    });

    this.playerSideSelect.addEventListener('change', () => {
      this.humanPlayer = this.playerSideSelect.value as Player;
      this.updateURL();
      this.resetGame();
    });

    // Hint button
    this.hintBtn.addEventListener('click', () => this.showHint());
  }

  private setGameMode(mode: GameMode): void {
    if (this.gameMode === mode) return;

    this.gameMode = mode;
    this.modeFriendBtn.classList.toggle('active', mode === 'friend');
    this.modeBotBtn.classList.toggle('active', mode === 'bot');
    this.botSettingsElement.hidden = mode === 'friend';

    // Don't reset the game, just update UI and check if bot needs to move
    this.render();
    this.updateURL();

    // If switching to bot mode and it's bot's turn, make bot move
    if (mode === 'bot' && !this.engine.isGameOver()) {
      const currentPlayer = this.engine.getCurrentPlayer();
      if (currentPlayer !== this.humanPlayer) {
        this.makeBotMove();
      }
    }
  }

  private async showHint(): Promise<void> {
    if (this.isThinking || this.engine.isGameOver()) return;

    // Clear any existing hint timeout
    if (this.hintTimeoutId !== null) {
      clearTimeout(this.hintTimeoutId);
      this.hintTimeoutId = null;
    }

    // If hint is already shown, just clear it
    if (this.hintMove !== null) {
      this.hintMove = null;
      this.render();
      return;
    }

    this.setThinking(true);

    const bestMove = await this.requestAIMove(this.hintDepth);

    this.setThinking(false);

    if (bestMove) {
      this.hintMove = bestMove;
      this.render();

      // Auto-clear hint after 5 seconds
      this.hintTimeoutId = window.setTimeout(() => {
        if (this.hintMove) {
          this.hintMove = null;
          this.render();
        }
        this.hintTimeoutId = null;
      }, 5000);
    }
  }

  private clearHint(): void {
    if (this.hintTimeoutId !== null) {
      clearTimeout(this.hintTimeoutId);
      this.hintTimeoutId = null;
    }
    this.hintMove = null;
  }

  private setThinking(thinking: boolean): void {
    this.isThinking = thinking;
    this.thinkingIndicator.classList.toggle('visible', thinking);
    this.hintBtn.disabled = thinking;
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
    this.clearHint();
    this.modalElement.hidden = true;
    this.render();
    this.updateURL();

    // If bot plays first (human is O), make bot move
    if (this.gameMode === 'bot' && this.humanPlayer === 'O') {
      this.makeBotMove();
    }
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

    // Highlight all playable boards when free move is available
    if (state.activeBoard === null && boardStatus.type === 'playing' && !state.isGameOver) {
      smallBoard.classList.add('free-move-highlight');
    }


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
        // Use current player's color for active board highlight
        const currentPlayer = state.currentPlayer.toLowerCase();
        smallBoard.classList.add('active', `active-${currentPlayer}`);
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

    // Check if this cell is the hint cell
    if (this.hintMove &&
        this.hintMove.boardRow === boardRow &&
        this.hintMove.boardCol === boardCol &&
        this.hintMove.cellRow === cellRow &&
        this.hintMove.cellCol === cellCol) {
      cell.classList.add('hint-highlight');
    }

    // Check if this is the last move
    const lastMove = this.engine.getLastMove();
    if (lastMove &&
        lastMove.boardRow === boardRow &&
        lastMove.boardCol === boardCol &&
        lastMove.cellRow === cellRow &&
        lastMove.cellCol === cellCol) {
      // Cell already has x or o class from occupied state, last-move styling uses that
      cell.classList.add('last-move');
    }

    if (cellState !== null) {
      cell.textContent = cellState;
      cell.classList.add('occupied', cellState.toLowerCase());
    } else if (boardPlayable && !this.isThinking) {
      // Add hover preview functionality
      cell.addEventListener('mouseenter', () => {
        this.showPreview(boardRow, boardCol, cellRow, cellCol, state.currentPlayer);
      });
      cell.addEventListener('mouseleave', () => {
        this.hidePreview();
      });
      cell.addEventListener('click', () => this.handleCellClick(boardRow, boardCol, cellRow, cellCol));
    }

    return cell;
  }

  private showPreview(boardRow: number, boardCol: number, cellRow: number, cellCol: number, player: Player): void {
    this.hoveredCell = { boardRow, boardCol, cellRow, cellCol };

    // Find the hovered cell and add preview
    const cell = this.boardElement.querySelector(
      `.cell[data-board-row="${boardRow}"][data-board-col="${boardCol}"][data-cell-row="${cellRow}"][data-cell-col="${cellCol}"]`
    ) as HTMLElement;
    if (cell && !cell.classList.contains('occupied')) {
      cell.textContent = player;
      cell.classList.add('preview', player.toLowerCase());
    }

    // Update target board highlight
    this.updateTargetBoardHighlight(cellRow, cellCol);
  }

  private hidePreview(): void {
    if (!this.hoveredCell) return;

    const { boardRow, boardCol, cellRow, cellCol } = this.hoveredCell;

    // Remove preview from the cell
    const cell = this.boardElement.querySelector(
      `.cell[data-board-row="${boardRow}"][data-board-col="${boardCol}"][data-cell-row="${cellRow}"][data-cell-col="${cellCol}"]`
    ) as HTMLElement;
    if (cell && cell.classList.contains('preview')) {
      cell.textContent = '';
      cell.classList.remove('preview', 'x', 'o');
    }

    // Remove target board highlights
    this.clearTargetBoardHighlight();

    this.hoveredCell = null;
  }

  private updateTargetBoardHighlight(targetBoardRow: number, targetBoardCol: number): void {
    // Clear previous highlights
    this.clearTargetBoardHighlight();

    const state = this.engine.getGameState();
    if (state.isGameOver) return;

    // Target board is where the OPPONENT will play, so use opponent's color
    const opponentColor = state.currentPlayer === 'X' ? 'o' : 'x';
    const targetStatus = state.globalBoard[targetBoardRow][targetBoardCol];

    if (targetStatus.type === 'playing') {
      // Highlight specific target board
      const targetBoard = this.boardElement.querySelector(
        `.small-board[data-board-row="${targetBoardRow}"][data-board-col="${targetBoardCol}"]`
      );
      if (targetBoard) {
        targetBoard.classList.add(`target-board-highlight-${opponentColor}`);
      }
    } else {
      // Target is blocked - highlight all playable boards
      this.boardElement.querySelectorAll('.small-board').forEach((board) => {
        const bRow = parseInt((board as HTMLElement).dataset.boardRow!);
        const bCol = parseInt((board as HTMLElement).dataset.boardCol!);
        const bStatus = state.globalBoard[bRow][bCol];
        if (bStatus.type === 'playing') {
          board.classList.add(`target-free-highlight-${opponentColor}`);
        }
      });
    }
  }

  private clearTargetBoardHighlight(): void {
    this.boardElement.querySelectorAll('.small-board').forEach((board) => {
      board.classList.remove(
        'target-board-highlight-x', 'target-board-highlight-o',
        'target-free-highlight-x', 'target-free-highlight-o'
      );
    });
  }

  private handleCellClick(boardRow: number, boardCol: number, cellRow: number, cellCol: number): void {
    if (this.isThinking) return;

    // In bot mode, only allow human player's turn
    if (this.gameMode === 'bot') {
      const state = this.engine.getGameState();
      if (state.currentPlayer !== this.humanPlayer) return;
    }

    this.clearHint();
    this.hoveredCell = null;
    const result = this.engine.makeMove(boardRow, boardCol, cellRow, cellCol);

    if (result.success) {
      this.render();
      this.updateURL();

      if (this.engine.isGameOver()) {
        this.showGameOverModal();
      } else if (this.gameMode === 'bot') {
        // Bot's turn
        this.makeBotMove();
      }
    }
  }

  private async makeBotMove(): Promise<void> {
    if (this.engine.isGameOver() || this.isThinking) return;

    this.setThinking(true);

    const bestMove = await this.requestAIMove(this.aiDepth);

    if (bestMove) {
      const { boardRow, boardCol, cellRow, cellCol } = bestMove;
      this.engine.makeMove(boardRow, boardCol, cellRow, cellCol);
    }

    this.setThinking(false);
    this.render();
    this.updateURL();

    if (this.engine.isGameOver()) {
      this.showGameOverModal();
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

  private closeModal(): void {
    this.modalElement.hidden = true;
  }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new UltimateTicTacToeUI();
});

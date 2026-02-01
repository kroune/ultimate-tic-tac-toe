/**
 * Web Worker for AI calculations.
 * Runs minimax search off the main thread to prevent UI freezing.
 */

import { GameEngine, AIPlayer } from './lib/ultimate-tic-tac-toe';

interface WorkerMessage {
  type: 'getBestMove';
  id: number;
  encodedState: string;
  maxDepth: number;
}

interface WorkerResponse {
  type: 'result';
  id: number;
  move: {
    boardRow: number;
    boardCol: number;
    cellRow: number;
    cellCol: number;
  } | null;
  score: number;
}

// Create AI player instance in worker
let aiPlayer: AIPlayer | null = null;

function getAIPlayer(maxDepth: number): AIPlayer {
  if (!aiPlayer || aiPlayer.getMaxDepth() !== maxDepth) {
    aiPlayer = new AIPlayer({ maxDepth });
  }
  return aiPlayer;
}

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, id, encodedState, maxDepth } = event.data;

  if (type === 'getBestMove') {
    try {
      // Restore game state from encoded moves
      const engine = GameEngine.fromEncodedMoves(encodedState);

      if (!engine) {
        // If no encoded state, create fresh game
        const freshEngine = new GameEngine();
        const ai = getAIPlayer(maxDepth);
        const result = ai.getBestMove(freshEngine);

        const response: WorkerResponse = {
          type: 'result',
          id,
          move: result ? result.move : null,
          score: result ? result.score : 0,
        };
        self.postMessage(response);
        return;
      }

      const ai = getAIPlayer(maxDepth);
      const result = ai.getBestMove(engine);

      const response: WorkerResponse = {
        type: 'result',
        id,
        move: result ? result.move : null,
        score: result ? result.score : 0,
      };
      self.postMessage(response);
    } catch (error) {
      const response: WorkerResponse = {
        type: 'result',
        id,
        move: null,
        score: 0,
      };
      self.postMessage(response);
    }
  }
};


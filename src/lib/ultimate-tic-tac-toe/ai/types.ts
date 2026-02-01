/**
 * AI Module Types for Ultimate Tic-Tac-Toe
 */

import { GlobalPosition } from '../types';

/** Конфигурация AI */
export interface AIConfig {
  /** Глубина поиска (рекомендовано 4-8) */
  maxDepth: number;
  /** Включить кэширование позиций */
  useTranspositionTable: boolean;
  /** Лимит записей в таблице (по умолчанию 100000) */
  maxTableSize?: number;
}

/** Тип границы для транспозиционной таблицы */
export type BoundType = 'exact' | 'lower' | 'upper';

/** Запись в транспозиционной таблице */
export interface TranspositionEntry {
  /** Оценка позиции */
  score: number;
  /** Глубина на которой получена оценка */
  depth: number;
  /** Тип границы (для alpha-beta) */
  boundType: BoundType;
  /** Лучший ход из этой позиции */
  bestMove: GlobalPosition | null;
}

/** Результат поиска лучшего хода */
export interface AIMove {
  /** Координаты хода */
  move: GlobalPosition;
  /** Оценка хода */
  score: number;
}

/** Статистика поиска (для отладки/тестов) */
export interface SearchStats {
  /** Количество посещённых узлов */
  nodesVisited: number;
  /** Попадания в кэш */
  cacheHits: number;
  /** Количество отсечений */
  cutoffs: number;
}


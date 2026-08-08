/**
 * Shared renderer session state (mutable, single source of truth).
 */

import { DEFAULT_DELIMITER } from '../domain/parse.js';

/** @type {import('../domain/parse.js').Delimiter} */
const defaultDelim = { ...DEFAULT_DELIMITER };

export const state = {
  /** @type {object | null} */
  current: null,
  /** @type {Record<string, string>} */
  fillValues: {},
  /** @type {'empty'|'editor'|'fill'|'history'} */
  view: 'empty',
  /** @type {string | null} */
  selectedHistoryId: null,
  /** @type {string | null} */
  activeSlot: null,
  /** @type {string[]} */
  slotLabels: [],
  showArchived: false,
  /** @type {string | null} */
  openMenuId: null,
  /** @type {{ open: string, close: string, id?: string }} */
  activeDelimiter: { ...defaultDelim },
  slotInsertOpen: false,
};

/** Late-bound actions (breaks circular imports between surfaces). */
export const actions = {
  /** @type {(id: string) => Promise<void>} */
  openTemplate: async () => {},
  /** @type {() => Promise<void>} */
  goHome: async () => {},
  /** @type {() => Promise<void>} */
  renderPinnedHome: async () => {},
  /** @type {() => Promise<any>} */
  refreshList: async () => [],
  /** @type {() => void} */
  syncArchiveToggle: () => {},
};

export function api() {
  return window.templateit;
}

export function resetSessionFields() {
  state.current = null;
  state.fillValues = {};
  state.activeSlot = null;
  state.selectedHistoryId = null;
  state.slotLabels = [];
}

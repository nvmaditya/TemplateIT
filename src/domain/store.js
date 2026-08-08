/**
 * Local JSON persistence for templates + history.
 * Injectable baseDir so tests and Electron main share the same module.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createTemplate, updateTemplate } from './templates.js';
import { appendHistory, createHistoryEntry, listHistoryForTemplate } from './history.js';

const TEMPLATES_FILE = 'templates.json';
const HISTORY_FILE = 'history.json';

/**
 * @param {string} baseDir
 */
export function createStore(baseDir) {
  if (!baseDir) {
    throw new Error('baseDir is required');
  }

  function ensureDir() {
    fs.mkdirSync(baseDir, { recursive: true });
  }

  function readJson(file, fallback) {
    ensureDir();
    const full = path.join(baseDir, file);
    try {
      const raw = fs.readFileSync(full, 'utf8');
      return JSON.parse(raw);
    } catch (err) {
      if (err && (err.code === 'ENOENT' || err.name === 'SyntaxError')) {
        return fallback;
      }
      throw err;
    }
  }

  function writeJson(file, data) {
    ensureDir();
    const full = path.join(baseDir, file);
    const tmp = full + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, full);
  }

  function listTemplates() {
    const list = readJson(TEMPLATES_FILE, []);
    return Array.isArray(list) ? list : [];
  }

  function saveTemplates(list) {
    writeJson(TEMPLATES_FILE, list);
  }

  function listAllHistory() {
    const list = readJson(HISTORY_FILE, []);
    return Array.isArray(list) ? list : [];
  }

  function saveHistory(list) {
    writeJson(HISTORY_FILE, list);
  }

  return {
    baseDir,

    listTemplates() {
      return listTemplates().slice().sort((a, b) =>
        a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0
      );
    },

    getTemplate(id) {
      return listTemplates().find((t) => t.id === id) || null;
    },

    /**
     * @param {{ title?: string, body?: string }} data
     */
    createTemplate(data = {}) {
      const t = createTemplate(data);
      const list = listTemplates();
      list.push(t);
      saveTemplates(list);
      return t;
    },

    /**
     * @param {string} id
     * @param {{ title?: string, body?: string }} patch
     */
    updateTemplate(id, patch) {
      const list = listTemplates();
      const idx = list.findIndex((t) => t.id === id);
      if (idx === -1) return null;
      const next = updateTemplate(list[idx], patch);
      list[idx] = next;
      saveTemplates(list);
      return next;
    },

    deleteTemplate(id) {
      const list = listTemplates().filter((t) => t.id !== id);
      saveTemplates(list);
      const hist = listAllHistory().filter((h) => h.templateId !== id);
      saveHistory(hist);
      return true;
    },

    listHistory(templateId) {
      return listHistoryForTemplate(listAllHistory(), templateId);
    },

    /**
     * Save a fill version. Does not modify template body.
     * @param {string} templateId
     * @param {{ values: Record<string, string>, filledText: string, note?: string }} payload
     */
    saveHistoryEntry(templateId, payload) {
      const template = listTemplates().find((t) => t.id === templateId);
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }
      const bodyBefore = template.body;
      const entry = createHistoryEntry({
        templateId,
        values: payload.values || {},
        filledText: payload.filledText,
        note: payload.note,
      });
      const next = appendHistory(listAllHistory(), entry);
      saveHistory(next);
      // Assert immutability of template body after write
      const still = listTemplates().find((t) => t.id === templateId);
      if (!still || still.body !== bodyBefore) {
        throw new Error('Invariant violated: template body changed after history save');
      }
      return entry;
    },

    getHistoryEntry(id) {
      return listAllHistory().find((h) => h.id === id) || null;
    },
  };
}

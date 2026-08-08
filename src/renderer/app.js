/**
 * TemplateIT renderer entry — wires surfaces, does not own feature logic.
 */

import { $, $$, setView, showToast } from './dom.js';
import { bindModal } from './modal.js';
import { registerHomeActions, goHome } from './home.js';
import {
  registerLibraryActions,
  bindLibraryChrome,
  refreshList,
} from './library.js';
import { initSlotInsert } from './slots.js';
import { registerEditorActions, createNew, saveCurrent } from './editor.js';
import {
  enterFill,
  onSlotEditorInput,
  copyFilled,
  saveVersion,
} from './fill.js';
import {
  openHistory,
  copyHistory,
  deleteSelectedHistory,
} from './history-view.js';
import { api, state } from './state.js';

function bind() {
  registerHomeActions();
  registerLibraryActions();
  registerEditorActions();

  $$('[data-action="new"]').forEach((el) =>
    el.addEventListener('click', createNew)
  );
  $('#btn-home').addEventListener('click', goHome);
  $('#btn-save').addEventListener('click', saveCurrent);
  $('#btn-fill').addEventListener('click', async () => {
    await saveCurrent();
    enterFill();
  });
  $('#btn-back-editor').addEventListener('click', () =>
    setView('editor', state)
  );
  $('#btn-back-editor-from-hist').addEventListener('click', () =>
    setView('editor', state)
  );
  $('#btn-history').addEventListener('click', openHistory);
  $('#btn-copy').addEventListener('click', copyFilled);
  $('#btn-save-version').addEventListener('click', saveVersion);
  $('#btn-copy-history').addEventListener('click', copyHistory);
  $('#btn-delete-history').addEventListener('click', deleteSelectedHistory);
  $('#slot-editor').addEventListener('input', onSlotEditorInput);

  bindModal();
  bindLibraryChrome();
  initSlotInsert();
}

async function boot() {
  if (!api()) {
    document.body.innerHTML =
      '<p style="color:#fff;padding:2rem;font-family:sans-serif">TemplateIT must run inside Electron (<code>npm start</code>).</p>';
    return;
  }
  bind();
  await refreshList();
  await goHome();
}

boot().catch((err) => {
  console.error(err);
  showToast(String(err.message || err));
});

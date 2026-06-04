import './popup.css';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import {
  getApiKey,
  saveApiKey,
  getSummaries,
  saveSummary,
  deleteSummary,
  clearHistory,
  calculateCost,
  type SummaryRecord,
} from '../utils/storage';
import { fetchArticle, isMediumUrl, extractTitleFromUrl, cleanArticleText } from '../utils/scraper';
import { summarize } from '../utils/claude';

// Configure marked for safe rendering
marked.setOptions({ breaks: true });

// ── DOM helpers ──────────────────────────────────────────────────
function $<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Element #${id} not found`);
  return el as T;
}

function show(id: string) { $<HTMLElement>(id).classList.remove('hidden'); }
function hide(id: string) { $<HTMLElement>(id).classList.add('hidden'); }
function text(id: string, value: string) { $<HTMLElement>(id).textContent = value; }

// ── Tab navigation ───────────────────────────────────────────────
function initTabs(): void {
  document.querySelectorAll<HTMLButtonElement>('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset['tab'];
      if (!tab) return;

      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${tab}`)?.classList.add('active');

      if (tab === 'history') loadHistory();
      if (tab === 'settings') initSettings();
    });
  });
}

// ── Summarize tab ────────────────────────────────────────────────
let currentUrl = '';
let currentTitle = '';

async function initSummarizeTab(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) {
    showNotMedium();
    return;
  }

  currentUrl = tab.url;

  if (!isMediumUrl(currentUrl)) {
    showNotMedium();
    return;
  }

  // Try to get title from content script
  try {
    const response = await chrome.tabs.sendMessage(tab.id!, { type: 'GET_ARTICLE_TITLE' });
    currentTitle = (response as { title: string })?.title || extractTitleFromUrl(currentUrl);
  } catch {
    currentTitle = extractTitleFromUrl(currentUrl);
  }

  text('article-title', currentTitle);
  show('article-card');

  const apiKey = await getApiKey();
  const btn = $<HTMLButtonElement>('summarize-btn');
  show('summarize-btn');

  if (!apiKey) {
    btn.disabled = true;
    btn.title = 'Set your API key in Settings tab';
    showError('Set your API key in Settings tab');
    return;
  }

  btn.disabled = false;
  btn.addEventListener('click', () => void runSummarize(apiKey));
}

function showNotMedium(): void {
  show('not-medium');
}

function setStatus(msg: string): void {
  show('status-row');
  text('status-text', msg);
}

function showError(msg: string): void {
  hide('status-row');
  text('error-text', msg);
  show('error-box');
}

function hideError(): void {
  hide('error-box');
}

// Try to read article text directly from the open tab via content script
async function getTextFromPage(): Promise<{ text: string; title: string } | null> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return null;
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_ARTICLE_TEXT' }) as
      { text: string; title: string } | undefined;
    if (response?.text && response.text.split(/\s+/).length >= 150) {
      return response;
    }
    return null;
  } catch {
    return null;
  }
}

async function runSummarize(apiKey: string): Promise<void> {
  hideError();
  hide('result-container');

  const btn = $<HTMLButtonElement>('summarize-btn');
  btn.disabled = true;

  if (!/^sk-ant-[a-zA-Z0-9\-_]{20,}$/.test(apiKey)) {
    showError('API key format looks wrong — it should start with "sk-ant-" followed by at least 20 characters. Check your Settings tab.');
    btn.disabled = false;
    return;
  }

  try {
    let articleText = '';
    let sourceLabel = '';

    // 1. Try reading directly from the open page (fastest, no network needed)
    setStatus('Reading article from page...');
    const fromPage = await getTextFromPage();

    if (fromPage) {
      articleText = fromPage.text;
      sourceLabel = 'Current tab';
      if (fromPage.title) {
        currentTitle = fromPage.title;
        text('article-title', currentTitle);
      }
    } else {
      // 2. Fall back to proxy waterfall
      setStatus('Fetching article via proxy...');
      try {
        const fetchResult = await fetchArticle(currentUrl);
        articleText = fetchResult.text;
        sourceLabel = fetchResult.proxyName;
      } catch {
        throw new Error('PROXY_FAIL');
      }
    }

    // Strip noise and hard-cap at 2500 words before sending to Claude
    articleText = cleanArticleText(articleText);

    if (articleText.split(/\s+/).length < 50) {
      throw new Error('TOO_SHORT');
    }

    const result = await summarize(articleText, apiKey, (status) => setStatus(status));

    hide('status-row');

    const cost = calculateCost(result.inputTokens, result.outputTokens);
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const proxyBadge = $<HTMLElement>('proxy-badge');
    proxyBadge.textContent = `✓ ${sourceLabel}`;
    show('proxy-badge');

    text('cost-badge', `💰 ~$${cost.toFixed(4)}`);
    text('time-badge', `🕐 ${timeStr}`);

    const resultBox = $<HTMLElement>('result-box');
    resultBox.innerHTML = DOMPurify.sanitize(await marked.parse(result.summary));
    show('result-container');
    resultBox.scrollTop = 0;

    await saveSummary({
      id: Date.now().toString(),
      title: currentTitle,
      url: currentUrl,
      summary: result.summary,
      timestamp: Date.now(),
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      estimatedCost: cost,
    });

  } catch (err) {
    hide('status-row');
    showError(mapErrorMessage((err as Error).message));
  } finally {
    btn.disabled = false;
  }
}

function mapErrorMessage(msg: string): string {
  if (msg === 'TOO_SHORT') return 'Article too short to summarize';
  if (msg === 'PROXY_FAIL') return 'Article unavailable. Try opening it manually';
  if (msg.includes('PROXY_FAIL') || msg.includes('All proxies failed'))
    return "Couldn't fetch article. Retrying...";
  if (msg === 'AUTH_ERROR' || msg.includes('AUTH_ERROR'))
    return 'API key rejected (401). Re-enter your key in Settings — copy it fresh from console.anthropic.com';
  if (msg === 'RATE_LIMIT' || msg.includes('RATE_LIMIT'))
    return 'Rate limit hit. Wait a moment and retry';
  if (msg === 'SERVER_ERROR' || msg.includes('SERVER_ERROR'))
    return 'Claude is unavailable. Try again shortly';
  return msg || 'Something went wrong. Please try again';
}

function initCopyButton(): void {
  $<HTMLButtonElement>('copy-btn').addEventListener('click', async () => {
    const resultBox = $<HTMLElement>('result-box');
    const text = resultBox.innerText;
    await navigator.clipboard.writeText(text);
    const btn = $<HTMLButtonElement>('copy-btn');
    btn.textContent = '✅ Copied!';
    setTimeout(() => { btn.textContent = '📋 Copy'; }, 1500);
  });
}

function initRetryButton(): void {
  $<HTMLButtonElement>('retry-btn').addEventListener('click', async () => {
    const apiKey = await getApiKey();
    if (apiKey) {
      hideError();
      void runSummarize(apiKey);
    }
  });
}

// ── History tab ──────────────────────────────────────────────────
async function loadHistory(): Promise<void> {
  const summaries = await getSummaries();
  const countEl = $<HTMLElement>('history-count');
  const emptyEl = $<HTMLElement>('history-empty');
  const listEl = $<HTMLElement>('history-list');

  countEl.textContent = `${summaries.length} summar${summaries.length === 1 ? 'y' : 'ies'}`;

  if (summaries.length === 0) {
    show('history-empty');
    hide('history-list');
    return;
  }

  hide('history-empty');
  show('history-list');
  listEl.innerHTML = '';

  summaries.forEach((record) => {
    listEl.appendChild(buildHistoryItem(record));
  });
}

function buildHistoryItem(record: SummaryRecord): HTMLElement {
  const date = new Date(record.timestamp);
  const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const item = document.createElement('div');
  item.className = 'history-item';
  item.dataset['id'] = record.id;
  item.innerHTML = `
    <div class="history-item-header">
      <div class="history-item-info">
        <div class="history-item-title">${escapeHtml(record.title)}</div>
        <div class="history-item-meta">
          <span>${dateStr} ${timeStr}</span>
          <span>💰 $${record.estimatedCost.toFixed(4)}</span>
        </div>
      </div>
      <div class="history-item-actions">
        <button class="btn-icon delete" title="Delete" data-action="delete">🗑</button>
        <span class="history-chevron">▼</span>
      </div>
    </div>
    <div class="history-item-body">
      <div class="result-box" style="max-height:200px;"></div>
    </div>
  `;

  const header = item.querySelector('.history-item-header')!;
  const body = item.querySelector('.history-item-body')!;
  const resultBox = body.querySelector('.result-box')!;
  const deleteBtn = item.querySelector('[data-action="delete"]')!;

  header.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('[data-action="delete"]')) return;
    const isExpanded = item.classList.toggle('expanded');
    if (isExpanded) {
      resultBox.innerHTML = DOMPurify.sanitize(marked.parse(record.summary) as string);
    }
  });

  deleteBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    await deleteSummary(record.id);
    item.remove();
    await refreshHistoryCount();
  });

  return item;
}

async function refreshHistoryCount(): Promise<void> {
  const summaries = await getSummaries();
  $<HTMLElement>('history-count').textContent =
    `${summaries.length} summar${summaries.length === 1 ? 'y' : 'ies'}`;
  if (summaries.length === 0) {
    show('history-empty');
    hide('history-list');
  }
}

function initClearAllButton(): void {
  $<HTMLButtonElement>('clear-all-btn').addEventListener('click', async () => {
    await clearHistory();
    await loadHistory();
  });
}

// ── Settings tab ─────────────────────────────────────────────────
async function initSettings(): Promise<void> {
  const input = $<HTMLInputElement>('api-key-input');
  const existingKey = await getApiKey();

  if (existingKey) {
    input.value = existingKey;
    setKeyStatus(true);
  } else {
    setKeyStatus(false);
  }
}

function setKeyStatus(hasKey: boolean): void {
  const dot = $<HTMLElement>('key-status-dot');
  const textEl = $<HTMLElement>('key-status-text');
  if (hasKey) {
    dot.classList.add('green');
    textEl.textContent = 'API key configured ✓';
  } else {
    dot.classList.remove('green');
    textEl.textContent = 'No API key configured';
  }
}

function initSettingsControls(): void {
  $<HTMLButtonElement>('toggle-key-visibility').addEventListener('click', () => {
    const input = $<HTMLInputElement>('api-key-input');
    input.type = input.type === 'password' ? 'text' : 'password';
  });

  $<HTMLButtonElement>('save-key-btn').addEventListener('click', async () => {
    const input = $<HTMLInputElement>('api-key-input');
    const key = input.value.trim();
    const feedback = $<HTMLElement>('save-feedback');

    if (!key) {
      feedback.style.color = 'var(--red)';
      feedback.textContent = 'Please enter a valid API key';
      return;
    }

    await saveApiKey(key);
    setKeyStatus(true);
    feedback.style.color = 'var(--green)';
    feedback.textContent = '✓ Saved successfully';
    setTimeout(() => { feedback.textContent = ''; }, 2500);
  });

  $<HTMLButtonElement>('verify-key-btn').addEventListener('click', async () => {
    const input = $<HTMLInputElement>('api-key-input');
    const key = input.value.trim();
    const resultEl = $<HTMLElement>('verify-result');

    if (!key) {
      resultEl.style.color = 'var(--red)';
      resultEl.textContent = 'Enter a key first.';
      resultEl.classList.remove('hidden');
      return;
    }

    const btn = $<HTMLButtonElement>('verify-key-btn');
    btn.textContent = '...';
    btn.disabled = true;
    resultEl.style.color = 'var(--muted)';
    resultEl.textContent = 'Testing key...';
    resultEl.classList.remove('hidden');

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      });

      const data = await res.json() as { error?: { type: string; message: string }; content?: unknown[] };

      if (res.ok) {
        resultEl.style.color = 'var(--green)';
        resultEl.textContent = '✅ Key works! Your API key is valid.';
      } else {
        resultEl.style.color = 'var(--red)';
        resultEl.textContent = `❌ ${res.status}: ${data.error?.message ?? 'Unknown error'}`;
      }
    } catch (err) {
      resultEl.style.color = 'var(--red)';
      resultEl.textContent = `❌ Network error: ${(err as Error).message}`;
    } finally {
      btn.textContent = 'Verify';
      btn.disabled = false;
    }
  });
}

// ── Utilities ─────────────────────────────────────────────────────
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Bootstrap ────────────────────────────────────────────────────
async function init(): Promise<void> {
  initTabs();
  initCopyButton();
  initRetryButton();
  initClearAllButton();
  initSettingsControls();
  await initSummarizeTab();
}

document.addEventListener('DOMContentLoaded', () => void init());

export interface SummaryRecord {
  id: string;
  title: string;
  url: string;
  summary: string;
  timestamp: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
}

const MAX_HISTORY = 5;

export async function saveApiKey(key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ apiKey: key }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

export async function getApiKey(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['apiKey'], (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result['apiKey'] ?? null);
      }
    });
  });
}

export async function saveSummary(record: SummaryRecord): Promise<void> {
  const summaries = await getSummaries();
  summaries.unshift(record);
  const trimmed = summaries.slice(0, MAX_HISTORY);

  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ summaries: trimmed }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

export async function getSummaries(): Promise<SummaryRecord[]> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['summaries'], (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result['summaries'] ?? []);
      }
    });
  });
}

export async function deleteSummary(id: string): Promise<void> {
  const summaries = await getSummaries();
  const filtered = summaries.filter((s) => s.id !== id);

  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ summaries: filtered }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

export async function clearHistory(): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.remove(['summaries'], () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

export function calculateCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1_000_000) * 3.0;
  const outputCost = (outputTokens / 1_000_000) * 15.0;
  return inputCost + outputCost;
}

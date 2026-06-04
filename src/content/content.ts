function getArticleTitle(): string {
  const h1 = document.querySelector('h1');
  if (h1?.textContent?.trim()) return h1.textContent.trim();

  const metaTitle = document.querySelector('meta[property="og:title"]');
  if (metaTitle instanceof HTMLMetaElement && metaTitle.content) {
    return metaTitle.content;
  }

  return document.title.replace(' – Medium', '').replace(' | Medium', '').trim();
}

function getArticleText(): string {
  // Medium renders article content inside <article> with paragraphs, headings, blockquotes
  const article = document.querySelector('article');
  if (article) {
    const nodes = article.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote');
    const text = Array.from(nodes)
      .map((el) => (el as HTMLElement).innerText?.trim())
      .filter((t) => t && t.length > 0)
      .join('\n\n');
    if (text.length > 300) return text;
  }

  // Fallback: clone body, strip noise, return innerText
  const clone = document.body.cloneNode(true) as HTMLElement;
  clone
    .querySelectorAll('script, style, nav, header, footer, aside, [class*="sidebar"], [class*="paywall"]')
    .forEach((el) => el.remove());
  return clone.innerText?.trim() ?? '';
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return;
  if (message.type === 'GET_ARTICLE_TITLE') {
    sendResponse({ title: getArticleTitle() });
  }
  if (message.type === 'GET_ARTICLE_TEXT') {
    sendResponse({ text: getArticleText(), title: getArticleTitle() });
  }
  return true;
});

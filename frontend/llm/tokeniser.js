import { clearContent, setMessage } from './messages.js';

const API_URL = '/api';

export const TOKEN_COLORS = [
  '#ffd97d', '#a8e6cf', '#a0c4ff', '#ffb3c6',
  '#c9b8e8', '#ffc8a2', '#b5ead7', '#c7f2a4',
];

export function buildTokenizeUrl(text, apiUrl = API_URL) {
  return `${apiUrl}/tokenize?${new URLSearchParams({ text }).toString()}`;
}

export function formatTokenCount(count) {
  return `${count} token${count !== 1 ? 's' : ''}`;
}

export async function fetchTokens(fetchImpl, text, apiUrl = API_URL) {
  const response = await fetchImpl(buildTokenizeUrl(text, apiUrl));
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!Array.isArray(data.tokens)) {
    throw new Error('Invalid token response');
  }

  return data.tokens;
}

export function renderTokens(doc, outputElement, countElement, tokens) {
  clearContent(outputElement);

  tokens.forEach((token, index) => {
    const span = doc.createElement('span');
    span.className = 'token';
    span.style.background = TOKEN_COLORS[index % TOKEN_COLORS.length];
    span.textContent = token;
    outputElement.appendChild(span);
  });

  countElement.textContent = formatTokenCount(tokens.length);
}

export function initTokeniser({
  doc = document,
  fetchImpl = fetch,
  apiUrl = API_URL,
} = {}) {
  const input = doc.getElementById('token-input');
  const output = doc.getElementById('token-output');
  const count = doc.getElementById('token-count');
  const button = doc.getElementById('token-btn');

  if (!input || !output || !count || !button) {
    return null;
  }

  async function handleTokenise() {
    const text = input.value;
    if (text.length === 0) {
      return;
    }

    button.disabled = true;
    setMessage(output, 'status', 'Tokenising…', doc);
    count.textContent = '';

    try {
      const tokens = await fetchTokens(fetchImpl, text, apiUrl);
      renderTokens(doc, output, count, tokens);
    } catch {
      setMessage(output, 'error', 'Something went wrong — please try again.', doc);
      count.textContent = '';
    } finally {
      button.disabled = false;
    }
  }

  button.addEventListener('click', handleTokenise);

  return { handleTokenise };
}

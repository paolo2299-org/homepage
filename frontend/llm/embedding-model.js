const API_URL = '/api';

export function normaliseWord(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function prepareWordSubmission(words, rawValue) {
  const word = normaliseWord(rawValue);

  if (!word) {
    return { ok: false, reason: 'empty', word: '' };
  }

  if (words.includes(word)) {
    return { ok: false, reason: 'duplicate', word };
  }

  return {
    ok: true,
    reason: null,
    word,
    requestWords: [...words, word],
  };
}

export function reconcileWords(words, unknownWords = []) {
  const unknownSet = new Set(unknownWords.map(normaliseWord));
  return words.filter(word => !unknownSet.has(normaliseWord(word)));
}

export function getUnknownWordsMessage(unknownWords) {
  return `Word not found in vocabulary: ${unknownWords.join(', ')}`;
}

export async function fetchEmbeddings(fetchImpl, words, apiUrl = API_URL) {
  const response = await fetchImpl(`${apiUrl}/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ words }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!Array.isArray(data.points) || !Array.isArray(data.unknown)) {
    throw new Error('Invalid embedding response');
  }

  return data;
}

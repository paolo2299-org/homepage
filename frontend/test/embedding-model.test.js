import test from 'node:test';
import assert from 'node:assert/strict';

import {
  fetchEmbeddings,
  getUnknownWordsMessage,
  normaliseWord,
  prepareWordSubmission,
  reconcileWords,
} from '../llm/embedding-model.js';

test('normaliseWord trims and lowercases input', () => {
  assert.equal(normaliseWord('  Queen  '), 'queen');
});

test('prepareWordSubmission blocks duplicate words', () => {
  const result = prepareWordSubmission(['cat'], ' Cat ');

  assert.deepEqual(result, {
    ok: false,
    reason: 'duplicate',
    word: 'cat',
  });
});

test('prepareWordSubmission returns request words for a new entry', () => {
  const result = prepareWordSubmission(['cat'], ' Dog ');

  assert.deepEqual(result, {
    ok: true,
    reason: null,
    word: 'dog',
    requestWords: ['cat', 'dog'],
  });
});

test('reconcileWords removes unknown words case-insensitively', () => {
  assert.deepEqual(
    reconcileWords(['cat', 'Dog', 'fish'], ['dog']),
    ['cat', 'fish'],
  );
});

test('getUnknownWordsMessage formats the API error for display', () => {
  assert.equal(
    getUnknownWordsMessage(['platypus', 'narwhal']),
    'Word not found in vocabulary: platypus, narwhal',
  );
});

test('fetchEmbeddings posts the requested words', async () => {
  let requestUrl;
  let requestOptions;
  const fetchImpl = async (url, options) => {
    requestUrl = url;
    requestOptions = options;

    return {
      ok: true,
      json: async () => ({ points: [], unknown: [] }),
    };
  };

  const response = await fetchEmbeddings(fetchImpl, ['cat', 'dog']);

  assert.equal(requestUrl, '/api/embed');
  assert.deepEqual(JSON.parse(requestOptions.body), { words: ['cat', 'dog'] });
  assert.deepEqual(response, { points: [], unknown: [] });
});

test('fetchEmbeddings rejects malformed responses', async () => {
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ({ points: 'bad', unknown: [] }),
  });

  await assert.rejects(fetchEmbeddings(fetchImpl, ['cat']), /Invalid embedding response/);
});

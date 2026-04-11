import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildTokenizeUrl,
  fetchTokens,
  formatTokenCount,
} from '../llm/tokeniser.js';

test('buildTokenizeUrl encodes query text', () => {
  assert.equal(
    buildTokenizeUrl('hello world & more'),
    '/api/tokenize?text=hello+world+%26+more',
  );
});

test('formatTokenCount pluralises correctly', () => {
  assert.equal(formatTokenCount(1), '1 token');
  assert.equal(formatTokenCount(2), '2 tokens');
});

test('fetchTokens calls the token endpoint and returns tokens', async () => {
  let requestedUrl;
  const fetchImpl = async url => {
    requestedUrl = url;
    return {
      ok: true,
      json: async () => ({ tokens: ['hello', ' world'] }),
    };
  };

  const tokens = await fetchTokens(fetchImpl, 'hello world');

  assert.equal(requestedUrl, '/api/tokenize?text=hello+world');
  assert.deepEqual(tokens, ['hello', ' world']);
});

test('fetchTokens rejects malformed responses', async () => {
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ({ token_ids: [1, 2] }),
  });

  await assert.rejects(fetchTokens(fetchImpl, 'hello'), /Invalid token response/);
});

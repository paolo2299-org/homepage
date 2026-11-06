// Editorial content for the browser session (recordings/2026-11-06T18-29-23-349Z-amazon-single-pan-sonnet55).
// Not part of the recording: phase names, the system-prompt outline and author's notes. steps.js reads EDITORIAL.
'use strict';

const EDITORIAL = {
  // Label for the harness running tools, shown on result cards.
  workspaceLabel: 'Harness · browser',

  // The prompt box shows the task itself; the operating constraints that follow it are left out for readability.
  promptExcerpt: prompt => prompt.split('\n')[0].trim(),

  // Editorial grouping of the model requests.
  phases: ['Load the browser tools', 'Check the open tabs', 'Open a new tab', 'Check the basket is empty', 'Search',
    'Compare candidates', 'Open the product (click fails)', 'Open the product', 'Choose and add to basket',
    'Verify the basket', 'Report back'],

  // The recorded system prompt, in order. Each part starts at the exact recorded text in `start`.
  // Parts marked `quote` are quoted verbatim; the rest show a short label that reveals the verbatim text.
  outline: [
    { start: "You are a Claude agent", quote: true },
    { start: "You are an agent working with the user", quote: true },
    { start: "IMPORTANT: Assist with authorized security", placeholder: 'Security policy' },
    { start: "# Harness", quote: true },
    { start: " - Tools run behind a user-selected permission mode", quote: true },
    { start: " - The system may send updates", placeholder: 'System messages and hooks' },
    { start: " - Text inside <pasted_content>", placeholder: 'Pasted text' },
    { start: " - Prefer the dedicated file/search tools", placeholder: 'Tool preferences' },
    { start: " - Reference code as", placeholder: 'Code references' },
    { start: "# Claude in Chrome browser automation", quote: true },
    { start: "## Loading deferred tools", quote: true },
    { start: "## GIF recording", placeholder: 'GIF recording' },
    { start: "## Console log debugging", placeholder: 'Console log debugging' },
    { start: "## Alerts and dialogs", placeholder: 'Alerts and dialogs' },
    { start: "## Avoid rabbit holes and loops", quote: true },
    { start: "## Tab context and session startup", quote: true },
    { start: "When you use a pronoun", placeholder: 'Pronouns' },
    { start: "For actions that are hard to reverse", quote: true },
    { start: "# Session-specific guidance", placeholder: 'Code-review command' },
    { start: "# Memory", placeholder: 'Memory' },
    { start: "# Environment", placeholder: 'Claude models and products' },
    { start: "# Context management", placeholder: 'Long conversations' },
    { start: "When you have enough information to act, act.", quote: true },
  ],

  // Author's notes keyed by step id.
  notes: ({ S, fmt, totalInput, FIRST_REQUEST }) => {
    const [r1, r2] = S.requests.map(r => totalInput(r.usage));
    const browserTools = S.setup.tools.filter(name => name.startsWith('mcp__')).length;
    const addedChars = S.loadedTools.toolDefinitionChars - S.systemContext.toolDefinitionChars;
    return {
      setup: `Before the model sees anything, the harness sets the rules. It chooses the model, which tools exist, and which tool calls are pre-approved. The harness also writes a system prompt and a description of every tool. Here the browser tools come from the Claude in Chrome extension, connected as an MCP server, and their full descriptions are held back until the model asks for them.`,
      send1: `The first request is ${fmt(FIRST_REQUEST.total)} input tokens, and the task prompt is only about ${fmt(FIRST_REQUEST.prompt)} of them. It carries full definitions for just ${S.systemContext.tools.length} tools; the ${browserTools} browser tools are listed by name only. That keeps the first request small, but the model has to ask for the tools it needs. These sizes are estimates at four characters per token.`,
      use1: `The model's first move has nothing to do with Amazon. It asks ToolSearch for the five browser tools it expects to need, all in one call, as the system prompt tells it to.`,
      res1: `The harness answers with references to the five tools. From the next request on, it includes their full definitions in every request: about ${fmt(addedChars)} more characters of JSON.`,
      send2: `Request 2 grows from ${fmt(r1)} to ${fmt(r2)} tokens: the new tool definitions plus instructions for using the browser tools. Only ${fmt(S.requests[1].usage.cacheRead)} tokens come from the prompt cache. The new definitions sit near the start of the request, so most of what follows them probably has to be processed again.`,
      use2: `The system prompt tells the model to start every browser session by listing the open tabs, and then to work in a new tab rather than reuse one. It does exactly that.`,
      use4: `Before searching, it checks that the basket is empty, as the prompt asked. A browser_batch call bundles several browser actions into one tool call: here, open the basket page, then take a screenshot.`,
      res4: `The screenshot comes back as an image inside the tool result. This is how the model sees the page: it has no other view of the browser.`,
      use5: `It searches with the price filter already in the address (up to £25), so every result it sees is in budget.`,
      text6: `The model narrates as it goes, in short plain-text notes between its tool calls.`,
      use7: `It tries to open the Salter pan's page by clicking at (1680, 400). That point is outside the page: the tool expects coordinates in a 1,512-pixel-wide frame.`,
      res7: `The browser tool rejects the click before doing anything and returns an error, so the rest of the batch never runs. This isn't a permission refusal: the call was allowed, and the tool itself checked the input.`,
      send8: `The model learns about the failed click only now, from the error text in its transcript.`,
      text8: `It works out the right position from the error and tries again, changing only the click.`,
      thinking9: `About ${fmt(Math.round(S.requests[8].blocks[0].durationMs / 100) / 10)} seconds of hidden reasoning before the decision.`,
      'thinking9-2': `The only thinking text the stream exposes: a one-line summary of the decision.`,
      use9: `The prompt asked for a screenshot of the chosen product, so it takes one.`,
      use10: `In the same response it clicks "Add to basket", without waiting to see that screenshot. The click position comes from the product page screenshot in the previous result.`,
      res10: `The click succeeds, but all the model gets back is the click position. It can't yet tell whether the pan was added.`,
      use11: `So the next request is spent checking: screenshot the confirmation, open the basket, screenshot again.`,
      res11: `The two screenshots show "Added to basket" and a basket with one item at £18.75.`,
      text11: `A response with no tool_use block ends with stop_reason end_turn. That is the signal for the harness to stop looping and return this text as the result. The model stopped before checkout, as instructed.`,
      end: `${S.requests.length} model requests and ${S.tools.length} tool calls, one of which failed, took about ${Math.round(S.result.durationMs / 1000)} seconds. The cost is the provider's list price for the tokens, not necessarily what a subscription would charge. The result reports num_turns: ${S.result.numTurns}, which counts something other than the ${S.requests.length} model requests visible in the stream.`,
    };
  },
};

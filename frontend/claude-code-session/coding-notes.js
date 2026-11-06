// Editorial content for the coding session (recordings/2026-10-21T12-12-17-379Z-recipe-type-filter-claude-opus55-medium).
// Not part of the recording: phase names, the system-prompt outline and author's notes. steps.js reads EDITORIAL.
'use strict';

const EDITORIAL = {
  // Label for the harness running tools, shown on result cards.
  workspaceLabel: 'Harness · workspace',

  // The prompt box shows the feature request only; the trailing "Environment:" paragraph is left out for readability.
  promptExcerpt: prompt => prompt.split(/\n\s*\nEnvironment:/)[0].trim(),

  // Editorial grouping of the model requests.
  phases: ['Read the project guide', 'Read the search code', 'Check types, tests and CI', 'Check tests and styles', 'Edit the templates',
    'Find related markup', 'Rewrite the search script', 'Style the controls', 'Prepare to test', 'Write JavaScript tests',
    'Add test wrapper, run all checks', 'Diagnose, try a fix (blocked)', 'Fix with Edit, rerun', 'Report back'],

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
    { start: " - Prefer the dedicated file/search tools", quote: true },
    { start: " - Reference code as", placeholder: 'Code references' },
    { start: "Write code that reads like the surrounding code", quote: true },
    { start: "When you use a pronoun", placeholder: 'Pronouns' },
    { start: "For actions that are hard to reverse", quote: true },
    { start: "# Session-specific guidance", placeholder: 'Code-review command' },
    { start: "# Memory", placeholder: 'Memory' },
    { start: "# Environment", placeholder: 'Claude models and products' },
    { start: "# Context management", placeholder: 'Long conversations' },
    { start: "When you have enough information to act, act.", quote: true },
    { start: "<total_tokens>", placeholder: 'Token budget' },
  ],

  // Author's notes keyed by step id.
  notes: ({ S, fmt, totalInput, FIRST_REQUEST }) => ({
    setup: `Before the model sees anything, the harness sets the rules. It chooses the model, which tools exist, and which tool calls are pre-approved. The harness also writes a system prompt and a description of every tool.`,
    send1: `The first request is ${fmt(FIRST_REQUEST.total)} input tokens, and the task prompt is only about ${fmt(FIRST_REQUEST.prompt)} of them. The harness adds its system prompt (about ${fmt(FIRST_REQUEST.system)} tokens) and the definitions of ${S.systemContext.tools.length} tools (about ${fmt(FIRST_REQUEST.tools)}); the first step breaks both down. That leaves roughly ${fmt(FIRST_REQUEST.uncaptured)} tokens the recording does not capture: other content the harness put in the messages, and anything the provider adds. These sizes are estimates at four characters per token. ${fmt(S.requests[0].usage.cacheRead)} tokens were already in the provider's prompt cache: the harness marks part of its system prompt for caching across sessions, so that prefix was probably cached by earlier runs.`,
    text1: `Plain text the model writes between tool calls. In an interactive session the user would see this as narration.`,
    use1: `The model cannot touch the files. All it can do is write a structured tool_use block naming a tool and its arguments, then stop and wait. It knows nothing about this app yet, so it starts the way a new developer would: list the files, read the Makefile, and look for CLAUDE.md and AGENTS.md, the conventional names for instructions written for coding agents. This project has only AGENTS.md.`,
    res1: `The harness checks the command against the allow-list before running anything. The recorded reason, subcommandResults, suggests it judged each part of the compound command separately. cat and head are not on the allow-list, so it evidently treats plain file reads as safe. Then it runs the command and wraps the output in a tool_result message. Nothing goes back to the model yet.`,
    send2: `The harness sends the whole conversation again, plus the new tool result. The cache field shows this directly: everything from request 1 is read back from cache, and the file listing and AGENTS.md just printed are the new tokens. The transcript is the model's only memory.`,
    use2: `Every file it opens now comes from the listing it just received: the existing search script, the two listing templates and the routes.`,
    thinking3: `The model reasons before acting, but this stream exposes only an empty thinking block carrying an encrypted signature. The harness hands that signature back in later requests so the model can pick up its own reasoning. Nobody outside the provider can read it; the recording only knows how many tokens it took.`,
    use3: `Still reading: how records are typed, how the existing tests check the page, the styles, and the CI workflow that will run the tests.`,
    send5: `Four requests in, the transcript has grown to ${fmt(totalInput(S.requests[4].usage))} tokens, almost all of it files the model has read. It has not changed anything yet.`,
    thinking5: `The longest pause in the run: about 14 seconds of hidden reasoning before the first change.`,
    'thinking5-2': `The only thinking text the stream exposes. The first request asked for thinking display "updates", which lets the model surface short progress notes like this one; everything else it reasoned stays hidden.`,
    use5: `The model edits two templates by running a Python script through Bash, not with the Edit tool. The allow-list permits any python command, so the harness accepts it, even though this writes files just as surely as the sed command that is denied in request 12. Permission rules match the shape of a command, not what it does.`,
    res5: `The script ends by printing git diff --stat, so the model can see its change landed.`,
    use6: `The one time the model uses the dedicated Grep tool instead of grep through Bash.`,
    use7: `Write replaces the whole existing search script in one go: combined type and search matching, counts and empty-state messages.`,
    res7: `Look at the end of the result: "(file state is current in your context — no need to Read it back)". That sentence comes from the harness, not the file system. It steers the model away from spending a request re-reading the file.`,
    use9: `Before writing tests, it checks which Node version is available and how the existing test helper builds recipes.`,
    use10: `Six JavaScript tests that load the real script into a small fake page, using Node's built-in test runner, so no new dependency is needed.`,
    use11: `Three tool calls in one response: write the pytest wrapper, add a route test, then run every check. The model asks for the checks before it has seen whether the two writes succeeded.`,
    res11: `The harness applies this write as soon as its tool_use block is complete, while the model is still writing the next call. The result waits in the queue until the next request.`,
    use13: `One Bash call runs three checks in a row: the JavaScript tests, the Python suite and the type checker.`,
    res13: `Read the output closely. The JavaScript tests fail at the top ("✖ tests/js"), then pytest and mypy pass. The harness does not mark the call as failed and does not interpret the output; spotting the failure is left to the model.`,
    text12: `The diagnosis, worked out purely from the output text: Node 26 treats a directory argument as a module, while the pytest wrapper passes the test file by name.`,
    use14: `It tries to confirm the fix and correct a comment in one command, using sed -i to edit the file in place.`,
    res14: `This is the harness saying no, not the model or the operating system. sed -i writes to a file and no allow-list rule covers sed, so dontAsk mode refuses. Compare request 5, where a Python script that also wrote files was allowed. The refusal goes back to the model as an ordinary error tool_result whose text suggests using other tools.`,
    send13: `The model learns about the denial only now, by reading the error text in its transcript.`,
    text13: `It says what happened and switches to the Edit tool, as the system prompt asks: adjust, don't retry verbatim.`,
    res16: `All six JavaScript tests pass.`,
    text14: `A response with no tool_use block ends with stop_reason end_turn. That is the signal for the harness to stop looping and return this text as the result. One detail to check against the evidence: it says 229 tests pass, but the pytest output in request 11 says 228.`,
    end: `${S.requests.length} model requests, ${S.tools.length} tool calls and one denial took about ${Math.round(S.result.durationMs / 1000)} seconds. The cost is the provider's list price for the tokens, not necessarily what a subscription would charge. The result reports num_turns: ${S.result.numTurns}, which counts something other than the ${S.requests.length} model requests visible in the stream.`,
  }),
};

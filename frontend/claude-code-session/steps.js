// Turns window.SESSION (see scripts/build-visualisation-data.ts) into steps
// and detail panels. Recorded values come from SESSION; author's notes live in NOTES and PHASES.
'use strict';

const S = window.SESSION;
const toolsById = Object.fromEntries(S.tools.map((tool, i) => [tool.id, { ...tool, index: i + 1 }]));
const fmt = n => n.toLocaleString('en-US');
const secs = ms => `+${(ms / 1000).toFixed(1)}s`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const totalInput = u => u.input + u.cacheRead + u.cacheWrite;

// Editorial grouping of the model requests. Not part of the recording.
const PHASES = ['Read the project guide', 'Read the search code', 'Check types, tests and CI', 'Check tests and styles', 'Edit the templates',
  'Find related markup', 'Rewrite the search script', 'Style the controls', 'Prepare to test', 'Write JavaScript tests',
  'Add test wrapper, run all checks', 'Diagnose, try a fix (blocked)', 'Fix with Edit, rerun', 'Report back'];

// Editorial outline of the recorded system prompt, in order. Each part starts at the exact recorded text in `start`.
// Parts marked `quote` are quoted verbatim on the page; the rest are shown as a short placeholder label
// that reveals the verbatim text behind a show/hide toggle.
const SYSTEM_PROMPT_OUTLINE = [
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
];

const SYSTEM_TEXT = S.systemContext.system.join('\n\n');
const systemParts = SYSTEM_PROMPT_OUTLINE.map(part => ({ ...part, at: SYSTEM_TEXT.indexOf(part.start) }));
systemParts.forEach((part, i) => {
  if (part.at < 0 || (i > 0 && part.at <= systemParts[i - 1].at)) throw new Error(`System prompt outline out of step with the recording at: ${part.start}`);
});
systemParts.forEach((part, i) => { part.text = SYSTEM_TEXT.slice(part.at, i + 1 < systemParts.length ? systemParts[i + 1].at : undefined).trim(); });

// Rough token estimates for the first request, at four characters per token, rounded to the nearest hundred.
const estimate = chars => Math.round(chars / 400) * 100;
const FIRST_REQUEST = {
  total: totalInput(S.requests[0].usage),
  system: estimate(SYSTEM_TEXT.length),
  tools: estimate(S.systemContext.toolDefinitionChars),
  prompt: estimate(S.prompt.length),
};
FIRST_REQUEST.uncaptured = Math.round((FIRST_REQUEST.total - FIRST_REQUEST.system - FIRST_REQUEST.tools - FIRST_REQUEST.prompt) / 100) * 100;

// Author's notes keyed by step id. Kept separate from recorded data on purpose.
const NOTES = {
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
};

// ---------- Build steps and transcript items ----------
const steps = [];
const items = []; // transcript items: { role, label, cls, step, request? }

function addStep(step) { step.index = steps.length; steps.push(step); return step; }

addStep({ id: 'setup', kind: 'setup', actor: 'harness', ms: S.setup.initMs, lines: [S.setup.initLine],
  title: 'The harness starts a session',
  summary: `Offers the model ${S.setup.tools.length} tools (${S.setup.tools.join(', ')}) and writes its system prompt (about ${fmt(FIRST_REQUEST.system)} tokens)`});
items.push({ role: 'system', label: `System prompt (≈${fmt(FIRST_REQUEST.system)} tokens) and ${S.systemContext.tools.length} tool definitions (≈${fmt(FIRST_REQUEST.tools)} tokens)`, step: 0 });
items.push({ role: 'user', label: S.prompt.split('\n')[0], step: 0 });

for (const req of S.requests) {
  const u = req.usage;
  addStep({ id: `send${req.n}`, kind: 'send', actor: 'harness', ms: req.startMs, lines: [req.startLine, req.endLine], request: req,
    title: 'Harness sends the latest transcript to the model',
    summary: `${fmt(totalInput(u))} input tokens: ${fmt(u.cacheRead)} read from cache, ${fmt(u.cacheWrite + u.input)} new`});

  const events = [
    ...req.blocks.map(block => ({ line: block.line, block })),
    ...S.tools.filter(t => t.request === req.n).map(t => ({ line: t.resultLine, result: toolsById[t.id] })),
  ].sort((a, b) => a.line - b.line);

  const seen = {};
  const blockId = type => { seen[type] = (seen[type] ?? 0) + 1; return `${type}${req.n}${seen[type] > 1 ? `-${seen[type]}` : ''}`; };
  for (const event of events) {
    const block = event.block;
    if (block?.type === 'thinking') {
      const visible = block.text.trim();
      addStep({ id: blockId('thinking'), kind: 'thinking', actor: 'model', ms: block.ms, lines: [block.line], request: req, block,
        title: visible ? 'The model thinks (partly visible)' : 'The model thinks (hidden)',
        summary: visible ? `“${visible}”` : `${fmt(u.thinking)} thinking tokens reported for this response; content not exposed`});
      items.push({ role: 'assistant', label: visible ? `[thinking] ${visible}` : `[thinking, encrypted signature]`, step: steps.length - 1 });
    } else if (block?.type === 'text') {
      const final = req.stopReason === 'end_turn';
      addStep({ id: blockId('text'), kind: 'text', actor: 'model', ms: block.ms, lines: [block.line], request: req, block, final,
        title: final ? 'The model writes its final answer' : 'The model writes a message',
        summary: `“${block.text.length > 140 ? block.text.slice(0, 140) + '…' : block.text}”`});
      items.push({ role: 'assistant', label: block.text, step: steps.length - 1 });
    } else if (block?.type === 'tool_use') {
      const tool = toolsById[block.toolId];
      addStep({ id: `use${tool.index}`, kind: 'use', actor: 'model', ms: block.ms, lines: [block.line], request: req, tool,
        title: `The model asks to use ${tool.name}`, summary: toolTarget(tool)});
      items.push({ role: 'assistant', label: `tool_use ${tool.name}: ${toolTarget(tool)}`, step: steps.length - 1 });
    } else if (event.result) {
      const tool = event.result;
      const denied = tool.permission?.decision === 'reject';
      const status = denied ? 'deny' : tool.isError ? 'fail' : reportsFailure(tool.output) ? 'warn' : 'ok';
      addStep({ id: `res${tool.index}`, kind: 'result', actor: denied ? 'harness' : 'workspace', ms: tool.resultMs,
        lines: [tool.denialLine, tool.resultLine].filter(Boolean), request: req, tool, status,
        title: denied ? `The harness denies ${tool.name}` : `The harness runs ${tool.name}`,
        summary: resultSummary(tool)});
      tool.status = status;
      items.push({ role: 'tool', label: `tool_result: ${resultSummary(tool)}`, step: steps.length - 1 });
    }
  }
}

addStep({ id: 'end', kind: 'end', actor: 'harness', ms: S.result.ms, lines: [S.result.line],
  title: 'The harness ends the run and reports the result',
  summary: `${S.requests.length} model requests, ${S.tools.length} tool calls, ${S.result.permissionDenials} denial`});

function toolTarget(tool) {
  const i = tool.input;
  if (tool.name === 'Bash') return `${i.description}: ${i.command.split('\n')[0]}`;
  if (tool.name === 'Grep') return `Search for ${i.pattern}`;
  return `${tool.name} ${i.file_path}`;
}

// A command can succeed as a whole while its output reports a failing check.
function reportsFailure(output) { return /ℹ fail [1-9]|^✖|\b[1-9]\d* failed\b/m.test(output); }

function resultSummary(tool) {
  if (tool.permission?.decision === 'reject') return `rejected (reason: ${tool.permission.reason_type}): ${tool.output.split('.')[0]}`;
  if (tool.name === 'Edit') return `${tool.input.file_path} updated`;
  if (tool.name === 'Write') return `${tool.input.file_path} ${/created/.test(tool.output) ? 'created' : 'replaced'}`;
  const lines = tool.output.trim().split('\n');
  if (tool.name === 'Grep') return `${fmt(lines.length)} matching lines`;
  const checks = [];
  const nodePass = /ℹ pass (\d+)/.exec(tool.output), nodeFail = /ℹ fail (\d+)/.exec(tool.output);
  if (nodePass) checks.push(`JavaScript tests: ${nodePass[1]} passed, ${nodeFail?.[1] ?? 0} failed`);
  const pytest = lines.find(l => /\d+ passed/.test(l) && !l.startsWith('ℹ'));
  if (pytest) checks.push(`pytest: ${pytest.replace(/=+/g, '').trim()}`);
  const mypy = lines.find(l => l.startsWith('Success: no issues'));
  if (mypy) checks.push(`mypy: ${mypy}`);
  if (checks.length) return checks.join(' · ');
  if (/files? changed/.test(lines.at(-1))) return lines.at(-1).trim();
  return `${fmt(lines.length)} lines of output (${fmt(tool.output.length)} characters)`;
}

// ---------- Shared rendering ----------
const $ = id => document.getElementById(id);
const ACTOR_LABELS = { model: 'Model', harness: 'Harness', workspace: 'Workspace' };
const STATUS_LABELS = { ok: 'ok', warn: 'output reports a failure', fail: 'error result', deny: 'denied' };

function stepHeadHtml(step, actorLabel = ACTOR_LABELS[step.actor]) {
  return `<div class="step-head">
      <span class="actor ${step.actor}">${actorLabel}</span>
      <span class="step-title">${esc(step.title)}</span>
      ${step.status ? `<span class="status ${step.status}">${STATUS_LABELS[step.status]}</span>` : ''}
    </div>
    <div class="step-summary">${esc(step.summary)}</div>`;
}

function renderIntro() {
  // Shows the feature request only; the prompt's trailing "Environment:" paragraph is left out for readability.
  $('prompt').textContent = S.prompt.split(/\n\s*\nEnvironment:/)[0].trim();
  const facts = [
    ['Harness', 'Claude Code'], ['Model', S.setup.model], ['Effort', S.setup.effort],
    ['Permission mode', S.setup.permissionMode], ['Model requests', S.requests.length], ['Tool calls', S.tools.length],
  ];
  $('facts').innerHTML = facts.map(([k, v]) => `<dl class="fact"><dt>${k}</dt><dd>${esc(v)}</dd></dl>`).join('');

}

// The step named in the URL hash (#step-N), or null.
function stepFromHash() {
  const fromHash = /^#step-(\d+)$/.exec(location.hash);
  return fromHash ? Math.min(Number(fromHash[1]), steps.length - 1) : null;
}
// Records the open step in the URL hash, or clears it when given null.
function rememberStep(index) {
  const url = index == null ? location.pathname + location.search : `#step-${index}`;
  try { history.replaceState(null, '', url); } catch { /* sandboxed frames may refuse */ }
}

// ---------- Detail panels (drill-down) ----------
function section(title, body, open = false) {
  return `<details${open ? ' open' : ''}><summary>${esc(title)}</summary><div class="body">${body}</div></details>`;
}
// Like section, but always visible with no toggle.
function panel(title, body) {
  return `<section class="panel"><h4 class="panel-title">${esc(title)}</h4><div class="body">${body}</div></section>`;
}
const pre = (text, cls = '') => `<pre class="code ${cls}">${esc(text)}</pre>`;
const kv = rows => `<dl class="kv">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;

function diffBlock(oldText, newText) {
  const del = oldText.split('\n').map(l => `<span class="del">- ${esc(l)}</span>`).join('');
  const add = newText.split('\n').map(l => `<span class="add">+ ${esc(l)}</span>`).join('');
  return `<pre class="code diff">${del}${add}</pre>`;
}

function renderDetail(step) {
  const note = NOTES[step.id] ? `<p class="note narr">${esc(NOTES[step.id])}</p>` : '';
  let parts = '';
  switch (step.kind) {
    case 'setup': {
      parts = panel('Session configuration', kv([
        ['Tools offered to the model', S.setup.tools.join(', ')],
        ['Pre-approved (allow-list)', S.setup.allowedTools.join(', ')],
        ['Permission mode', `${S.setup.permissionMode}: anything not allowed is refused without asking`],
        ['Claude Code version', S.setup.cli],
      ]))
        + panel('What the harness sends with the first request', kv([
          ['System prompt', `${fmt(SYSTEM_TEXT.length)} characters, ≈${fmt(FIRST_REQUEST.system)} tokens, in ${S.systemContext.system.length} blocks`],
          ['Tool definitions', `${S.systemContext.tools.length} tools, ${fmt(S.systemContext.toolDefinitionChars)} characters of JSON, ≈${fmt(FIRST_REQUEST.tools)} tokens`],
          ['Task prompt', `${fmt(S.prompt.length)} characters, ≈${fmt(FIRST_REQUEST.prompt)} tokens`],
          ['Not captured', `≈${fmt(FIRST_REQUEST.uncaptured)} of request 1's ${fmt(FIRST_REQUEST.total)} input tokens`],
          ['Output limit', `${fmt(S.systemContext.params.maxTokens)} tokens`],
          ['Thinking / effort', `${S.systemContext.params.thinking.type} / ${S.systemContext.params.effort}`],
        ]) + `<p class="mini">Token figures marked ≈ are estimates at four characters per token. Recovered after the run from Claude Code's local session transcript: <span class="evidence">${esc(S.systemContext.source)}</span></p>`)
        + panel('System prompt',
          `<ol class="sp-outline">${systemParts.map(p => p.quote
            ? `<li class="sp-quote"><pre class="code wrap">${esc(p.text)}</pre></li>`
            : `<li><details class="sp-placeholder sp-expand"><summary>${esc(p.placeholder)}</summary><pre class="code wrap">${esc(p.text)}</pre></details></li>`).join('')}</ol>`);
      break;
    }
    case 'send': {
      const u = step.request.usage;
      const prev = steps.slice(0, step.index).reverse().find(s => s.kind === 'send');
      const added = items.filter(item => item.step < step.index && item.step > (prev ? prev.index : -1));
      parts = section('Tokens in this request', kv([
        ['Read from prompt cache', fmt(u.cacheRead)], ['Written to cache (new)', fmt(u.cacheWrite)], ['Uncached input', fmt(u.input)],
        ['Total input', fmt(totalInput(u))], ['Output generated', `${fmt(u.output)} (of which thinking ${fmt(u.thinking)})`],
        ['Stop reason', step.request.stopReason], ['Response streamed', `${secs(step.request.startMs)} → ${secs(step.request.endMs)}`],
      ]), true)
        + section(`New in this request (${added.length} item${added.length === 1 ? '' : 's'})`,
          `<ul class="mini">${added.map(i => `<li>${esc(i.role)}: ${esc(i.label.slice(0, 160))}</li>`).join('')}</ul>`, true);
      break;
    }
    case 'thinking':
      parts = section('What was recorded', kv([
        ['Thinking text', step.block.text.trim() ? step.block.text.trim() : '"" (empty in the stream)'],
        ['Signature', `${fmt(step.block.signatureLength)} characters, encrypted`],
        ['Reported thinking tokens (whole response)', fmt(step.request.usage.thinking)],
        ['Thinking duration', step.block.durationMs == null ? 'not reported' : `${fmt(step.block.durationMs)} ms`],
      ]), true);
      break;
    case 'text':
      parts = section('Full text', `<p class="final-text">${esc(step.block.text)}</p>`, true);
      break;
    case 'use': {
      const t = step.tool;
      if (t.name === 'Edit') parts = section(`Edit ${t.input.file_path}`, `<p class="mini">The model supplies the exact text to find and its replacement.</p>${diffBlock(t.input.old_string, t.input.new_string)}`, true);
      else if (t.name === 'Write') parts = section(`Write ${t.input.file_path}`, `<p class="mini">The model supplies the complete file contents.</p>${pre(t.input.content)}`, true);
      else if (t.name === 'Bash') parts = section(`Command: ${t.input.description}`, pre(t.input.command, 'wrap'), true);
      else parts = section(`${t.name} arguments`, kv(Object.entries(t.input).map(([k, v]) => [k, String(v)])), true);
      parts += section('Tool call as sent by the model', pre(JSON.stringify({ type: 'tool_use', id: t.id, name: t.name, input: t.input }, null, 2)));
      break;
    }
    case 'result': {
      const t = step.tool;
      const p = t.permission ?? {};
      parts = section('Permission decision', kv([
        ['Decision', p.decision], ['Reason type', p.reason_type], ['Source', p.source],
        ...(t.nonExecution ? [['Not executed because', t.nonExecution]] : []),
      ]), true)
        + section(t.status === 'deny' ? 'Error text returned to the model' : `Output returned to the model (${fmt(t.output.length)} characters)`, pre(t.output, 'wrap'), true);
      break;
    }
    case 'end':
      parts = section('Result record', kv([
        ['Model requests seen in stream', S.requests.length], ['Provider num_turns', S.result.numTurns],
        ['Duration (total / in API)', `${fmt(S.result.durationMs)} ms / ${fmt(S.result.durationApiMs)} ms`],
        ['Input tokens (cache read / write / uncached)', `${fmt(S.result.usage.cache_read_input_tokens)} / ${fmt(S.result.usage.cache_creation_input_tokens)} / ${fmt(S.result.usage.input_tokens)}`],
        ['Output tokens (thinking)', `${fmt(S.result.usage.output_tokens)} (${fmt(S.result.usage.output_tokens_details.thinking_tokens)})`],
        ['Context window', `${fmt(S.result.contextWindow)} tokens; the largest request used ${(100 * Math.max(...S.requests.map(r => totalInput(r.usage))) / S.result.contextWindow).toFixed(1)}%`],
        ['List cost', `$${S.result.costUsd.toFixed(4)}`], ['Permission denials', S.result.permissionDenials],
      ]), true);
      break;
  }
  return note + parts;
}

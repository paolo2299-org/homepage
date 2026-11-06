// Turns window.SESSION (see scripts/build-visualisation-data.ts) into steps and detail panels.
// Recorded values come from SESSION; phases, notes and the system-prompt outline come from the
// session's editorial file (EDITORIAL, in coding-notes.js or browser-notes.js).
'use strict';

const S = window.SESSION;
const toolsById = Object.fromEntries(S.tools.map((tool, i) => [tool.id, { ...tool, index: i + 1 }]));
const fmt = n => n.toLocaleString('en-US');
const secs = ms => `+${(ms / 1000).toFixed(1)}s`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const totalInput = u => u.input + u.cacheRead + u.cacheWrite;

const PHASES = EDITORIAL.phases;
const SYSTEM_TEXT = S.systemContext.system.join('\n\n');
const systemParts = EDITORIAL.outline.map(part => ({ ...part, at: SYSTEM_TEXT.indexOf(part.start) }));
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

// Author's notes keyed by step id, from the session's editorial file.
const NOTES = EDITORIAL.notes({ S, fmt, totalInput, FIRST_REQUEST });

// Tools the session lists by name whose definitions are held back until the model loads them with ToolSearch.
const DEFERRED_TOOLS = S.setup.tools.filter(name => !S.systemContext.tools.some(tool => tool.name === name));

// MCP tools arrive as mcp__<server>__<tool>; the page shows just <tool>.
const shortName = name => name.replace(/^mcp__.+?__/, '');
const capitalise = text => text.charAt(0).toUpperCase() + text.slice(1);
const shortUrl = url => url.replace(/^https?:\/\/(www\.)?/, '');

// ---------- Build steps and transcript items ----------
const steps = [];
const items = []; // transcript items: { role, label, cls, step, request? }

function addStep(step) { step.index = steps.length; steps.push(step); return step; }

addStep({ id: 'setup', kind: 'setup', actor: 'harness', ms: S.setup.initMs, lines: [S.setup.initLine],
  title: 'The harness starts a session',
  summary: DEFERRED_TOOLS.length
    ? `Offers the model ${S.setup.tools.length} tools, ${DEFERRED_TOOLS.length} of them by name only until loaded, and writes its system prompt (about ${fmt(FIRST_REQUEST.system)} tokens)`
    : `Offers the model ${S.setup.tools.length} tools (${S.setup.tools.join(', ')}) and writes its system prompt (about ${fmt(FIRST_REQUEST.system)} tokens)`});
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
        title: `The model asks to use ${shortName(tool.name)}`, summary: toolTarget(tool)});
      items.push({ role: 'assistant', label: `tool_use ${shortName(tool.name)}: ${toolTarget(tool)}`, step: steps.length - 1 });
    } else if (event.result) {
      const tool = event.result;
      const denied = tool.permission?.decision === 'reject';
      const status = denied ? 'deny' : tool.isError ? 'fail' : reportsFailure(tool.output) ? 'warn' : 'ok';
      addStep({ id: `res${tool.index}`, kind: 'result', actor: denied ? 'harness' : 'workspace', ms: tool.resultMs,
        lines: [tool.denialLine, tool.resultLine].filter(Boolean), request: req, tool, status,
        title: denied ? `The harness denies ${shortName(tool.name)}` : `The harness runs ${shortName(tool.name)}`,
        summary: resultSummary(tool)});
      tool.status = status;
      items.push({ role: 'tool', label: `tool_result: ${resultSummary(tool)}`, step: steps.length - 1 });
    }
  }
}

addStep({ id: 'end', kind: 'end', actor: 'harness', ms: S.result.ms, lines: [S.result.line],
  title: 'The harness ends the run and reports the result',
  summary: `${S.requests.length} model requests, ${S.tools.length} tool calls, ${S.result.permissionDenials} denial`});

// One browser action, as used directly or inside browser_batch.
function describeAction({ name, input }) {
  const tool = shortName(name);
  if (tool === 'navigate') return `open ${shortUrl(input.url)}`;
  if (tool === 'tabs_context_mcp') return 'list the open tabs';
  if (tool === 'tabs_create_mcp') return 'open a new tab';
  if (tool !== 'computer') return tool;
  switch (input.action) {
    case 'screenshot': return 'screenshot';
    case 'scroll': return `scroll ${input.scroll_direction}`;
    case 'left_click': return `click (${input.coordinate.join(', ')})${input.action_summary ? `: ${input.action_summary}` : ''}`;
    case 'type': return `type “${input.text}”`;
    default: return input.action;
  }
}

function toolTarget(tool) {
  const i = tool.input;
  if (tool.name === 'Bash') return `${i.description}: ${i.command.split('\n')[0]}`;
  if (tool.name === 'Grep') return `Search for ${i.pattern}`;
  if (tool.name === 'ToolSearch') return `Load ${i.query.replace(/^select:/, '').split(',').map(shortName).join(', ')}`;
  if (shortName(tool.name) === 'browser_batch') return capitalise(i.actions.map(describeAction).join(' → '));
  if (tool.name.startsWith('mcp__')) return capitalise(describeAction({ name: tool.name, input: i }));
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
  if (tool.loaded.length) return `${tool.loaded.length} tool definitions loaded: ${tool.loaded.map(shortName).join(', ')}`;
  if (tool.isError) return tool.output.split(/(?<=\.)\s/)[0];
  if (tool.name.startsWith('mcp__')) return browserOutcome(tool);
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

// What a browser call did, from its result text, plus how many screenshots came back.
function browserOutcome(tool) {
  const outcomes = [];
  for (const m of tool.output.matchAll(/Navigated to (\S+?)(?=\[|\s|$)|Clicked at \((\d+), (\d+)\)|Scrolled (\w+)|Created new tab/g)) {
    if (m[1]) outcomes.push(`opened ${shortUrl(m[1])}`);
    else if (m[2]) outcomes.push(`clicked (${m[2]}, ${m[3]})`);
    else if (m[4]) outcomes.push(`scrolled ${m[4]}`);
    else outcomes.push('opened a new tab');
  }
  if (tool.images.length) outcomes.push(`${tool.images.length} screenshot${tool.images.length > 1 ? 's' : ''} returned`);
  if (!outcomes.length && shortName(tool.name) === 'tabs_context_mcp') outcomes.push('open tabs listed');
  return capitalise(outcomes.join(' · '));
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
  $('prompt').textContent = EDITORIAL.promptExcerpt(S.prompt);
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
        ['Tools offered to the model', S.setup.tools.map(shortName).join(', ')],
        ...(DEFERRED_TOOLS.length ? [['Full definitions in the first request', S.systemContext.tools.map(tool => shortName(tool.name)).join(', ')]] : []),
        ['Pre-approved (allow-list)', S.setup.allowedTools.map(shortName).join(', ')],
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
      else if (shortName(t.name) === 'browser_batch') parts = section(`${t.input.actions.length} browser actions in one call`, `<ol class="actions">${t.input.actions.map(a => `<li>${esc(capitalise(describeAction(a)))}</li>`).join('')}</ol>`, true);
      else parts = section(`${t.name} arguments`, kv(Object.entries(t.input).map(([k, v]) => [k, String(v)])), true);
      parts += section('Tool call as sent by the model', pre(JSON.stringify({ type: 'tool_use', id: t.id, name: t.name, input: t.input }, null, 2)), t.name === 'ToolSearch');
      break;
    }
    case 'result': {
      const t = step.tool;
      const p = t.permission ?? {};
      parts = section('Permission decision', kv([
        ['Decision', p.decision], ['Reason type', p.reason_type], ['Source', p.source],
        ...(t.nonExecution ? [['Not executed because', t.nonExecution]] : []),
      ]), true)
        + (t.images.length ? section(`What the model sees: ${t.images.length} screenshot${t.images.length > 1 ? 's' : ''}`,
          `${t.images.map((src, k) => `<figure class="shot"><img src="${esc(src)}" alt="Screenshot ${k + 1} returned to the model" loading="lazy"></figure>`).join('')}<p class="mini">Returned to the model as images inside the tool result. Personal details are blacked out on this page.</p>`, true) : '')
        + (t.loaded.length && S.loadedTools ? section('Definitions added to every later request', kv(S.loadedTools.tools
          .filter(tool => t.loaded.includes(tool.name)).map(tool => [shortName(tool.name), `${fmt(tool.definitionChars)} characters`])), true) : '')
        + (t.output.trim()
          ? section(t.status === 'deny' ? 'Error text returned to the model' : t.isError ? 'Error returned to the model' : `${t.images.length ? 'Text' : 'Output'} returned to the model (${fmt(t.output.length)} characters)`, pre(t.output, 'wrap'), true)
          : '');
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

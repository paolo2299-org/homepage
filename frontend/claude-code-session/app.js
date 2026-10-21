// One column for the harness, one for the model. Step building and detail panels are in steps.js.
'use strict';

const LANE = { harness: 'harness', workspace: 'harness', model: 'model' };
const LANE_LABELS = { harness: 'Harness', workspace: 'Harness · workspace', model: 'Model' };

// What crosses between the columns at this step, drawn in the gutter.
function crossing(step) {
  if (step.kind === 'send') return { dir: 'to-model', label: `${fmt(totalInput(step.request.usage))} tok` };
  if (step.kind === 'use') return { dir: 'to-harness', label: 'tool_use' };
  if (step.kind === 'text' && step.final) return { dir: 'to-harness', label: 'end_turn' };
  return null;
}

function arrowSvg(c) {
  const line = c.dir === 'to-model' ? 'M2 20 H62' : 'M70 20 H10';
  const head = c.dir === 'to-model' ? 'M62 14 L70 20 L62 26 Z' : 'M10 14 L2 20 L10 26 Z';
  return `<svg class="arrow ${c.dir}" viewBox="0 0 72 30" aria-hidden="true"><path d="${line}" class="arrow-line"/><path d="${head}" class="arrow-head"/></svg><span class="cross-label">${esc(c.label)}</span>`;
}

// The model is busy from the moment a request is sent until its message_delta arrives.
function modelActive(step) {
  const req = step.request;
  if (!req || step.kind === 'send') return false;
  const line = step.lines[step.lines.length - 1];
  return line > req.startLine && line < req.endLine;
}

function cardHtml(step) {
  let extra = '';
  if (step.kind === 'result') {
    const next = step.request.n + 1;
    const what = step.status === 'deny' ? 'Refusal' : 'Output captured and';
    extra = `<div class="queued">${what} sent as part of request ${next}</div>`;
  }
  const more = `<span class="lcard-more" aria-hidden="true"><svg viewBox="0 0 8 12"><path d="M2 1.5 6.5 6 2 10.5"/></svg></span>`;
  return `<div class="lcard ${step.actor}" data-index="${step.index}" role="button" tabindex="0" aria-haspopup="dialog" title="View details"><div class="lcard-body">${stepHeadHtml(step, LANE_LABELS[step.actor])}${extra}</div>${more}</div>`;
}

function bandHtml(label, phase) {
  return `<li class="band"><span class="band-label">${esc(label)}</span><span class="band-phase">${esc(phase)}</span></li>`;
}

function renderPage() {
  renderIntro();
  $('model-name').textContent = S.setup.model;
  let html = '';
  let band = null;
  for (const step of steps) {
    const key = step.request ? step.request.n : step.kind === 'setup' ? 'setup' : step.kind;
    if (key !== band) {
      band = key;
      const req = step.request;
      if (req) html += bandHtml(`Request ${req.n}`, PHASES[req.n - 1]);
      else if (key === 'setup') html += bandHtml('Session start', 'Harness setup');
      else html += bandHtml('Session end', 'Result');
    }
    const lane = LANE[step.actor];
    const c = crossing(step);
    const active = modelActive(step) ? ' active' : '';
    const cells = `<div class="cell harness">${lane === 'harness' ? cardHtml(step) : ''}</div>
      <div class="gutter">${c ? arrowSvg(c) : ''}</div>
      <div class="cell model${active}${lane === 'model' ? '' : ' empty'}">${lane === 'model' ? cardHtml(step) : ''}</div>`;
    html += `<li class="lrow lane-${lane}" id="step-${step.index}" data-index="${step.index}">${cells}</li>`;
  }
  $('lanes').innerHTML = html;
}

// Step details open in a modal dialog: close button, Escape or a click on the backdrop dismisses it.
const dialog = $('step-dialog');
let opener = null;

function openStep(index) {
  const step = steps[index];
  $('dialog-title').innerHTML = stepHeadHtml(step, LANE_LABELS[step.actor]);
  $('dialog-body').innerHTML = renderDetail(step);
  if (!dialog.open) dialog.showModal();
  $('dialog-body').scrollTop = 0;
  rememberStep(index);
}

renderPage();
document.addEventListener('click', event => {
  const card = event.target.closest('.lcard');
  if (!card) return;
  opener = card;
  openStep(Number(card.dataset.index));
});
document.addEventListener('keydown', event => {
  const card = event.target.closest?.('.lcard');
  if (!card || (event.key !== 'Enter' && event.key !== ' ')) return;
  event.preventDefault();
  opener = card;
  openStep(Number(card.dataset.index));
});
$('dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
dialog.addEventListener('close', () => {
  rememberStep(null);
  opener?.focus();
});

const linked = stepFromHash();
if (linked != null) openStep(linked);

const API_URL = '/api';

const COLORS = [
  '#ffd97d', '#a8e6cf', '#a0c4ff', '#ffb3c6',
  '#c9b8e8', '#ffc8a2', '#b5ead7', '#c7f2a4',
];

window.tokenise = async function tokenise() {
  const input = document.getElementById('token-input');
  const output = document.getElementById('token-output');
  const count = document.getElementById('token-count');
  const btn = document.getElementById('token-btn');

  const text = input.value;
  if (!text) return;

  btn.disabled = true;
  output.innerHTML = '<span class="status">Tokenising…</span>';
  count.textContent = '';

  try {
    const res = await fetch(`${API_URL}/tokenize?text=${encodeURIComponent(text)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    output.innerHTML = '';
    data.tokens.forEach((token, i) => {
      const span = document.createElement('span');
      span.className = 'token';
      span.style.background = COLORS[i % COLORS.length];
      span.textContent = token;
      output.appendChild(span);
    });

    const n = data.tokens.length;
    count.textContent = `${n} token${n !== 1 ? 's' : ''}`;
  } catch (e) {
    output.innerHTML = '<span class="error">Something went wrong — please try again.</span>';
  } finally {
    btn.disabled = false;
  }
};

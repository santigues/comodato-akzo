/* ============================================
   APP.JS — Solicitação de Comodato
   ============================================ */

// ── SUPABASE CONFIG ───────────────────────────
const SUPABASE_URL = 'https://ydpnqohphxnueudydjbg.supabase.co';  // ← substitua
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkcG5xb2hwaHhudWV1ZHlkamJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NDQ4OTUsImV4cCI6MjA5NDQyMDg5NX0.y0_Fs3jcXDI0ov-CWTALcmUOHYQ4XeEDwKEaNiUVeLc';                      // ← substitua
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Estado ────────────────────────────────────
let currentStep   = 1;
let selectedTipo  = 'Novo';
let usuarioLogado = null;

// ── Init ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setDate();
  mostrarLogin();
});

function setDate() {
  const el = document.getElementById('topbar-date');
  if (!el) return;
  el.textContent = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  });
}

// ══════════════════════════════════════════════
//  LOGIN
// ══════════════════════════════════════════════
function mostrarLogin() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('app-shell').classList.add('hidden');
}

async function fazerLogin() {
  const email = document.getElementById('login-email').value.trim();
  const senha  = document.getElementById('login-senha').value;
  const erro   = document.getElementById('login-erro');
  erro.classList.add('hidden');

  if (!email || !senha) {
    erro.textContent = 'Preencha o e-mail e a senha.';
    erro.classList.remove('hidden');
    return;
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });

  if (error) {
    erro.textContent = 'E-mail ou senha incorretos.';
    erro.classList.remove('hidden');
    return;
  }

  const { data: perfil } = await supabase
    .from('usuarios')
    .select('nome, cargo, iniciais')
    .eq('id', data.user.id)
    .single();

  usuarioLogado = { email: data.user.id_email || email, ...perfil };

  document.getElementById('user-nome').textContent     = perfil.nome;
  document.getElementById('user-cargo').textContent    = perfil.cargo;
  document.getElementById('user-iniciais').textContent = perfil.iniciais;
  document.getElementById('f-responsavel').value       = perfil.nome;

  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app-shell').classList.remove('hidden');

  goStep(1);
  carregarHistorico();
}

async function fazerLogout() {
  await supabase.auth.signOut();
  usuarioLogado = null;
  document.getElementById('login-email').value = '';
  document.getElementById('login-senha').value = '';
  mostrarLogin();
}

document.addEventListener('keydown', e => {
  const loginVisivel = !document.getElementById('login-screen').classList.contains('hidden');
  if (e.key === 'Enter' && loginVisivel) fazerLogin();
});

// ══════════════════════════════════════════════
//  NAVEGAÇÃO
// ══════════════════════════════════════════════
function showView(view, el) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  const target = document.getElementById('view-' + view);
  if (target) target.classList.remove('hidden');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');
  const titles = { nova: 'Nova solicitação', historico: 'Minhas solicitações', aguardando: 'Aguardando aprovação', contratos: 'Contratos gerados' };
  const titleEl = document.getElementById('topbar-title');
  if (titleEl) titleEl.textContent = titles[view] || '';
  if (view === 'historico') carregarHistorico();
  return false;
}

// ══════════════════════════════════════════════
//  STEPPER
// ══════════════════════════════════════════════
function goStep(n) {
  if (n > currentStep && !validarStep(currentStep)) return;
  document.querySelectorAll('[id^="screen-"]').forEach(s => s.classList.add('hidden'));
  const target = document.getElementById('screen-' + n);
  if (target) target.classList.remove('hidden');
  currentStep = n;
  updateStepper(n);
  if (n === 4) fillReview();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateStepper(activeStep) {
  document.querySelectorAll('.step[data-step]').forEach(step => {
    const s = parseInt(step.dataset.step);
    step.classList.remove('active', 'done');
    if (s < activeStep)  step.classList.add('done');
    if (s === activeStep) step.classList.add('active');
  });
  document.querySelectorAll('.step-connector').forEach((conn, i) => {
    conn.classList.toggle('done', i < activeStep - 1);
  });
}

// ══════════════════════════════════════════════
//  VALIDAÇÃO
// ══════════════════════════════════════════════
const OBRIGATORIOS = {
  1: [
    { id: 'f-sap',     label: 'Cód SAP' },
    { id: 'f-cliente', label: 'Nome do cliente' },
    { id: 'f-linha',   label: 'Linha de produto' },
  ],
  2: [
    { id: 'f-razao',   label: 'Razão social' },
    { id: 'f-cnpj',    label: 'CNPJ' },
    { id: 'f-end-cod', label: 'Endereço do comodatário' },
    { id: 'f-contato', label: 'Contato' },
    { id: 'f-dtini',   label: 'Início de vigência' },
    { id: 'f-dtfim',   label: 'Fim de vigência' },
    { id: 'f-local',   label: 'Local de assinatura' },
  ],
  3: [
    { id: 'f-equip', label: 'Equipamento' },
    { id: 'f-qtd',   label: 'Quantidade' },
  ],
};

function validarStep(step) {
  const campos = OBRIGATORIOS[step];
  if (!campos) return true;
  let valido = true;

  campos.forEach(({ id }) => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('field-error');
    const hint = document.getElementById('err-' + id);
    if (hint) hint.remove();
  });

  campos.forEach(({ id, label }) => {
    const el = document.getElementById(id);
    if (!el || el.value.trim()) return;
    el.classList.add('field-error');
    const msg = document.createElement('div');
    msg.id = 'err-' + id;
    msg.className = 'field-error-msg';
    msg.textContent = `${label} é obrigatório`;
    el.parentElement.appendChild(msg);
    valido = false;
  });

  if (!valido) {
    const primeiro = document.querySelector('.field-error');
    if (primeiro) primeiro.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  return valido;
}

document.addEventListener('input', e => {
  if (e.target.classList.contains('field-error')) {
    e.target.classList.remove('field-error');
    const msg = document.getElementById('err-' + e.target.id);
    if (msg) msg.remove();
  }
});

// ══════════════════════════════════════════════
//  HELPERS DE FORMULÁRIO
// ══════════════════════════════════════════════
function selectToggle(el) {
  el.closest('.toggle-group').querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  selectedTipo = el.dataset.value;
}

function maskCNPJ(input) {
  let v = input.value.replace(/\D/g, '').substring(0, 14);
  v = v.replace(/^(\d{2})(\d)/, '$1.$2');
  v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
  v = v.replace(/\.(\d{3})(\d)/, '.$1/$2');
  v = v.replace(/(\d{4})(\d)/, '$1-$2');
  input.value = v;
}

function dragOver(e)  { e.preventDefault(); document.getElementById('drop-zone').classList.add('over'); }
function dragLeave()  { document.getElementById('drop-zone').classList.remove('over'); }
function dropFile(e)  { e.preventDefault(); document.getElementById('drop-zone').classList.remove('over'); handleFiles(e.dataTransfer.files); }

function handleFiles(files) {
  const list = document.getElementById('file-list');
  Array.from(files).forEach(file => {
    const item = document.createElement('div');
    item.className = 'file-item';
    item.innerHTML = `<i class="fa-solid fa-paperclip"></i><span>${file.name}</span><span style="color:var(--text-3);font-size:11px;margin-left:4px">${formatBytes(file.size)}</span><i class="fa-solid fa-xmark file-remove" onclick="this.parentElement.remove()"></i>`;
    list.appendChild(item);
  });
}

function formatBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}

// ══════════════════════════════════════════════
//  REVISÃO
// ══════════════════════════════════════════════
function fillReview() {
  const get = id => (document.getElementById(id)?.value || '').trim();
  renderReview('review-cliente', [
    { key: 'Cód SAP',          val: get('f-sap') },
    { key: 'Tipo',             val: selectedTipo },
    { key: 'Cliente',          val: get('f-cliente') },
    { key: 'Endereço',         val: get('f-endereco') },
    { key: 'Responsável',      val: get('f-responsavel') },
    { key: 'Linha de produto', val: get('f-linha') },
    { key: 'Volume 2024',      val: get('f-volume') ? get('f-volume') + ' L' : '' },
    { key: 'Média 2024',       val: get('f-media')  ? get('f-media')  + ' L/mês' : '' },
  ]);
  renderReview('review-contrato', [
    { key: 'Razão social',     val: get('f-razao') },
    { key: 'CNPJ',             val: get('f-cnpj') },
    { key: 'Endereço',         val: get('f-end-cod') },
    { key: 'Contato',          val: get('f-contato') },
    { key: 'Início vigência',  val: formatDate(get('f-dtini')) },
    { key: 'Fim vigência',     val: formatDate(get('f-dtfim')) },
    { key: 'Local assinatura', val: get('f-local') },
  ]);
  const valor = parseFloat(get('f-valor'));
  renderReview('review-equip', [
    { key: 'Equipamento',    val: get('f-equip') },
    { key: 'Quantidade',     val: get('f-qtd') },
    { key: 'Valor estimado', val: !isNaN(valor) && valor > 0 ? 'R$ ' + valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '' },
    { key: 'Observações',    val: get('f-obs') },
  ]);
}

function renderReview(containerId, rows) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = rows.map(({ key, val }) => `
    <div class="review-row">
      <span class="review-key">${key}</span>
      <span class="review-val${!val ? ' empty' : ''}">${val || 'Não informado'}</span>
    </div>`).join('');
}

function formatDate(val) {
  if (!val) return '';
  const [y, m, d] = val.split('-');
  return `${d}/${m}/${y}`;
}

// ══════════════════════════════════════════════
//  ENVIO
// ══════════════════════════════════════════════
async function enviarSolicitacao() {
  const btn = document.querySelector('.btn-submit');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';

  try {
    const payload = buildPayload();

    const { error } = await supabase
      .from('solicitacoes')
      .insert([payload]);

    if (error) throw error;

    const ref = '#' + new Date().getFullYear() + '-' + String(Date.now()).slice(-4);
    document.getElementById('success-ref-num').textContent = ref;
    goStep(5);

  } catch (err) {
    alert('Erro ao enviar.\n\n' + err.message);
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Enviar para aprovação';
  }
}

function buildPayload() {
  const get = id => (document.getElementById(id)?.value || '').trim();
  return {
    CodSAP:               get('f-sap'),
    TipoSolicitacao:      selectedTipo,
    Cliente:              get('f-cliente'),
    Endereco:             get('f-endereco'),
    Responsavel:          get('f-responsavel'),
    EmailSolicitante:     usuarioLogado?.email || '',
    LinhaProduto:         get('f-linha'),
    Volume2024:           parseFloat(get('f-volume')) || 0,
    Media2024:            parseFloat(get('f-media'))  || 0,
    RazaoSocial:          get('f-razao'),
    CNPJ:                 get('f-cnpj'),
    EnderecoComodatario:  get('f-end-cod'),
    ContatoNomeEmailTel:  get('f-contato'),
    DataInicio:           get('f-dtini'),
    DataTermino:          get('f-dtfim'),
    LocalAssinatura:      get('f-local'),
    Equipamento:          get('f-equip'),
    Quantidade:           parseInt(get('f-qtd')) || 1,
    ValorEstimado:        parseFloat(get('f-valor')) || 0,
    Observacoes:          get('f-obs'),
    DataEnvio:            new Date().toISOString(),
    Status:               'Pendente',
  };
}

// ══════════════════════════════════════════════
//  HISTÓRICO (carrega do Supabase)
// ══════════════════════════════════════════════
async function carregarHistorico() {
  const tbody = document.getElementById('history-body');
  if (!tbody || !usuarioLogado) return;

  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-3);padding:24px">Carregando...</td></tr>`;

  const { data, error } = await supabase
    .from('solicitacoes')
    .select('*')
    .eq('EmailSolicitante', usuarioLogado.email)
    .order('DataEnvio', { ascending: false });

  if (error || !data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-3);padding:24px">Nenhuma solicitação encontrada.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map((row, i) => {
    const protocolo = '#' + new Date(row.DataEnvio).getFullYear() + '-' + String(i + 1).padStart(3, '0');
    const status    = (row.Status || 'Pendente').toLowerCase();
    const dataFmt   = formatDate((row.DataEnvio || '').slice(0, 10));
    return `
      <tr data-status="${row.Status || 'Pendente'}">
        <td><span class="mono">${protocolo}</span></td>
        <td>${row.Cliente || ''}</td>
        <td>${row.Equipamento || ''}</td>
        <td>${dataFmt}</td>
        <td><span class="status-badge ${status}">${row.Status || 'Pendente'}</span></td>
        <td><button class="btn-icon" title="Ver detalhes"><i class="fa-solid fa-eye"></i></button></td>
      </tr>`;
  }).join('');
}

// ══════════════════════════════════════════════
//  NOVA SOLICITAÇÃO / FILTRO
// ══════════════════════════════════════════════
function novaSolicitacao() {
  const responsavel = document.getElementById('f-responsavel')?.value;
  document.querySelectorAll('input[type=text], input[type=number], input[type=date], textarea')
    .forEach(el => { if (el.id !== 'f-responsavel') el.value = ''; });
  if (document.getElementById('f-responsavel')) document.getElementById('f-responsavel').value = responsavel;
  document.querySelectorAll('select').forEach(s => s.selectedIndex = 0);
  selectedTipo = 'Novo';
  document.querySelectorAll('.toggle-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
  document.querySelectorAll('.field-error').forEach(el => el.classList.remove('field-error'));
  document.querySelectorAll('.field-error-msg').forEach(el => el.remove());
  const fl = document.getElementById('file-list');
  if (fl) fl.innerHTML = '';
  currentStep = 1;
  goStep(1);
}

function filterHistory(btn, status) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('#history-body tr').forEach(row => {
    row.style.display = (status === 'all' || row.dataset.status === status) ? '' : 'none';
  });
}

/* ============================================
   APP.JS — Solicitação de Comodato AkzoNobel
   ============================================ */

// ── SUPABASE ──────────────────────────────────
const SUPABASE_URL = 'https://ydpnqohphxnueudydjbg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkcG5xb2hwaHhudWV1ZHlkamJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NDQ4OTUsImV4cCI6MjA5NDQyMDg5NX0.y0_Fs3jcXDI0ov-CWTALcmUOHYQ4XeEDwKEaNiUVeLc';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Estado ────────────────────────────────────
let currentStep = 1;
let selectedTipo = 'Novo';
let usuarioLogado = null;
let files = [];

// ── Init ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setDate();
  mostrarLogin();
  carregarHistorico();
});

// ══════════════════════════════════════════════
// UTILITÁRIOS
// ══════════════════════════════════════════════

function setDate() {
  const el = document.getElementById('topbar-date');
  if (!el) return;
  el.textContent = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

function maskCNPJ(input) {
  let value = input.value.replace(/\D/g, '');
  value = value.replace(/(\d{2})(\d)/, '$1.$2');
  value = value.replace(/(\d{3})(\d)/, '$1.$2');
  value = value.replace(/(\d{3})(\d)/, '$1/$2');
  value = value.replace(/(\d{4})(\d)/, '$1-$2');
  input.value = value;
}

// ══════════════════════════════════════════════
// LOGIN
// ══════════════════════════════════════════════

function mostrarLogin() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('app-shell').classList.add('hidden');
}

async function fazerLogin() {
  const email = document.getElementById('login-email').value.trim();
  const senha = document.getElementById('login-senha').value;
  const erro = document.getElementById('login-erro');

  erro.classList.add('hidden');

  if (!email || !senha) {
    erro.textContent = 'Preencha o e-mail e senha.';
    erro.classList.remove('hidden');
    return;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: senha
  });

  if (error) {
    erro.textContent = 'E-mail ou senha incorretos.';
    erro.classList.remove('hidden');
    return;
  }

  const user = data.user;
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    erro.textContent = 'Perfil do usuário não encontrado.';
    erro.classList.remove('hidden');
    return;
  }

  usuarioLogado = {
    id: user.id,
    email: user.email,
    nome: profile.nome,
    cargo: profile.cargo,
    gerente_email: profile.gerente_email,
    lider_email: profile.lider_email
  };

  document.getElementById('user-nome').textContent = profile.nome;
  document.getElementById('user-cargo').textContent = profile.cargo;
  document.getElementById('user-iniciais').textContent = 
    profile.nome.split(' ').map(n => n[0]).join('').substring(0, 2);

  document.getElementById('f-responsavel').value = profile.nome;

  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app-shell').classList.remove('hidden');
  goStep(1);
}

async function fazerLogout() {
  await supabase.auth.signOut();
  usuarioLogado = null;
  document.getElementById('login-email').value = '';
  document.getElementById('login-senha').value = '';
  mostrarLogin();
}

// ══════════════════════════════════════════════
// NAVEGAÇÃO
// ══════════════════════════════════════════════

function showView(view, el) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  const target = document.getElementById('view-' + view);
  if (target) target.classList.remove('hidden');

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');

  const titles = {
    nova: 'Nova solicitação',
    historico: 'Minhas solicitações',
    aguardando: 'Aguardando aprovação',
    contratos: 'Contratos gerados'
  };

  const titleEl = document.getElementById('topbar-title');
  if (titleEl) titleEl.textContent = titles[view] || '';

  return false;
}

// ══════════════════════════════════════════════
// STEPPER
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
    if (s < activeStep) step.classList.add('done');
    if (s === activeStep) step.classList.add('active');
  });

  document.querySelectorAll('.step-connector').forEach((conn, i) => {
    conn.classList.toggle('done', i < activeStep - 1);
  });
}

// ══════════════════════════════════════════════
// TOGGLES E SELECTS
// ══════════════════════════════════════════════

function selectToggle(btn) {
  btn.parentElement.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectedTipo = btn.dataset.value;
}

// ══════════════════════════════════════════════
// VALIDAÇÃO
// ══════════════════════════════════════════════

const OBRIGATORIOS = {
  1: [
    { id: 'f-sap', label: 'Cód SAP' },
    { id: 'f-cliente', label: 'Nome do cliente' },
    { id: 'f-linha', label: 'Linha de produto' },
  ],
  2: [
    { id: 'f-razao', label: 'Razão social' },
    { id: 'f-cnpj', label: 'CNPJ' },
    { id: 'f-end-cod', label: 'Endereço do comodatário' },
    { id: 'f-contato', label: 'Contato' },
    { id: 'f-dtini', label: 'Início de vigência' },
    { id: 'f-dtfim', label: 'Fim de vigência' },
  ],
  3: [
    { id: 'f-equip', label: 'Equipamento' },
  ],
};

function validarStep(step) {
  const campos = OBRIGATORIOS[step];
  if (!campos) return true;

  let valido = true;

  // Limpa erros anteriores
  campos.forEach(({ id }) => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('field-error');
    const hint = document.getElementById('err-' + id);
    if (hint) hint.remove();
  });

  // Valida campos
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
    if (primeiro) {
      primeiro.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  return valido;
}

// ══════════════════════════════════════════════
// ARQUIVOS
// ══════════════════════════════════════════════

function dragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add('drag-over');
}

function dragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

function dropFile(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  handleFiles(e.dataTransfer.files);
}

function handleFiles(fileList) {
  for (let file of Array.from(fileList)) {
    if (file.size > 10 * 1024 * 1024) {
      alert('Arquivo muito grande! Máximo 10MB.');
      continue;
    }
    files.push(file);
  }
  updateFileList();
}

function updateFileList() {
  const list = document.getElementById('file-list');
  list.innerHTML = '';
  files.forEach((file, i) => {
    const div = document.createElement('div');
    div.className = 'file-item';
    div.innerHTML = `
      <span>${file.name}</span>
      <button onclick="removerArquivo(${i})" class="btn-icon"><i class="fa-solid fa-xmark"></i></button>
    `;
    list.appendChild(div);
  });
}

function removerArquivo(index) {
  files.splice(index, 1);
  updateFileList();
}

// ══════════════════════════════════════════════
// REVISÃO
// ══════════════════════════════════════════════

function fillReview() {
  document.getElementById('review-cliente').innerHTML = `
    <div class="review-item"><strong>Cliente:</strong> ${document.getElementById('f-cliente').value}</div>
    <div class="review-item"><strong>SAP:</strong> ${document.getElementById('f-sap').value}</div>
    <div class="review-item"><strong>Tipo:</strong> ${selectedTipo}</div>
    <div class="review-item"><strong>Linha:</strong> ${document.getElementById('f-linha').value}</div>
  `;

  document.getElementById('review-contrato').innerHTML = `
    <div class="review-item"><strong>Razão social:</strong> ${document.getElementById('f-razao').value}</div>
    <div class="review-item"><strong>CNPJ:</strong> ${document.getElementById('f-cnpj').value}</div>
    <div class="review-item"><strong>Período:</strong> ${document.getElementById('f-dtini').value} a ${document.getElementById('f-dtfim').value}</div>
  `;

  document.getElementById('review-equip').innerHTML = `
    <div class="review-item"><strong>Equipamento:</strong> ${document.getElementById('f-equip').value}</div>
    <div class="review-item"><strong>Quantidade:</strong> ${document.getElementById('f-qtd').value}</div>
    <div class="review-item"><strong>Valor:</strong> R$ ${parseFloat(document.getElementById('f-valor').value || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
    ${document.getElementById('f-obs').value ? `<div class="review-item"><strong>Obs:</strong> ${document.getElementById('f-obs').value}</div>` : ''}
    ${files.length ? `<div class="review-item"><strong>Anexos:</strong> ${files.length} arquivo(s)</div>` : ''}
  `;
}

// ══════════════════════════════════════════════
// ENVIO
// ══════════════════════════════════════════════

function buildPayload() {
  return {
    Cliente: document.getElementById('f-cliente').value,
    SAP: document.getElementById('f-sap').value,
    Tipo: selectedTipo,
    Linha: document.getElementById('f-linha').value,
    RazaoSocial: document.getElementById('f-razao').value,
    CNPJ: document.getElementById('f-cnpj').value,
    EnderecoComodatario: document.getElementById('f-end-cod').value,
    Contato: document.getElementById('f-contato').value,
    DataInicio: document.getElementById('f-dtini').value,
    DataFim: document.getElementById('f-dtfim').value,
    LocalAssinatura: document.getElementById('f-local').value,
    Equipamento: document.getElementById('f-equip').value,
    Quantidade: document.getElementById('f-qtd').value,
    Valor: document.getElementById('f-valor').value,
    Observacoes: document.getElementById('f-obs').value,
    Volume2024: document.getElementById('f-volume').value,
    Media2024: document.getElementById('f-media').value,
    Responsavel: document.getElementById('f-responsavel').value
  };
}

async function enviarSolicitacao() {
  if (!validarStep(4)) return;

  const btn = document.querySelector('.btn-submit');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';

  try {
    const payload = buildPayload();
    const protocolo = `#${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;

    const { error } = await supabase.from('solicitacoes').insert([{
      usuario_id: usuarioLogado.id,
      protocolo,
      cliente: payload.Cliente,
      cnpj: payload.CNPJ,
      sap: payload.SAP,
      tipo: payload.Tipo,
      linha: payload.Linha,
      razao_social: payload.RazaoSocial,
      endereco_comodatario: payload.EnderecoComodatario,
      contato: payload.Contato,
      data_inicio: payload.DataInicio,
      data_fim: payload.DataFim,
      local_assinatura: payload.LocalAssinatura,
      equipamento: payload.Equipamento,
      quantidade: payload.Quantidade,
      valor: payload.Valor,
      observacoes: payload.Observacoes,
      volume_2024: payload.Volume2024,
      media_2024: payload.Media2024,
      responsavel: payload.Responsavel,
      status: 'Pendente',
      aprovado_por: usuarioLogado.gerente_email,
      data_envio: new Date().toISOString()
    }]);

    if (error) throw error;

    await new Promise(r => setTimeout(r, 1200));
    document.getElementById('success-ref-num').textContent = protocolo;
    goStep(5);

  } catch (err) {
    alert('Erro ao enviar.\n\n' + err.message);
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Enviar para aprovação';
  }
}

function novaSolicitacao() {
  document.querySelectorAll('input, select, textarea').forEach(el => {
    if (el.type === 'checkbox' || el.type === 'radio') el.checked = false;
    else el.value = '';
  });
  files = [];
  selectedTipo = 'Novo';
  currentStep = 1;
  updateFileList();
  goStep(1);
}

// ══════════════════════════════════════════════
// HISTÓRICO
// ══════════════════════════════════════════════

async function carregarHistorico() {
  if (!usuarioLogado) return;

  const { data } = await supabase
    .from('solicitacoes')
    .select('*')
    .eq('usuario_id', usuarioLogado.id)
    .order('data_envio', { ascending: false });

  if (data && data.length) {
    renderHistorico(data);
    renderAguardando(data.filter(s => s.status === 'Pendente'));
    renderContratos(data.filter(s => s.status === 'Aprovado'));
  }
}

function renderHistorico(data) {
  const tbody = document.getElementById('history-body');
  tbody.innerHTML = data.map(solic => `
    <tr data-status="${solic.status}">
      <td><span class="mono">${solic.protocolo}</span></td>
      <td>${solic.cliente}</td>
      <td>${solic.equipamento}</td>
      <td>${new Date(solic.data_envio).toLocaleDateString('pt-BR')}</td>
      <td><span class="status-badge ${solic.status.toLowerCase()}">${solic.status}</span></td>
      <td><button class="btn-icon" title="Ver detalhes"><i class="fa-solid fa-eye"></i></button></td>
    </tr>
  `).join('');
}

function filterHistory(btn, status) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  document.querySelectorAll('#history-body tr').forEach(tr => {
    tr.style.display = status === 'all' || tr.dataset.status === status ? '' : 'none';
  });
}

function renderAguardando(data) {
  const container = document.getElementById('pending-list');
  if (!data.length) {
    container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-clock"></i><p>Nenhuma solicitação aguardando aprovação</p></div>';
    return;
  }
  container.innerHTML = data.map(s => `
    <div class="pending-item">
      <div class="pending-icon"><i class="fa-solid fa-clock"></i></div>
      <div class="pending-info">
        <div class="pending-title">${s.cliente} — ${s.equipamento}</div>
        <div class="pending-meta">Protocolo <span class="mono">${s.protocolo}</span> • Enviado em ${new Date(s.data_envio).toLocaleDateString('pt-BR')}</div>
        <div class="pending-approver">Aguardando aprovação de <strong>${s.aprovado_por}</strong></div>
      </div>
      <div class="pending-time">${Math.floor((new Date() - new Date(s.data_envio)) / (1000*60*60*24))} dias</div>
    </div>
  `).join('');
}

function renderContratos(data) {
  const container = document.getElementById('contracts-list');
  if (!data.length) {
    container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-file-word"></i><p>Nenhum contrato gerado</p></div>';
    return;
  }
  container.innerHTML = data.map(s => `
    <div class="contract-item">
      <div class="contract-icon"><i class="fa-solid fa-file-word"></i></div>
      <div class="contract-info">
        <div class="contract-name">Contrato_Comodato_${s.cliente.replace(/[^a-zA-Z0-9]/g,'_')}.docx</div>
        <div class="contract-meta">${s.cliente} • Gerado em ${new Date(s.data_envio).toLocaleDateString('pt-BR')}</div>
      </div>
      <button class="btn btn-ghost btn-sm">
        <i class="fa-solid fa-download"></i> Baixar
      </button>
    </div>
  `).join('');
}

// ══════════════════════════════════════════════
// EVENTOS GLOBAIS
// ══════════════════════════════════════════════

document.addEventListener('keydown', e => {
  const loginVisivel = !document.getElementById('login-screen').classList.contains('hidden');
  if (e.key === 'Enter' && loginVisivel) fazerLogin();
});

document.addEventListener('input', e => {
  if (e.target.classList.contains('field-error')) {
    e.target.classList.remove('field-error');
    const msg = document.getElementById('err-' + e.target.id);
    if (msg) msg.remove();
  }
});

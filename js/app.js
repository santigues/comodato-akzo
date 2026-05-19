/* ============================================
   APP.JS — Solicitação de Comodato
   ============================================ */

// Guard para evitar carregar duas vezes
if (window.__APP_LOADED__) {
  console.log('app.js já foi carregado, ignorando');
} else {

// Aguarda o Supabase estar disponível
if (!window.supabase) {
  console.error('Supabase não carregado');
  throw new Error('Supabase library must be loaded first');
}

// ── SUPABASE CONFIG ───────────────────────────
const SUPABASE_URL = 'https://ydpnqohphxnueudydjbg.supabase.co';  // ← substitua
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkcG5xb2hwaHhudWV1ZHlkamJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NDQ4OTUsImV4cCI6MjA5NDQyMDg5NX0.y0_Fs3jcXDI0ov-CWTALcmUOHYQ4XeEDwKEaNiUVeLc';                      // ← substitua
if (!window.supabase_instance) {
  window.supabase_instance = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}
const supabase = window.supabase_instance;

// ── Estado ────────────────────────────────────
let currentStep   = 1;
let selectedTipo  = 'Novo';
let usuarioLogado = null;
let registroEmAndamento = null;

// ── Init ──────────────────────────────────────
console.log('✓ app.js carregado');

function initApp() {
  console.log('✓ App inicializando');
  setDate();
  mostrarLogin();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

function setDate() {
  const el = document.getElementById('topbar-date');
  if (!el) return;
  el.textContent = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  });
}

// ══════════════════════════════════════════════
//  LOGIN / CADASTRO
// ══════════════════════════════════════════════
function mostrarLogin() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('app-shell').classList.add('hidden');
  document.getElementById('login-form').classList.remove('hidden');
  document.getElementById('cadastro-form').classList.add('hidden');
  document.getElementById('verificacao-form').classList.add('hidden');
  document.getElementById('login-erro').classList.add('hidden');
}

function mostraLogin() {
  document.getElementById('login-form').classList.remove('hidden');
  document.getElementById('cadastro-form').classList.add('hidden');
  document.getElementById('verificacao-form').classList.add('hidden');
  document.getElementById('login-erro').classList.add('hidden');
}

function mostraRegistro() {
  document.getElementById('login-form').classList.add('hidden');
  document.getElementById('cadastro-form').classList.remove('hidden');
  document.getElementById('verificacao-form').classList.add('hidden');
  document.getElementById('login-erro').classList.add('hidden');
  document.getElementById('cadastro-nome').value = '';
  document.getElementById('cadastro-cargo').value = '';
  document.getElementById('cadastro-email').value = '';
  document.getElementById('cadastro-senha').value = '';
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

  const { data: perfil, error: erroP } = await supabase
    .from('usuarios')
    .select('Nome, Cargo, Iniciais')
    .eq('ID', data.user.id)
    .single();

  console.log('Resultado da busca:', { perfil, erroP });

  // Se houver erro ao buscar (tabela não existe, sem dados), usa valores padrão
  const perfilFinal = (!erroP && perfil) ? perfil : {
    Nome: email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1),
    Cargo: 'Usuário',
    Iniciais: email.substring(0, 2).toUpperCase()
  };

  usuarioLogado = { email: data.user.email || email, ...perfilFinal };

  document.getElementById('user-nome').textContent     = perfilFinal.Nome;
  document.getElementById('user-cargo').textContent    = perfilFinal.Cargo;
  document.getElementById('user-iniciais').textContent = perfilFinal.Iniciais;
  document.getElementById('f-responsavel').value       = perfilFinal.Nome;

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

async function fazerCadastro() {
  const nome = document.getElementById('cadastro-nome').value.trim();
  const cargo = document.getElementById('cadastro-cargo').value.trim();
  const email = document.getElementById('cadastro-email').value.trim();
  const senha = document.getElementById('cadastro-senha').value;
  const erro = document.getElementById('login-erro');
  erro.classList.add('hidden');

  if (!nome || !cargo || !email || !senha) {
    erro.textContent = 'Preencha todos os campos.';
    erro.classList.remove('hidden');
    return;
  }

  if (senha.length < 6) {
    erro.textContent = 'A senha deve ter pelo menos 6 caracteres.';
    erro.classList.remove('hidden');
    return;
  }

  const { data, error } = await supabase.auth.signUp({ email, password: senha });

  if (error) {
    erro.textContent = error.message || 'Erro ao cadastrar.';
    erro.classList.remove('hidden');
    return;
  }

  registroEmAndamento = { userId: data.user.id, nome, cargo, email };
  document.getElementById('login-form').classList.add('hidden');
  document.getElementById('cadastro-form').classList.add('hidden');
  document.getElementById('verificacao-form').classList.remove('hidden');
}

async function verificarEmail() {
  const codigo = document.getElementById('verificacao-codigo').value.trim();
  const erro = document.getElementById('login-erro');
  erro.classList.add('hidden');

  if (!codigo || codigo.length !== 6) {
    erro.textContent = 'Digite um código de 6 dígitos.';
    erro.classList.remove('hidden');
    return;
  }

  if (!registroEmAndamento) {
    erro.textContent = 'Erro na verificação. Tente cadastrar novamente.';
    erro.classList.remove('hidden');
    return;
  }

  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email: registroEmAndamento.email,
      token: codigo,
      type: 'signup'
    });

    if (error) {
      erro.textContent = 'Código inválido. Tente novamente.';
      erro.classList.remove('hidden');
      return;
    }

    // Criar registro na tabela usuarios
    const { error: erroInsert } = await supabase
      .from('usuarios')
      .insert([{
        ID: registroEmAndamento.userId,
        Nome: registroEmAndamento.nome,
        Cargo: registroEmAndamento.cargo,
        Iniciais: registroEmAndamento.nome.substring(0, 2).toUpperCase(),
        Gerente_ID: 'b2001abd-63a9-4c58-aaeb-3f449b0192f3'
      }]);

    if (erroInsert) {
      console.error('Erro ao criar perfil:', erroInsert);
    }

    // Fazer login automático
    usuarioLogado = { 
      email: registroEmAndamento.email, 
      Nome: registroEmAndamento.nome, 
      Cargo: registroEmAndamento.cargo, 
      Iniciais: registroEmAndamento.nome.substring(0, 2).toUpperCase()
    };

    document.getElementById('user-nome').textContent = registroEmAndamento.nome;
    document.getElementById('user-cargo').textContent = registroEmAndamento.cargo;
    document.getElementById('user-iniciais').textContent = registroEmAndamento.nome.substring(0, 2).toUpperCase();
    document.getElementById('f-responsavel').value = registroEmAndamento.nome;

    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app-shell').classList.remove('hidden');

    goStep(1);
    carregarHistorico();

  } catch (err) {
    erro.textContent = 'Erro ao verificar código: ' + err.message;
    erro.classList.remove('hidden');
  }
}

async function reenviarEmail() {
  if (!registroEmAndamento) return;
  
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: registroEmAndamento.email
  });

  const erro = document.getElementById('login-erro');
  if (error) {
    erro.textContent = 'Erro ao reenviar: ' + error.message;
  } else {
    erro.textContent = '✓ Código reenviado para seu e-mail!';
    erro.style.color = 'var(--success)';
  }
  erro.classList.remove('hidden');
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
  if (view === 'aguardando') carregarAguardando('gerente');
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
    { key: 'Volume',           val: get('f-volume') ? get('f-volume') + ' L' : '' },
    { key: 'Média',            val: get('f-media')  ? get('f-media')  + ' L/mês' : '' },
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
    Volume:               parseFloat(get('f-volume')) || 0,
    Media:                parseFloat(get('f-media'))  || 0,
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
        <td><button class="btn-icon" title="Ver detalhes" onclick="verDetalhes(${JSON.stringify(row).replace(/"/g, '&quot;')})"><i class="fa-solid fa-eye"></i></button></td>
      </tr>`;
  }).join('');
}

async function carregarAguardando(filtro = 'gerente') {
  const container = document.getElementById('pending-list');
  if (!container) return;

  container.innerHTML = `<div style="text-align:center;color:var(--text-3);padding:24px">Carregando...</div>`;

  const { data, error } = await supabase
    .from('solicitacoes')
    .select('*')
    .eq('Status', filtro === 'gerente' ? 'Pendente' : (filtro === 'lider' ? 'Aprovado Gerente' : 'Aprovado Lider'))
    .order('DataEnvio', { ascending: false });

  if (error || !data || data.length === 0) {
    container.innerHTML = `<div style="text-align:center;color:var(--text-3);padding:24px">Nenhuma solicitação nesta etapa.</div>`;
    return;
  }

  container.innerHTML = data.map(row => {
    const diasDecorridos = Math.floor((Date.now() - new Date(row.DataEnvio)) / (1000 * 60 * 60 * 24));
    const dataFmt = formatDate((row.DataEnvio || '').slice(0, 10));
    return `
      <div class="pending-item" style="margin-bottom:16px;padding:16px;border:1px solid var(--border);border-radius:8px;cursor:pointer" onclick="verDetalhes(${JSON.stringify(row).replace(/"/g, '&quot;')})">
        <div class="pending-icon"><i class="fa-solid fa-clock"></i></div>
        <div class="pending-info" style="flex:1">
          <div class="pending-title">${row.Cliente} — ${row.Equipamento}</div>
          <div class="pending-meta">Protocolo <span class="mono">#${new Date(row.DataEnvio).getFullYear()}-${String(data.indexOf(row) + 1).padStart(3, '0')}</span> • Enviado em ${dataFmt}</div>
          <div class="pending-approver">Status: <strong>${row.Status || 'Pendente'}</strong></div>
        </div>
        <div class="pending-time">${diasDecorridos} dia${diasDecorridos !== 1 ? 's' : ''}</div>
      </div>`;
  }).join('');
}

function filterAguardando(btn, filtro) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  carregarAguardando(filtro);
}

function verDetalhes(solicitacao) {
  const modal = document.getElementById('modal-detalhes');
  const content = document.getElementById('modal-content');
  
  const html = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div><strong>Cód SAP:</strong> ${solicitacao.CodSAP || '-'}</div>
      <div><strong>Tipo:</strong> ${solicitacao.TipoSolicitacao || '-'}</div>
      <div><strong>Cliente:</strong> ${solicitacao.Cliente || '-'}</div>
      <div><strong>Responsável:</strong> ${solicitacao.Responsavel || '-'}</div>
      <div><strong>Linha Produto:</strong> ${solicitacao.LinhaProduto || '-'}</div>
      <div><strong>Status:</strong> ${solicitacao.Status || '-'}</div>
      <div style="grid-column:1/-1"><strong>Endereço Cliente:</strong> ${solicitacao.Endereco || '-'}</div>
      <div style="grid-column:1/-1"><strong>Razão Social:</strong> ${solicitacao.RazaoSocial || '-'}</div>
      <div><strong>CNPJ:</strong> ${solicitacao.CNPJ || '-'}</div>
      <div><strong>Contato:</strong> ${solicitacao.ContatoNomeEmailTel || '-'}</div>
      <div><strong>Vigência:</strong> ${solicitacao.DataInicio || '-'} até ${solicitacao.DataTermino || '-'}</div>
      <div><strong>Local Assinatura:</strong> ${solicitacao.LocalAssinatura || '-'}</div>
      <div style="grid-column:1/-1"><strong>Equipamento:</strong> ${solicitacao.Equipamento || '-'}</div>
      <div><strong>Quantidade:</strong> ${solicitacao.Quantidade || '-'}</div>
      <div><strong>Valor Estimado:</strong> R$ ${parseFloat(solicitacao.ValorEstimado || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
      <div style="grid-column:1/-1"><strong>Observações:</strong> ${solicitacao.Observacoes || '-'}</div>
      <div><strong>Volume:</strong> ${solicitacao.Volume || '-'} L</div>
      <div><strong>Média:</strong> ${solicitacao.Media || '-'} L/mês</div>
    </div>
  `;
  
  content.innerHTML = html;
  modal.classList.remove('hidden');
}

function fecharModal() {
  document.getElementById('modal-detalhes').classList.add('hidden');
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

// Expor funções globalmente
window.fazerLogin = fazerLogin;
window.fazerLogout = fazerLogout;
window.mostraLogin = mostraLogin;
window.mostraRegistro = mostraRegistro;
window.fazerCadastro = fazerCadastro;
window.verificarEmail = verificarEmail;
window.reenviarEmail = reenviarEmail;
window.showView = showView;
window.goStep = goStep;
window.selectToggle = selectToggle;
window.maskCNPJ = maskCNPJ;
window.dragOver = dragOver;
window.dragLeave = dragLeave;
window.dropFile = dropFile;
window.handleFiles = handleFiles;
window.novaSolicitacao = novaSolicitacao;
window.filterHistory = filterHistory;
window.enviarSolicitacao = enviarSolicitacao;
window.carregarAguardando = carregarAguardando;
window.filterAguardando = filterAguardando;
window.verDetalhes = verDetalhes;
window.fecharModal = fecharModal;

console.log('✓ App.js funções expostas globalmente');

// Marca como carregado
window.__APP_LOADED__ = true;

}

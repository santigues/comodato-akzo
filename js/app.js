/* ============================================
   APP.JS — Solicitação de Comodato
   ============================================ */

// ── SUPABASE ──────────────────────────────────
const SUPABASE_URL = 'https://ydpnqohphxnueudydjbg.supabase.co';

const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkcG5xb2hwaHhudWV1ZHlkamJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NDQ4OTUsImV4cCI6MjA5NDQyMDg5NX0.y0_Fs3jcXDI0ov-CWTALcmUOHYQ4XeEDwKEaNiUVeLc';

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

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
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

// ══════════════════════════════════════════════
// LOGIN
// ══════════════════════════════════════════════

function mostrarLogin() {

  document.getElementById('login-screen')
    .classList.remove('hidden');

  document.getElementById('app-shell')
    .classList.add('hidden');
}

async function fazerLogin() {

  const email =
    document.getElementById('login-email').value.trim();

  const senha =
    document.getElementById('login-senha').value;

  const erro =
    document.getElementById('login-erro');

  erro.classList.add('hidden');

  if (!email || !senha) {

    erro.textContent =
      'Preencha o e-mail e senha.';

    erro.classList.remove('hidden');

    return;
  }

  const { data, error } =
    await supabase.auth.signInWithPassword({
      email,
      password: senha
    });

  if (error) {

    erro.textContent =
      'E-mail ou senha incorretos.';

    erro.classList.remove('hidden');

    return;
  }

  const user = data.user;

  const { data: profile, error: profileError } =
    await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

  if (profileError || !profile) {

    erro.textContent =
      'Perfil do usuário não encontrado.';

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

  document.getElementById('user-nome').textContent =
    profile.nome;

  document.getElementById('user-cargo').textContent =
    profile.cargo;

  document.getElementById('user-iniciais').textContent =
    profile.nome
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2);

  document.getElementById('f-responsavel').value =
    profile.nome;

  document.getElementById('login-screen')
    .classList.add('hidden');

  document.getElementById('app-shell')
    .classList.remove('hidden');

  goStep(1);
}

async function fazerLogout() {

  await supabase.auth.signOut();

  usuarioLogado = null;

  document.getElementById('login-email').value = '';

  document.getElementById('login-senha').value = '';

  mostrarLogin();
}

document.addEventListener('keydown', e => {

  const loginVisivel =
    !document.getElementById('login-screen')
      .classList.contains('hidden');

  if (e.key === 'Enter' && loginVisivel) {
    fazerLogin();
  }
});

// ══════════════════════════════════════════════
// NAVEGAÇÃO
// ══════════════════════════════════════════════

function showView(view, el) {

  document.querySelectorAll('.view')
    .forEach(v => v.classList.add('hidden'));

  const target =
    document.getElementById('view-' + view);

  if (target) {
    target.classList.remove('hidden');
  }

  document.querySelectorAll('.nav-item')
    .forEach(n => n.classList.remove('active'));

  if (el) {
    el.classList.add('active');
  }

  const titles = {
    nova: 'Nova solicitação',
    historico: 'Minhas solicitações',
    aguardando: 'Aguardando aprovação',
    contratos: 'Contratos gerados'
  };

  const titleEl =
    document.getElementById('topbar-title');

  if (titleEl) {
    titleEl.textContent = titles[view] || '';
  }

  return false;
}

// ══════════════════════════════════════════════
// STEPPER
// ══════════════════════════════════════════════

function goStep(n) {

  if (n > currentStep && !validarStep(currentStep)) {
    return;
  }

  document.querySelectorAll('[id^="screen-"]')
    .forEach(s => s.classList.add('hidden'));

  const target =
    document.getElementById('screen-' + n);

  if (target) {
    target.classList.remove('hidden');
  }

  currentStep = n;

  updateStepper(n);

  if (n === 4) {
    fillReview();
  }

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

function updateStepper(activeStep) {

  document.querySelectorAll('.step[data-step]')
    .forEach(step => {

      const s = parseInt(step.dataset.step);

      step.classList.remove('active', 'done');

      if (s < activeStep) {
        step.classList.add('done');
      }

      if (s === activeStep) {
        step.classList.add('active');
      }
    });

  document.querySelectorAll('.step-connector')
    .forEach((conn, i) => {

      conn.classList.toggle(
        'done',
        i < activeStep - 1
      );
    });
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
    { id: 'f-local', label: 'Local de assinatura' },
  ],

  3: [
    { id: 'f-equip', label: 'Equipamento' },
    { id: 'f-qtd', label: 'Quantidade' },
  ],
};

function validarStep(step) {

  const campos = OBRIGATORIOS[step];

  if (!campos) return true;

  let valido = true;

  campos.forEach(({ id }) => {

    const el =
      document.getElementById(id);

    if (el) {
      el.classList.remove('field-error');
    }

    const hint =
      document.getElementById('err-' + id);

    if (hint) {
      hint.remove();
    }
  });

  campos.forEach(({ id, label }) => {

    const el =
      document.getElementById(id);

    if (!el || el.value.trim()) {
      return;
    }

    el.classList.add('field-error');

    const msg =
      document.createElement('div');

    msg.id = 'err-' + id;

    msg.className = 'field-error-msg';

    msg.textContent =
      `${label} é obrigatório`;

    el.parentElement.appendChild(msg);

    valido = false;
  });

  if (!valido) {

    const primeiro =
      document.querySelector('.field-error');

    if (primeiro) {

      primeiro.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }

  return valido;
}

document.addEventListener('input', e => {

  if (e.target.classList.contains('field-error')) {

    e.target.classList.remove('field-error');

    const msg =
      document.getElementById(
        'err-' + e.target.id
      );

    if (msg) {
      msg.remove();
    }
  }
});

// ══════════════════════════════════════════════
// ENVIO
// ══════════════════════════════════════════════

async function enviarSolicitacao() {

  const btn =
    document.querySelector('.btn-submit');

  btn.disabled = true;

  btn.innerHTML =
    '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';

  try {

    const payload = buildPayload();

    const { error } =
      await supabase
        .from('solicitacoes')
        .insert([
          {
            usuario_id: usuarioLogado.id,
            cliente: payload.Cliente,
            cnpj: payload.CNPJ,
            status: 'Pendente',
            aprovado_por: usuarioLogado.gerente_email
          }
        ]);

    if (error) {
      throw error;
    }

    await new Promise(r => setTimeout(r, 1200));

    const ref =
      '#' +
      new Date().getFullYear() +
      '-' +
      String(Date.now()).slice(-4);

    document.getElementById('success-ref-num')
      .textContent = ref;

    goStep(5);

  } catch (err) {

    alert(
      'Erro ao enviar.\n\n' + err.message
    );

    btn.disabled = false;

    btn.innerHTML =
      '<i class="fa-solid fa-paper-plane"></i> Enviar para aprovação';
  }
}

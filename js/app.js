/* ============================================
   APP.JS — Solicitação de Comodato
   ============================================ */
 
// ── CONFIGURAÇÃO ──────────────────────────────
// Cole aqui a URL gerada ao publicar o Apps Script como Web App:
// Extensions > Deploy > New deployment > Web App > Copy URL
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby5IJBgtcm6M_IGeCTP3r448PH0UASF1zz66pNilGeNwf3QQahw5vEixKKIvPwbTjw/exec';
 
// ── Estado atual ─────────────────────────────
let currentStep = 1;
let selectedTipo = 'Novo';
 
// ── Init ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setDate();
  goStep(1);
});
 
function setDate() {
  const el = document.getElementById('topbar-date');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  });
}
 
// ── Navegação entre views (sidebar) ──────────
function showView(view, el) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  const target = document.getElementById('view-' + view);
  if (target) target.classList.remove('hidden');
 
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');
 
  const titles = {
    nova:       'Nova solicitação',
    historico:  'Minhas solicitações',
    aguardando: 'Aguardando aprovação',
    contratos:  'Contratos gerados',
  };
  const titleEl = document.getElementById('topbar-title');
  if (titleEl) titleEl.textContent = titles[view] || '';
 
  return false;
}
 
// ── Stepper ───────────────────────────────────
function goStep(n) {
  document.querySelectorAll('[id^="screen-"]').forEach(s => s.classList.add('hidden'));
  const target = document.getElementById('screen-' + n);
  if (target) target.classList.remove('hidden');
 
  currentStep = n;
  updateStepper(n);
 
  if (n === 4) fillReview();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
 
function updateStepper(activeStep) {
  const steps = document.querySelectorAll('.step[data-step]');
  const connectors = document.querySelectorAll('.step-connector');
 
  steps.forEach(step => {
    const s = parseInt(step.dataset.step);
    step.classList.remove('active', 'done');
    if (s < activeStep)  step.classList.add('done');
    if (s === activeStep) step.classList.add('active');
  });
 
  connectors.forEach((conn, i) => {
    conn.classList.toggle('done', i < activeStep - 1);
  });
}
 
// ── Toggle tipo (Novo / Reativação) ───────────
function selectToggle(el) {
  el.closest('.toggle-group').querySelectorAll('.toggle-btn')
    .forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  selectedTipo = el.dataset.value;
}
 
// ── Máscara CNPJ ──────────────────────────────
function maskCNPJ(input) {
  let v = input.value.replace(/\D/g, '').substring(0, 14);
  v = v.replace(/^(\d{2})(\d)/, '$1.$2');
  v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
  v = v.replace(/\.(\d{3})(\d)/, '.$1/$2');
  v = v.replace(/(\d{4})(\d)/, '$1-$2');
  input.value = v;
}
 
// ── Drop zone ─────────────────────────────────
function dragOver(e) {
  e.preventDefault();
  document.getElementById('drop-zone').classList.add('over');
}
 
function dragLeave() {
  document.getElementById('drop-zone').classList.remove('over');
}
 
function dropFile(e) {
  e.preventDefault();
  document.getElementById('drop-zone').classList.remove('over');
  handleFiles(e.dataTransfer.files);
}
 
function handleFiles(files) {
  const list = document.getElementById('file-list');
  Array.from(files).forEach(file => {
    const item = document.createElement('div');
    item.className = 'file-item';
    item.innerHTML = `
      <i class="fa-solid fa-paperclip"></i>
      <span>${file.name}</span>
      <span style="color:var(--text-3);font-size:11px;margin-left:4px">${formatBytes(file.size)}</span>
      <i class="fa-solid fa-xmark file-remove" onclick="this.parentElement.remove()"></i>
    `;
    list.appendChild(item);
  });
}
 
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
 
// ── Preencher revisão ─────────────────────────
function fillReview() {
  const get = id => (document.getElementById(id)?.value || '').trim();
 
  renderReview('review-cliente', [
    { key: 'Cód SAP',         val: get('f-sap') },
    { key: 'Tipo',            val: selectedTipo },
    { key: 'Cliente',         val: get('f-cliente') },
    { key: 'Endereço',        val: get('f-endereco') },
    { key: 'Responsável',     val: get('f-responsavel') },
    { key: 'Linha de produto',val: get('f-linha') },
    { key: 'Volume 2024',     val: get('f-volume') ? get('f-volume') + ' L' : '' },
    { key: 'Média 2024',      val: get('f-media')  ? get('f-media')  + ' L/mês' : '' },
  ]);
 
  renderReview('review-contrato', [
    { key: 'Razão social',    val: get('f-razao') },
    { key: 'CNPJ',            val: get('f-cnpj') },
    { key: 'Endereço',        val: get('f-end-cod') },
    { key: 'Contato',         val: get('f-contato') },
    { key: 'Início vigência', val: formatDate(get('f-dtini')) },
    { key: 'Fim vigência',    val: formatDate(get('f-dtfim')) },
    { key: 'Local assinatura',val: get('f-local') },
  ]);
 
  const valor = parseFloat(get('f-valor'));
  renderReview('review-equip', [
    { key: 'Equipamento',     val: get('f-equip') },
    { key: 'Quantidade',      val: get('f-qtd') },
    { key: 'Valor estimado',  val: !isNaN(valor) && valor > 0 ? 'R$ ' + valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '' },
    { key: 'Observações',     val: get('f-obs') },
  ]);
}
 
function renderReview(containerId, rows) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = rows.map(({ key, val }) => `
    <div class="review-row">
      <span class="review-key">${key}</span>
      <span class="review-val${!val ? ' empty' : ''}">${val || 'Não informado'}</span>
    </div>
  `).join('');
}
 
function formatDate(val) {
  if (!val) return '';
  const [y, m, d] = val.split('-');
  return `${d}/${m}/${y}`;
}
 
// ── Enviar solicitação ────────────────────────
async function enviarSolicitacao() {
  const btn = document.querySelector('.btn-submit');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';

  try {
    const payload = buildPayload();

    // Usa um form oculto para contornar CORS do Apps Script
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = APPS_SCRIPT_URL;
    form.target = 'hidden-iframe';

    const input = document.createElement('input');
    input.type  = 'hidden';
    input.name  = 'data';
    input.value = JSON.stringify(payload);
    form.appendChild(input);

    // iframe oculto para não redirecionar a página
    let iframe = document.getElementById('hidden-iframe');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.name = 'hidden-iframe';
      iframe.id   = 'hidden-iframe';
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
    }

    document.body.appendChild(form);
    form.submit();
    form.remove();

    // Aguarda 2s (o Apps Script processa em background)
    await new Promise(r => setTimeout(r, 2000));

    // Gera protocolo local já que não conseguimos ler a resposta (CORS)
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
  };
}
 
// ── Nova solicitação ──────────────────────────
function novaSolicitacao() {
  const responsavel = document.getElementById('f-responsavel')?.value;
  document.querySelectorAll('input[type=text], input[type=number], input[type=date], textarea')
    .forEach(el => { if (el.id !== 'f-responsavel') el.value = ''; });
  if (document.getElementById('f-responsavel')) {
    document.getElementById('f-responsavel').value = responsavel;
  }
 
  document.querySelectorAll('select').forEach(s => s.selectedIndex = 0);
 
  selectedTipo = 'Novo';
  document.querySelectorAll('.toggle-btn').forEach((b, i) => {
    b.classList.toggle('active', i === 0);
  });
 
  const fl = document.getElementById('file-list');
  if (fl) fl.innerHTML = '';
 
  goStep(1);
}
 
// ── Filtro do histórico ───────────────────────
function filterHistory(btn, status) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
 
  document.querySelectorAll('#history-body tr').forEach(row => {
    const rowStatus = row.dataset.status;
    row.style.display = (status === 'all' || rowStatus === status) ? '' : 'none';
  });
}

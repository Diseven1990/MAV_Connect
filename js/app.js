const state = {
  noticias: [],
  reacoes: [],
  pesquisa: '',
  noticiaAberta: null,
};

const els = {
  feed: document.getElementById('newsFeed'),
  empty: document.getElementById('emptyState'),
  search: document.getElementById('searchInput'),
  searchModal: document.getElementById('searchModal'),
  closeSearch: document.getElementById('closeSearch'),
  modal: document.getElementById('newsModal'),
  closeModal: document.getElementById('closeModal'),
  modalImage: document.getElementById('modalImage'),
  modalDate: document.getElementById('modalDate'),
  modalTitle: document.getElementById('modalTitle'),
  modalBody: document.getElementById('modalBody'),
  modalAttachments: document.getElementById('modalAttachments'),
  fireBtn: document.getElementById('fireBtn'),
  fireText: document.getElementById('fireText'),
};

const placeholder = 'assets/placeholder.svg';

init();

async function init() {
  garantirDispositivo();
  bindEvents();
  await carregarNoticias();
}

function bindEvents() {
  if (els.search) {
    els.search.addEventListener('input', (event) => {
      state.pesquisa = event.target.value.trim().toLowerCase();
      render();
    });
  }

  document.querySelectorAll('.nav-item[data-view]').forEach((item) => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach((nav) => nav.classList.remove('active'));
      item.classList.add('active');
      const view = item.dataset.view;

      if (view === 'home') {
        fecharPesquisaSilenciosa();
        limparPesquisa();
        fecharModal(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      if (view === 'search') abrirPesquisa();
    });
  });

  if (els.closeSearch) els.closeSearch.addEventListener('click', fecharPesquisa);
  if (els.searchModal) els.searchModal.addEventListener('click', (event) => {
    if (event.target === els.searchModal) fecharPesquisa();
  });

  els.closeModal.addEventListener('click', () => fecharModal(true));
  els.modal.addEventListener('click', (event) => {
    if (event.target === els.modal) fecharModal(true);
  });

  if (els.fireBtn) els.fireBtn.addEventListener('click', reagirComFogo);
  if (els.fireText) els.fireText.addEventListener('click', reagirComFogo);

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (!els.modal.classList.contains('hidden')) fecharModal(true);
      if (els.searchModal && !els.searchModal.classList.contains('hidden')) fecharPesquisa();
    }
  });

  window.addEventListener('popstate', () => {
    const noticiaId = getNoticiaIdFromUrl();
    if (noticiaId) abrirNoticia(noticiaId, false);
    else if (!els.modal.classList.contains('hidden')) fecharModal(false);
  });
}

function abrirPesquisa() {
  if (!els.searchModal) return;
  els.searchModal.classList.remove('hidden');
  els.searchModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  setTimeout(() => els.search?.focus(), 80);
}

function fecharPesquisa() {
  if (!els.searchModal) return;
  limparPesquisa();
  els.searchModal.classList.add('hidden');
  els.searchModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}

function fecharPesquisaSilenciosa() {
  if (!els.searchModal) return;
  els.searchModal.classList.add('hidden');
  els.searchModal.setAttribute('aria-hidden', 'true');
  if (els.modal.classList.contains('hidden')) document.body.classList.remove('modal-open');
}

function limparPesquisa() {
  state.pesquisa = '';
  if (els.search) els.search.value = '';
  render();
}

async function carregarNoticias() {
  try {
    const { data, error } = await supabaseClient
      .from('noticias')
      .select('*')
      .eq('publicado', true)
      .order('data_publicacao', { ascending: false });

    if (error) throw error;
    state.noticias = data || [];

    await carregarReacoes();
    render();

    const noticiaId = getNoticiaIdFromUrl();
    if (noticiaId) setTimeout(() => abrirNoticia(noticiaId, false), 250);
  } catch (error) {
    console.error(error);
    els.feed.innerHTML = `
      <div class="error-card">
        <strong>Não foi possível carregar os conteúdos.</strong>
        <p>Confirma a URL, a anon key e as permissões RLS no Supabase.</p>
      </div>
    `;
  }
}

async function carregarReacoes() {
  try {
    const { data, error } = await supabaseClient.from('reacoes').select('*');
    if (error) throw error;
    state.reacoes = data || [];
  } catch (error) {
    state.reacoes = [];
  }
}

function filtrarNoticias() {
  return state.noticias.filter((noticia) => {
    const texto = `${noticia.titulo || ''} ${noticia.resumo || ''} ${noticia.conteudo || ''}`.toLowerCase();
    return !state.pesquisa || texto.includes(state.pesquisa);
  });
}

function render() {
  const noticias = filtrarNoticias();
  els.feed.innerHTML = noticias.length ? noticias.map(cardTemplate).join('') : '';
  els.empty.classList.toggle('hidden', noticias.length > 0);

  document.querySelectorAll('[data-open-news]').forEach((card) => {
    card.addEventListener('click', () => abrirNoticia(card.dataset.openNews, true));
  });
}

function cardTemplate(noticia) {
  const titulo = escapeHtml(noticia.titulo || 'Sem título');
  const resumo = escapeHtml(criarResumo(noticia));
  const imagem = noticia.capa_url || placeholder;
  const data = formatarData(noticia.data_publicacao || noticia.created_at);
  const novo = isNovo(noticia.data_publicacao || noticia.created_at);
  const tempo = tempoLeitura(noticia.conteudo || '');
  const fogos = contarReacoes(noticia.id);

  return `
    <button class="news-card" type="button" data-open-news="${notiaIdSafe(noticia.id)}">
      <div class="card-image">
        <img src="${imagem}" alt="" loading="lazy" onerror="this.src='${placeholder}'" />
        ${novo ? '<span class="new-badge">Novo</span>' : ''}
      </div>
      <div class="card-body">
        <div class="card-meta">
          <span>${data}</span>
        </div>
        <h3>${titulo}</h3>
        <p>${resumo}</p>
        ${fogos > 0 ? `<div class="card-footer"><span>🔥 ${fogos}</span></div>` : ''}
      </div>
    </button>
  `;
}

async function abrirNoticia(id, atualizarUrl = true) {
  const noticia = state.noticias.find((item) => String(item.id) === String(id));
  if (!noticia) return;

  state.noticiaAberta = noticia;

  if (atualizarUrl) {
    const url = `${window.location.pathname}?id=${encodeURIComponent(id)}`;
    history.pushState({ noticiaId: id }, '', url);
  }

  els.modalImage.src = noticia.capa_url || placeholder;
  els.modalDate.textContent = formatarData(noticia.data_publicacao || noticia.created_at);
  els.modalTitle.textContent = noticia.titulo || 'Sem título';
  els.modalBody.innerHTML = textoParaHtml(noticia.conteudo || '');
  els.modalAttachments.innerHTML = '';

  atualizarEstadoFogo(noticia.id);

  await carregarAnexos(id);
  await registarVisualizacao(id);

  els.modal.classList.remove('hidden');
  els.modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}

function fecharModal(atualizarUrl = true) {
  if (atualizarUrl) history.replaceState({}, '', window.location.pathname);
  state.noticiaAberta = null;
  els.modal.classList.add('hidden');
  els.modal.setAttribute('aria-hidden', 'true');
  if (!els.searchModal || els.searchModal.classList.contains('hidden')) document.body.classList.remove('modal-open');
}

async function carregarAnexos(noticiaId) {
  try {
    const { data, error } = await supabaseClient
      .from('anexos')
      .select('*')
      .eq('noticia_id', noticiaId)
      .order('nome', { ascending: true });

    if (error) throw error;
    if (!data || !data.length) return;

    els.modalAttachments.innerHTML = `
      <h4>Anexos</h4>
      ${data.map((anexo) => `
        <a href="${anexo.url}" target="_blank" rel="noopener noreferrer">
          <span>↗</span>
          ${escapeHtml(anexo.nome || 'Abrir anexo')}
        </a>
      `).join('')}
    `;
  } catch (error) {
    console.error(error);
  }
}

async function registarVisualizacao(noticiaId) {
  const deviceId = garantirDispositivo();

  try {
    const { error } = await supabaseClient
      .from('visualizacoes')
      .insert({
        conteudo_id: noticiaId,
        device_id: deviceId,
      });

    if (error) throw error;
  } catch (error) {
    console.warn('Visualização não registada:', error);
  }
}

async function reagirComFogo() {
  const noticia = state.noticiaAberta;
  if (!noticia) return;

  const deviceId = garantirDispositivo();
  const jaExiste = state.reacoes.some(
    r => String(r.conteudo_id) === String(noticia.id) && r.device_id === deviceId
  );

  if (jaExiste) {
    atualizarEstadoFogo(noticia.id);
    return;
  }

  if (els.fireBtn) els.fireBtn.disabled = true;
  if (els.fireText) els.fireText.textContent = '🔥 A registar...';

  try {
    const { error } = await supabaseClient
      .from('reacoes')
      .insert({
        conteudo_id: noticia.id,
        device_id: deviceId,
      });

    if (error && error.code !== '23505') throw error;

    state.reacoes.push({
      conteudo_id: noticia.id,
      device_id: deviceId,
      created_at: new Date().toISOString(),
    });

    atualizarEstadoFogo(noticia.id);
    render();
  } catch (error) {
    console.warn('Reação não registada:', error);

    // Não mostra mensagens técnicas ao formando. Volta ao estado normal.
    if (els.fireBtn) els.fireBtn.disabled = false;
    if (els.fireText) els.fireText.textContent = 'Clique aqui se gostou deste conteúdo.';
  }
}

function atualizarEstadoFogo(noticiaId) {
  const total = contarReacoes(noticiaId);
  const deviceId = garantirDispositivo();
  const jaReagiu = state.reacoes.some(
    r => String(r.conteudo_id) === String(noticiaId) && r.device_id === deviceId
  );

  if (!els.fireBtn || !els.fireText) return;

  els.fireBtn.classList.toggle('active', jaReagiu);
  els.fireBtn.disabled = jaReagiu;

  els.fireText.textContent = jaReagiu
    ? `${total} ${total === 1 ? 'pessoa gostou deste conteúdo.' : 'pessoas gostaram deste conteúdo.'}`
    : 'Clique aqui se gostou deste conteúdo.';
}

function contarReacoes(noticiaId) {
  return state.reacoes.filter(r => String(r.conteudo_id) === String(noticiaId)).length;
}

function garantirDispositivo() {
  const key = 'marketing-update-device-id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

function chaveFogo(noticiaId) { return `marketing-update-fire-${noticiaId}`; }
function notiaIdSafe(id) { return String(id).replaceAll('"', '&quot;'); }

function criarResumo(noticia) {
  const texto = limparTexto(noticia.resumo || noticia.conteudo || '');
  if (texto.length <= 180) return texto;
  const curto = texto.slice(0, 180);
  return `${curto.slice(0, curto.lastIndexOf(' '))}...`;
}

function limparTexto(texto) { return String(texto).replace(/\s+/g, ' ').trim(); }
function tempoLeitura(texto) {
  const palavras = limparTexto(texto).split(' ').filter(Boolean).length;
  const minutos = Math.max(1, Math.ceil(palavras / 180));
  return `${minutos} min`;
}
function getNoticiaIdFromUrl() { return new URLSearchParams(window.location.search).get('id'); }
function formatarData(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}
function isNovo(value) {
  if (!value) return false;
  return Date.now() - new Date(value).getTime() < 1000 * 60 * 60 * 24 * 7;
}
function textoParaHtml(texto) {
  return escapeHtml(texto).split('\n').filter(Boolean).map((paragrafo) => `<p>${paragrafo}</p>`).join('');
}
function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

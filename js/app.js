const state = {
  noticias: [],
  categoria: 'Todos',
  pesquisa: '',
  noticiaAberta: null,
};

const els = {
  feed: document.getElementById('newsFeed'),
  featured: document.getElementById('featuredFeed'),
  resultCount: document.getElementById('resultCount'),
  empty: document.getElementById('emptyState'),
  search: document.getElementById('searchInput'),
  searchModal: document.getElementById('searchModal'),
  closeSearch: document.getElementById('closeSearch'),
  tabs: document.querySelectorAll('.tab'),
  themeToggle: document.getElementById('themeToggle'),
  modal: document.getElementById('newsModal'),
  closeModal: document.getElementById('closeModal'),
  modalImage: document.getElementById('modalImage'),
  modalCategory: document.getElementById('modalCategory'),
  modalDate: document.getElementById('modalDate'),
  modalTitle: document.getElementById('modalTitle'),
  modalSummary: document.getElementById('modalSummary'),
  modalBody: document.getElementById('modalBody'),
  modalAttachments: document.getElementById('modalAttachments'),
};

const placeholder = 'assets/placeholder.svg';
const BASE_URL = 'https://diseven1990.github.io/MAV_Connect/';

init();

async function init() {
  setupTheme();
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

  els.tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      els.tabs.forEach((item) => item.classList.remove('active'));
      tab.classList.add('active');
      state.categoria = tab.dataset.category;
      render();
    });
  });

  document.querySelectorAll('.nav-item[data-view]').forEach((item) => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach((nav) => nav.classList.remove('active'));
      item.classList.add('active');

      const view = item.dataset.view;

      if (view === 'home') {
        fecharPesquisaSilenciosa();
        limparFiltrosPesquisa();
        fecharModal(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      if (view === 'featured') {
        fecharPesquisaSilenciosa();
        limparFiltrosPesquisa();

        const featured = document.getElementById('featuredSection');

        if (featured && featured.style.display !== 'none') {
          featured.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }

      if (view === 'search') abrirPesquisa();
    });
  });

  if (els.closeSearch) els.closeSearch.addEventListener('click', fecharPesquisa);

  if (els.searchModal) {
    els.searchModal.addEventListener('click', (event) => {
      if (event.target === els.searchModal) fecharPesquisa();
    });
  }

  els.closeModal.addEventListener('click', () => fecharModal(true));

  els.modal.addEventListener('click', (event) => {
    if (event.target === els.modal) fecharModal(true);
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (!els.modal.classList.contains('hidden')) fecharModal(true);
      if (els.searchModal && !els.searchModal.classList.contains('hidden')) fecharPesquisa();
    }
  });

  window.addEventListener('popstate', () => {
    const noticiaId = getNoticiaIdFromUrl();

    if (noticiaId) {
      abrirNoticia(noticiaId, false);
    } else if (!els.modal.classList.contains('hidden')) {
      fecharModal(false);
    }
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

  limparFiltrosPesquisa();

  els.searchModal.classList.add('hidden');
  els.searchModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}

function fecharPesquisaSilenciosa() {
  if (!els.searchModal) return;

  els.searchModal.classList.add('hidden');
  els.searchModal.setAttribute('aria-hidden', 'true');

  if (els.modal.classList.contains('hidden')) {
    document.body.classList.remove('modal-open');
  }
}

function limparFiltrosPesquisa() {
  state.pesquisa = '';

  if (els.search) {
    els.search.value = '';
  }

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
    render();

    const noticiaId = getNoticiaIdFromUrl();

    if (noticiaId) {
      setTimeout(() => abrirNoticia(noticiaId, false), 250);
    }
  } catch (error) {
    console.error(error);

    if (els.resultCount) els.resultCount.textContent = 'Erro ao carregar';

    els.feed.innerHTML = `
      <div class="error-card">
        <strong>Não foi possível carregar as notícias.</strong>
        <p>Confirma a URL, a anon key e as permissões RLS no Supabase.</p>
      </div>
    `;
  }
}

function filtrarNoticias() {
  return state.noticias.filter((noticia) => {
    const categoriaOk = state.categoria === 'Todos' || noticia.categoria === state.categoria;
    const texto = `${noticia.titulo || ''} ${noticia.resumo || ''} ${noticia.conteudo || ''}`.toLowerCase();
    const pesquisaOk = !state.pesquisa || texto.includes(state.pesquisa);

    return categoriaOk && pesquisaOk;
  });
}

function render() {
  const noticias = filtrarNoticias();
  const destaques = noticias.filter((n) => n.destaque && dentroDosDiasDeDestaque(n.data_publicacao || n.created_at));
  const normais = noticias.filter((n) => !destaques.some((d) => d.id === n.id));

  const featuredSection = document.getElementById('featuredSection');

  if (featuredSection) {
    featuredSection.style.display = destaques.length ? 'block' : 'none';
  }

  els.featured.innerHTML = destaques.map((n) => cardTemplate(n, true)).join('');
  els.feed.innerHTML = normais.length ? normais.map((noticia) => cardTemplate(noticia, false)).join('') : '';

  if (els.resultCount) {
    els.resultCount.textContent = `${noticias.length} ${noticias.length === 1 ? 'novidade' : 'novidades'}`;
  }

  els.empty.classList.toggle('hidden', noticias.length > 0);

  document.querySelectorAll('[data-open-news]').forEach((card) => {
    card.addEventListener('click', () => abrirNoticia(card.dataset.openNews, true));
  });
}

function dentroDosDiasDeDestaque(value) {
  if (!value) return false;

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) return false;

  return ((Date.now() - d.getTime()) / 86400000) <= 5;
}

function cardTemplate(noticia, destaque) {
  const categoria = escapeHtml(noticia.categoria || 'MAV');
  const titulo = escapeHtml(noticia.titulo || 'Sem título');
  const resumo = escapeHtml(noticia.resumo || '');
  const imagem = noticia.capa_url || placeholder;
  const data = formatarData(noticia.data_publicacao || noticia.created_at);
  const novo = isNovo(noticia.data_publicacao || noticia.created_at);

  return `
    <button class="news-card ${destaque ? 'featured-card' : ''}" type="button" data-open-news="${noticia.id}">
      <div class="card-image">
        <img src="${imagem}" alt="" loading="lazy" onerror="this.src='${placeholder}'" />
        ${novo ? '<span class="new-badge">Novo</span>' : ''}
      </div>
      <div class="card-body">
        <div class="card-meta">
          <span class="pill ${categoriaClass(categoria)}">${categoria}</span>
          <span>${data}</span>
        </div>
        <h3>${titulo}</h3>
        <p>${resumo}</p>
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
  els.modalCategory.textContent = noticia.categoria || 'MAV';
  els.modalCategory.className = `pill ${categoriaClass(noticia.categoria || '')}`;
  els.modalDate.textContent = formatarData(noticia.data_publicacao || noticia.created_at);
  els.modalTitle.textContent = noticia.titulo || 'Sem título';

  if (els.modalSummary) {
    els.modalSummary.textContent = '';
    els.modalSummary.style.display = 'none';
  }

  els.modalBody.innerHTML = textoParaHtml(noticia.conteudo || '');
  els.modalAttachments.innerHTML = '';

  await carregarAnexos(id);
  await registarVisualizacao(id);

  els.modal.classList.remove('hidden');
  els.modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}

function fecharModal(atualizarUrl = true) {
  if (atualizarUrl) {
    history.replaceState({}, '', window.location.pathname);
  }

  state.noticiaAberta = null;

  els.modal.classList.add('hidden');
  els.modal.setAttribute('aria-hidden', 'true');

  if (els.modalSummary) {
    els.modalSummary.textContent = '';
    els.modalSummary.style.display = 'none';
  }

  if (!els.searchModal || els.searchModal.classList.contains('hidden')) {
    document.body.classList.remove('modal-open');
  }
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
  try {
    await supabaseClient.from('visualizacoes').insert({ noticia_id: noticiaId });
  } catch (error) {
    console.warn('Visualização não registada:', error);
  }
}

function setupTheme() {
  const saved = localStorage.getItem('mav-theme');

  if (saved) {
    document.documentElement.dataset.theme = saved;
  }

  updateThemeButton();

  els.themeToggle.addEventListener('click', () => {
    const current = document.documentElement.dataset.theme || 'auto';
    const next = current === 'light' ? 'dark' : current === 'dark' ? 'auto' : 'light';

    if (next === 'auto') {
      delete document.documentElement.dataset.theme;
      localStorage.removeItem('mav-theme');
    } else {
      document.documentElement.dataset.theme = next;
      localStorage.setItem('mav-theme', next);
    }

    updateThemeButton();
  });
}

function updateThemeButton() {
  const theme = document.documentElement.dataset.theme || 'auto';

  els.themeToggle.textContent = theme === 'light' ? '☀' : theme === 'dark' ? '☾' : '◐';
}

function getNoticiaIdFromUrl() {
  return new URLSearchParams(window.location.search).get('id');
}

function formatarData(value) {
  if (!value) return '';

  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function isNovo(value) {
  if (!value) return false;

  const diff = Date.now() - new Date(value).getTime();

  return diff < 1000 * 60 * 60 * 24 * 7;
}

function categoriaClass(categoria) {
  const normalized = categoria.toLowerCase();

  if (normalized.includes('marketing')) return 'pill-marketing';
  if (normalized.includes('audiovisuais')) return 'pill-audiovisuais';
  if (normalized.includes('videojogos')) return 'pill-videojogos';

  return '';
}

function textoParaHtml(texto) {
  return escapeHtml(texto)
    .split('\n')
    .filter(Boolean)
    .map((paragrafo) => `<p>${paragrafo}</p>`)
    .join('');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
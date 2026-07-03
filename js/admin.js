const adminState = {
  noticias: [],
  views: [],
  reacoes: [],
};

const $ = (id) => document.getElementById(id);
const els = {
  loginView: $('loginView'), adminView: $('adminView'), loginForm: $('loginForm'), loginEmail: $('loginEmail'), loginPassword: $('loginPassword'), loginStatus: $('loginStatus'),
  logoutBtn: $('logoutBtn'), userEmail: $('userEmail'), form: $('newsForm'), formTitle: $('formTitle'), formStatus: $('formStatus'), submitBtn: $('submitBtn'), resetFormBtn: $('resetFormBtn'), refreshBtn: $('refreshBtn'),
  newsId: $('newsId'), titulo: $('titulo'), conteudo: $('conteudo'), autor: $('autor'), imagem: $('imagem'), anexo: $('anexo'), publicado: $('publicado'),
  list: $('adminNewsList'), statNoticias: $('statNoticias'), statViews: $('statViews'), statUnique: $('statUnique'), statFire: $('statFire')
};

initAdmin();

async function initAdmin(){
  bindAdminEvents();
  const { data } = await supabaseClient.auth.getSession();
  if(data.session) showAdmin(data.session.user); else showLogin();
}

function bindAdminEvents(){
  els.loginForm.addEventListener('submit', login);
  els.logoutBtn.addEventListener('click', logout);
  els.form.addEventListener('submit', saveNews);
  els.resetFormBtn.addEventListener('click', resetForm);
  els.refreshBtn.addEventListener('click', loadAdminData);
}

function showLogin(){ els.loginView.classList.remove('hidden'); els.adminView.classList.add('hidden'); }
async function showAdmin(user){ els.loginView.classList.add('hidden'); els.adminView.classList.remove('hidden'); els.userEmail.textContent = user?.email || 'Sessão ativa'; await loadAdminData(); }

async function login(e){
  e.preventDefault();
  els.loginStatus.textContent = 'A entrar...';
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email: els.loginEmail.value.trim(), password: els.loginPassword.value });
  if(error){ els.loginStatus.textContent = 'Credenciais inválidas ou sem permissões.'; return; }
  els.loginStatus.textContent = '';
  showAdmin(data.user);
}

async function logout(){ await supabaseClient.auth.signOut(); showLogin(); }

async function loadAdminData(){
  els.list.innerHTML = '<p class="status">A carregar...</p>';

  const { data, error } = await supabaseClient.from('noticias').select('*').order('data_publicacao', { ascending:false });
  if(error){ els.list.innerHTML = `<p class="status">Erro ao carregar: ${escapeHtml(error.message)}</p>`; return; }
  adminState.noticias = data || [];

  await loadViews();
  await loadReactions();
  renderList();
  renderStats();
}

async function loadViews(){
  try{
    const { data, error } = await supabaseClient.from('visualizacoes').select('*');
    if(error) throw error;
    adminState.views = data || [];
  }catch(error){
    console.warn('Não foi possível carregar visualizações:', error);
    adminState.views = [];
  }
}

async function loadReactions(){
  try{
    const { data, error } = await supabaseClient.from('reacoes').select('*');
    if(error) throw error;
    adminState.reacoes = data || [];
  }catch(error){
    console.warn('Não foi possível carregar reações:', error);
    adminState.reacoes = [];
  }
}

function renderStats(){
  const publicadas = adminState.noticias.filter(n => n.publicado).length;
  els.statNoticias.textContent = publicadas;
  els.statViews.textContent = adminState.views.length.toLocaleString('pt-PT');
  els.statUnique.textContent = uniqueDevices(adminState.views).toLocaleString('pt-PT');
  els.statFire.textContent = adminState.reacoes.length.toLocaleString('pt-PT');
}

function renderList(){
  if(!adminState.noticias.length){ els.list.innerHTML = '<p class="status">Ainda não existem conteúdos.</p>'; return; }

  els.list.innerHTML = adminState.noticias.map(n => {
    const stats = statsFor(n.id);
    return `
    <article class="news-row">
      <div>
        <h3>${escapeHtml(n.titulo || 'Sem título')}</h3>
        <p>${escapeHtml(criarResumo(n))}</p>
        <div class="badges">
          <span class="badge">${n.publicado ? 'Publicado' : 'Arquivado'}</span>
          <span class="badge">${formatDate(n.data_publicacao || n.created_at)}</span>
          <span class="badge">${stats.total} visualizações</span>
          <span class="badge">${stats.unicos} dispositivos</span>
          <span class="badge">🔥 ${stats.fogos}</span>
          <span class="badge">${stats.taxa}% taxa de reação</span>
          <span class="badge">${tempoLeitura(n.conteudo || '')}</span>
        </div>
      </div>
      <div class="actions">
        <button class="ghost" type="button" data-edit="${n.id}">Editar</button>
        ${n.publicado ? `<button class="ghost" type="button" data-whatsapp="${n.id}">WhatsApp</button>` : ''}
        <button class="ghost" type="button" data-archive="${n.id}">${n.publicado ? 'Arquivar' : 'Republicar'}</button>
        <button class="danger" type="button" data-delete="${n.id}">Eliminar</button>
      </div>
    </article>`;
  }).join('');

  document.querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', () => editNews(btn.dataset.edit)));
  document.querySelectorAll('[data-whatsapp]').forEach(btn => btn.addEventListener('click', () => shareWhatsApp(btn.dataset.whatsapp)));
  document.querySelectorAll('[data-archive]').forEach(btn => btn.addEventListener('click', () => togglePublished(btn.dataset.archive)));
  document.querySelectorAll('[data-delete]').forEach(btn => btn.addEventListener('click', () => deleteNews(btn.dataset.delete)));
}

async function saveNews(e){
  e.preventDefault();
  els.formStatus.textContent = 'A guardar...';
  els.submitBtn.disabled = true;

  try{
    const id = els.newsId.value || null;
    const old = id ? adminState.noticias.find(n => n.id === id) : null;
    let capa_url = old?.capa_url || null;

    if(els.imagem.files[0]) capa_url = await uploadFile('imagens', els.imagem.files[0], 'capas');

    const conteudo = els.conteudo.value.trim();
    const payload = {
      titulo: els.titulo.value.trim(),
      resumo: resumoAutomatico(conteudo),
      conteudo,
      categoria: 'Marketing',
      autor: els.autor.value.trim() || null,
      capa_url,
      destaque: false,
      publicado: els.publicado.checked,
      data_publicacao: id ? (old?.data_publicacao || new Date().toISOString()) : new Date().toISOString()
    };

    let noticiaId = id;
    if(id){
      const { error } = await supabaseClient.from('noticias').update(payload).eq('id', id);
      if(error) throw error;
    } else {
      const { data, error } = await supabaseClient.from('noticias').insert(payload).select('id').single();
      if(error) throw error;
      noticiaId = data.id;
    }

    if(els.anexo.files[0]){
      const file = els.anexo.files[0];
      const url = await uploadFile('anexos', file, 'ficheiros');
      const { error } = await supabaseClient.from('anexos').insert({ noticia_id:noticiaId, nome:file.name, url, tipo:file.type || 'ficheiro' });
      if(error) throw error;
    }

    els.formStatus.textContent = id ? 'Conteúdo atualizado.' : 'Conteúdo publicado.';
    resetForm();
    await loadAdminData();
  } catch(error){
    console.error(error);
    els.formStatus.textContent = `Erro: ${error.message || error}`;
  } finally {
    els.submitBtn.disabled = false;
  }
}

async function uploadFile(bucket, file, folder){
  const clean = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]/g,'-');
  const path = `${folder}/${Date.now()}-${Math.random().toString(16).slice(2)}-${clean}`;
  const { error } = await supabaseClient.storage.from(bucket).upload(path, file, { upsert:false });
  if(error) throw error;
  const { data } = supabaseClient.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

function editNews(id){
  const n = adminState.noticias.find(item => String(item.id) === String(id));
  if(!n) return;
  els.newsId.value = n.id;
  els.titulo.value = n.titulo || '';
  els.conteudo.value = n.conteudo || '';
  els.autor.value = n.autor || '';
  els.publicado.checked = !!n.publicado;
  els.imagem.value = '';
  els.anexo.value = '';
  els.formTitle.textContent = 'Editar conteúdo';
  els.submitBtn.textContent = 'Guardar alterações';
  window.scrollTo({ top: 0, behavior:'smooth' });
}

function resetForm(){
  els.form.reset();
  els.newsId.value = '';
  els.publicado.checked = true;
  els.formTitle.textContent = 'Novo conteúdo';
  els.submitBtn.textContent = 'Publicar';
}

async function togglePublished(id){
  const n = adminState.noticias.find(item => String(item.id) === String(id));
  if(!n) return;
  const { error } = await supabaseClient.from('noticias').update({ publicado: !n.publicado }).eq('id', id);
  if(error){ alert(error.message); return; }
  await loadAdminData();
}

async function deleteNews(id){
  const n = adminState.noticias.find(item => String(item.id) === String(id));
  if(!confirm(`Eliminar definitivamente "${n?.titulo || 'este conteúdo'}"?`)) return;
  const { error } = await supabaseClient.from('noticias').delete().eq('id', id);
  if(error){ alert(error.message); return; }
  await loadAdminData();
}

function statsFor(id){
  const rows = adminState.views.filter(v => String(v.conteudo_id) === String(id));
  const fogos = adminState.reacoes.filter(r => String(r.conteudo_id) === String(id)).length;
  const unicos = uniqueDevices(rows);
  const taxa = rows.length ? Math.round((fogos / rows.length) * 100) : 0;
  return { total: rows.length, unicos, fogos, taxa };
}

function uniqueDevices(rows){
  const ids = rows.map(v => v.device_id).filter(Boolean);
  return ids.length ? new Set(ids).size : 0;
}

function resumoAutomatico(texto){
  const clean = limparTexto(texto);
  if(clean.length <= 180) return clean;
  const curto = clean.slice(0, 180);
  return `${curto.slice(0, curto.lastIndexOf(' '))}...`;
}

function criarResumo(n){ return resumoAutomatico(n.resumo || n.conteudo || ''); }
function limparTexto(texto){ return String(texto).replace(/\s+/g,' ').trim(); }
function tempoLeitura(texto){ const palavras = limparTexto(texto).split(' ').filter(Boolean).length; return `${Math.max(1, Math.ceil(palavras / 180))} min`; }
function formatDate(value){ if(!value) return ''; return new Intl.DateTimeFormat('pt-PT',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(value)); }
function escapeHtml(value){ return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;'); }

const PUBLIC_SITE = 'https://diseven1990.github.io/marketing-formandos/';

function shareWhatsApp(id) {
  const noticia = adminState.noticias.find(n => String(n.id) === String(id));
  if (!noticia) return;

  const link = `${PUBLIC_SITE}?id=${encodeURIComponent(id)}`;
  const mensagem = `📢 Novo conteúdo disponível\n\n${noticia.titulo}\n\n${criarResumo(noticia)}\n\nLer aqui:\n${link}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(mensagem)}`;
  window.open(whatsappUrl, '_blank');
}

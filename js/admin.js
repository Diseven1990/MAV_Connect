const adminState = { noticias: [] };

const $ = (id) => document.getElementById(id);
const els = {
  loginView: $('loginView'), adminView: $('adminView'), loginForm: $('loginForm'), loginEmail: $('loginEmail'), loginPassword: $('loginPassword'), loginStatus: $('loginStatus'),
  logoutBtn: $('logoutBtn'), userEmail: $('userEmail'), form: $('newsForm'), formTitle: $('formTitle'), formStatus: $('formStatus'), submitBtn: $('submitBtn'), resetFormBtn: $('resetFormBtn'), refreshBtn: $('refreshBtn'),
  newsId: $('newsId'), titulo: $('titulo'), resumo: $('resumo'), conteudo: $('conteudo'), categoria: $('categoria'), autor: $('autor'), imagem: $('imagem'), anexo: $('anexo'), destaque: $('destaque'), publicado: $('publicado'),
  list: $('adminNewsList'), statNoticias: $('statNoticias'), statDestaques: $('statDestaques'), statViews: $('statViews')
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
  renderList();
  await renderStats();
}

async function renderStats(){
  const noticias = adminState.noticias;
  els.statNoticias.textContent = noticias.filter(n => n.publicado).length;
  els.statDestaques.textContent = noticias.filter(n => n.publicado && n.destaque && within5(n.data_publicacao || n.created_at)).length;
  const { count } = await supabaseClient.from('visualizacoes').select('*', { count:'exact', head:true });
  els.statViews.textContent = Number(count || 0).toLocaleString('pt-PT');
}

function renderList(){
  if(!adminState.noticias.length){ els.list.innerHTML = '<p class="status">Ainda não existem notícias.</p>'; return; }
  els.list.innerHTML = adminState.noticias.map(n => `
    <article class="news-row">
      <div>
        <h3>${escapeHtml(n.titulo || 'Sem título')}</h3>
        <p>${escapeHtml(n.resumo || '')}</p>
        <div class="badges">
          <span class="badge">${escapeHtml(n.categoria || 'MAV')}</span>
          ${n.destaque ? '<span class="badge">Destaque</span>' : ''}
          <span class="badge">${n.publicado ? 'Publicado' : 'Arquivado'}</span>
          <span class="badge">${formatDate(n.data_publicacao || n.created_at)}</span>
        </div>
      </div>
      <div class="actions">
        <button class="ghost" type="button" data-edit="${n.id}">Editar</button>
        <button class="ghost" type="button" data-archive="${n.id}">${n.publicado ? 'Arquivar' : 'Republicar'}</button>
        <button class="danger" type="button" data-delete="${n.id}">Eliminar</button>
      </div>
    </article>`).join('');

  document.querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', () => editNews(btn.dataset.edit)));
  document.querySelectorAll('[data-archive]').forEach(btn => btn.addEventListener('click', () => togglePublished(btn.dataset.archive)));
  document.querySelectorAll('[data-delete]').forEach(btn => btn.addEventListener('click', () => deleteNews(btn.dataset.delete)));
}

async function saveNews(e){
  e.preventDefault();
  els.formStatus.textContent = 'A guardar...';
  els.submitBtn.disabled = true;

  try{
    const id = els.newsId.value || null;
    let capa_url = id ? (adminState.noticias.find(n => n.id === id)?.capa_url || null) : null;

    if(els.imagem.files[0]) capa_url = await uploadFile('imagens', els.imagem.files[0], 'capas');

    const payload = {
      titulo: els.titulo.value.trim(),
      resumo: els.resumo.value.trim(),
      conteudo: els.conteudo.value.trim(),
      categoria: els.categoria.value,
      autor: els.autor.value.trim() || null,
      capa_url,
      destaque: els.destaque.checked,
      publicado: els.publicado.checked,
      data_publicacao: id ? (adminState.noticias.find(n => n.id === id)?.data_publicacao || new Date().toISOString()) : new Date().toISOString()
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

    els.formStatus.textContent = id ? 'Notícia atualizada.' : 'Notícia publicada.';
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
  const n = adminState.noticias.find(item => item.id === id);
  if(!n) return;
  els.newsId.value = n.id;
  els.titulo.value = n.titulo || '';
  els.resumo.value = n.resumo || '';
  els.conteudo.value = n.conteudo || '';
  els.categoria.value = n.categoria || 'Marketing';
  els.autor.value = n.autor || '';
  els.destaque.checked = !!n.destaque;
  els.publicado.checked = !!n.publicado;
  els.imagem.value = '';
  els.anexo.value = '';
  els.formTitle.textContent = 'Editar notícia';
  els.submitBtn.textContent = 'Guardar alterações';
  window.scrollTo({ top: 0, behavior:'smooth' });
}

function resetForm(){
  els.form.reset();
  els.newsId.value = '';
  els.publicado.checked = true;
  els.formTitle.textContent = 'Nova notícia';
  els.submitBtn.textContent = 'Publicar';
}

async function togglePublished(id){
  const n = adminState.noticias.find(item => item.id === id);
  if(!n) return;
  const { error } = await supabaseClient.from('noticias').update({ publicado: !n.publicado }).eq('id', id);
  if(error){ alert(error.message); return; }
  await loadAdminData();
}

async function deleteNews(id){
  const n = adminState.noticias.find(item => item.id === id);
  if(!confirm(`Eliminar definitivamente "${n?.titulo || 'esta notícia'}"?`)) return;
  const { error } = await supabaseClient.from('noticias').delete().eq('id', id);
  if(error){ alert(error.message); return; }
  await loadAdminData();
}

function within5(value){ if(!value) return false; return ((Date.now() - new Date(value).getTime()) / 86400000) <= 5; }
function formatDate(value){ if(!value) return ''; return new Intl.DateTimeFormat('pt-PT',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(value)); }
function escapeHtml(value){ return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;'); }

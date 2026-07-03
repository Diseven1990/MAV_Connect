Marketing Update V2

Versão adaptada para formandos.

O que mudou:
- Sem categorias.
- Sem bloco introdutório/hero.
- Feed direto de conteúdos.
- Visual branco e laranja, mais próximo da Master D.
- O formando apenas abre e lê o conteúdo.
- Reação por chama 🔥 em cada conteúdo.
- O resumo do cartão é gerado automaticamente a partir do texto principal.
- Admin com estatísticas para tutores:
  - conteúdos publicados;
  - visualizações totais;
  - dispositivos únicos;
  - reações 🔥;
  - visualizações por conteúdo;
  - dispositivos por conteúdo;
  - taxa de reação.

Ficheiros principais:
- index.html: página dos formandos.
- admin.html: painel dos tutores/admin.
- js/app.js: feed, leitura, visualizações e reações.
- js/admin.js: publicação e estatísticas.
- js/supabase.js: URL e anon key do Supabase.
- supabase-extra.sql: SQL recomendado para ativar estatísticas e reações.

Notas importantes:
1. Executa o ficheiro supabase-extra.sql no Supabase antes de testar a reação 🔥.
2. A reação é limitada por dispositivo através de localStorage e unique constraint no Supabase.
3. As visualizações contam cada abertura do conteúdo. Os dispositivos únicos ajudam a perceber o alcance real.
4. Confirma as políticas RLS das tabelas noticias, anexos, visualizacoes e reacoes.
5. Atualiza a constante PUBLIC_SITE em js/admin.js quando souberes o URL final no GitHub Pages.

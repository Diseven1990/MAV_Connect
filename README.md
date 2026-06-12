# MAV Connect V1

Primeira versão pública do feed MAV Connect.

## Configuração

1. Abrir `js/supabase.js`.
2. Substituir:

```js
const SUPABASE_URL = "COLOCAR_SUPABASE_URL_AQUI";
const SUPABASE_ANON_KEY = "COLOCAR_SUPABASE_ANON_KEY_AQUI";
```

pelos dados do Supabase.

3. Garantir que a tabela `noticias` tem estes campos:

- id
- titulo
- resumo
- conteudo
- categoria
- capa_url
- destaque
- publicado
- data_publicacao
- created_at

4. Garantir que a tabela `anexos` tem:

- id
- noticia_id
- nome
- url
- tipo

5. Garantir que a tabela `visualizacoes` tem:

- id
- noticia_id
- created_at

## Nota

As visualizações são registadas apenas quando a notícia é aberta no modal.

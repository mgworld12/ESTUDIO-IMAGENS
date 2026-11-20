# IMAGE STUDIO
Ferramentas gratuitas de imagem que rodam 100% no navegador. Fase 1, entrega A: base do site + Foto de perfil.

## Testar no computador
Módulos ES não funcionam abrindo o arquivo com duplo clique. Na pasta do projeto, rode `python -m http.server 8000` e abra http://localhost:8000
(ou use a extensão Live Server do VS Code).

## Publicar no GitHub Pages
1. Crie um repositório público (ex.: `image-studio`) e envie todos os arquivos desta pasta.
2. Em Settings > Pages, escolha "Deploy from a branch", branch `main`, pasta `/ (root)`.
3. O site fica em `https://SEU-USUARIO.github.io/image-studio/`.

## Dependências
- **gifenc 1.0.3** (MIT), em `vendor/`: codifica o GIF animado. Detalhes em `vendor/README.md`.
- O ZIP e o `.ico` são gerados por código próprio (`js/services/exportar.js`, `js/services/ico.js`); o WebP animado virá sem biblioteca.

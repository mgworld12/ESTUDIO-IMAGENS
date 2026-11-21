# IMAGE STUDIO
Ferramentas gratuitas de imagem que rodam 100% no navegador: nada é enviado a servidores.

## Ferramentas
| Ferramenta | O que faz |
|---|---|
| Foto de perfil | Recorte redondo, quadrado ou arredondado; vários tamanhos de uma vez (ZIP); presets de redes sociais; px, mm e cm com DPI; desfazer e refazer |
| Ícone de pasta | `.ico` com 7 tamanhos + script `.bat` para aplicar no Windows + instruções manuais |
| Favicon | `favicon.ico`, PNGs, `site.webmanifest` e o código HTML pronto |
| Sticker | Figurinha estática WebP 512 × 512 (≤ 100 KB) e pacote para WhatsApp |
| GIF e animação | Quadros, tempos, repetição; exporta GIF e WebP animado; importa GIF e WebP animados; sticker animado (≤ 500 KB, ≤ 10 s) |

## Testar no computador
Módulos ES não funcionam abrindo o arquivo com duplo clique. Na pasta do projeto: `python -m http.server 8000` e abra http://localhost:8000
(ou use a extensão Live Server do VS Code).

## Publicar no GitHub Pages
1. Envie todos os arquivos para o repositório.
2. Settings > Pages > "Deploy from a branch" > `main` > `/ (root)`.
3. Abra `teste.html` no endereço publicado: ele confere os arquivos, a exportação e os recursos do navegador.

## Dependências
| Biblioteca | Versão | Licença | Uso |
|---|---|---|---|
| gifenc (`vendor/`) | 1.0.3 | MIT | Codificar GIF animado |

ZIP, `.ico` e WebP animado são gerados por código próprio (`js/services/`).

## Limites conhecidos
- Medidas das redes sociais (`js/data/presets-redes.js`) vêm de guias do setor, não de fontes oficiais; confira antes de depender delas.
- WebP e JPG sempre perdem um pouco de qualidade; só PNG é sem perda. O WebP animado sem perda ainda não existe.
- A codificação de GIF e WebP roda na própria página (com progresso e cancelamento), ainda não em Web Worker.
- Importar GIF animado depende do `ImageDecoder` do navegador (Chrome e Edge; outros podem importar só o primeiro quadro).
- Baixar o pacote de figurinhas não instala nada no WhatsApp: é preciso um aplicativo de importação.

## Registro de versões
- 0.1 Base, Foto de perfil. 0.2 Favicon e Ícone de pasta. 0.3 Presets, unidades físicas e desfazer. 0.4 Sticker estático e pacote. 0.5 GIF, WebP animado, importação e sticker animado (Fase 2).

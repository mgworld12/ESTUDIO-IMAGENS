# IMAGE STUDIO
Ferramentas gratuitas de imagem que rodam 100% no navegador: nada é enviado a servidores. Funciona offline depois da primeira visita e pode ser instalado como aplicativo.

## Ferramentas
| Ferramenta | O que faz |
|---|---|
| Foto de perfil | Recorte redondo, quadrado ou arredondado; vários tamanhos de uma vez (ZIP); presets de redes sociais; px, mm e cm com DPI; desfazer e refazer; remover fundo |
| Ícone de pasta | `.ico` com 7 tamanhos + script `.bat` para aplicar no Windows + instruções manuais |
| Favicon | `favicon.ico`, PNGs, `site.webmanifest` e o código HTML pronto |
| Sticker | Figurinha estática WebP 512 × 512 (≤ 100 KB), contorno, texto, remover fundo e pacote para WhatsApp |
| GIF e animação | Quadros, tempos, repetição, edição em lote dos quadros (selecionar, inverter, girar, recortar, ajustes, texto, desfazer); GIF e WebP animado; importa GIF e WebP animados; remover fundo de todos os quadros; sticker animado (≤ 500 KB, ≤ 10 s) |
| Remover fundo (link na tela inicial) | IA local (U²-Net pequeno): recorte, suavizar, contrair/expandir, pincel, PNG/WebP/JPG |
| Converter e otimizar (link na tela inicial) | Lote de imagens para WebP, JPG, PNG, GIF ou ICO, com qualidade, redução de tamanho e comparação |

## Testar no computador
Módulos ES não funcionam abrindo o arquivo com duplo clique. Na pasta do projeto: `python -m http.server 8000` e abra http://localhost:8000
(ou use a extensão Live Server do VS Code).

## Publicar no GitHub Pages
1. Envie todos os arquivos para o repositório (arquivos acima de 25 MB não sobem pelo navegador; nenhum deste projeto passa disso).
2. Settings > Pages > "Deploy from a branch" > `main` > `/ (root)`.
3. Abra `teste.html` no endereço publicado: ele confere os arquivos, a exportação, a IA e o uso offline.
4. Para marcar a versão: Releases > "Draft a new release" > tag `v1.0.0`.

## Uso offline e instalação
- O `sw.js` guarda os arquivos do site; o motor e o modelo de IA (19 MB) são guardados no primeiro uso de "Remover fundo".
- **A cada publicação, mude `VERSAO` no `sw.js`** (ex.: `image-studio-v1.0.1`); sem isso os visitantes podem ficar com arquivos antigos.
- O botão "Instalar" aparece no topo quando o navegador permite instalar.

## Dependências
| Biblioteca | Versão | Licença | Uso |
|---|---|---|---|
| gifenc (`vendor/`) | 1.0.3 | MIT | Codificar GIF animado |
| onnxruntime-web (`vendor/ort/`) | 1.31.1 | MIT | Executar o modelo de IA (WebAssembly) |
| U²-Net pequeno `u2netp.onnx` (`vendor/modelos/`) | — | Apache-2.0 | Separar objeto e fundo |

Detalhes e licenças em `vendor/README.md`. ZIP, `.ico` e WebP animado são gerados por código próprio (`js/services/`).

## Limites conhecidos
- Medidas das redes sociais (`js/data/presets-redes.js`) vêm de guias do setor, não de fontes oficiais; confira antes de depender delas.
- WebP e JPG sempre perdem um pouco de qualidade; só PNG é sem perda. O WebP animado sem perda ainda não existe.
- O modelo de remoção de fundo é pequeno: pode errar em cabelos, pelos e objetos finos (use o pincel).
- A codificação de GIF e WebP roda na própria página (com progresso e cancelamento), ainda não em Web Worker.
- Importar GIF animado depende do `ImageDecoder` do navegador (Chrome e Edge); em outros, entra só o primeiro quadro.
- Baixar o pacote de figurinhas não instala nada no WhatsApp: é preciso um aplicativo de importação.

## Registro de versões
- 0.1 Base e Foto de perfil. 0.2 Favicon e Ícone de pasta. 0.3 Presets, unidades físicas e desfazer. 0.4 Sticker estático e pacote. 0.5 GIF, WebP animado, importação e sticker animado.
- 0.6 Converter e otimizar. 0.7 Remover fundo (IA local). 0.8 Remover fundo dentro de Perfil, Sticker e Animação.
- **1.0.0** Uso offline (PWA), instalação, ícones, README e acabamento.
- **1.1.0** Editor de quadros (GIF e animação): selecionar, inverter, ida e volta, velocidade, remover repetidos, girar, espelhar, recortar, ajustes de cor, texto e desfazer/refazer.

# Notas do projeto (para quem continuar o desenvolvimento)

## Regras que valem sempre
- HTML5, CSS3 e JavaScript com ES Modules. Sem framework e sem etapa de build. Canvas puro.
- Gratuito e 100% local. Dependências só em `vendor/`, com versão e licença no `vendor/README.md` (sem CDN).
- Edição não destrutiva: o original fica em memória; cada tamanho é exportado direto do original.
- Nunca simular conversão: todo arquivo exportado é conferido pela assinatura (`lerAssinatura` em `js/services/exportar.js`).
- Interface simples: cartão por ferramenta, fluxo escolher > ajustar > baixar, opções avançadas recolhidas.
- Entregas por fase, com ZIP só dos arquivos novos e alterados e lista do que substituir ou apagar. Esperar a validação antes de seguir.

## Mapa do código
- `js/app.js`: tela inicial e rotas por `#hash`. `js/core/`: abrir imagem (EXIF), editor quadrado compartilhado.
- `js/services/`: exportar (PNG/JPG/WebP, ZIP), ico, gif (gifenc), webp-anim (montagem do WebP animado), animados (ler GIF/WebP animados), sticker-anim (ajuste aos limites do WhatsApp).
- `js/tools/`: perfil, favicon, icone-pasta, sticker, animacao. `js/data/presets-redes.js`.
- `teste.html`: autoteste que roda no site publicado (arquivos, exportação, recursos do navegador).

## Limites do WhatsApp usados (repositório oficial WhatsApp/stickers)
512 × 512 px; estático ≤ 100 KB; animado ≤ 500 KB, ≤ 10 s, quadros ≥ 8 ms; pacote de 3 a 30, sem misturar; bandeja 96 × 96 ≤ 50 KB; a animação termina no primeiro quadro.

## Estado: versão 1.0.0 (Fases 1, 2 e 3 concluídas)
- Remover fundo: `js/services/fundo.js` (modelo, tamanho de trabalho, aplicar máscara, recorte automático), `js/services/mascara.js` (suavizar, ajustar, pincel), `js/tools/fundo.js` (editor) e `js/core/recorte.js` (editor numa janela, usado por Perfil e Sticker). Use `ort.wasm.min.mjs`, não `ort.min.mjs` (este pede os arquivos .jsep, de WebGPU).
- Offline: `sw.js` (rede primeiro, cópia guardada como reserva; ignora .wasm, /modelos/ e teste.html). Mude `VERSAO` a cada publicação. Todo arquivo novo do site precisa entrar na lista `ARQUIVOS`, senão não fica disponível offline.
- Armadilha já vista: ao publicar por "Upload files", mande todos os arquivos que dependem uns dos outros na mesma confirmação.

## Ideias para depois
- Modelo de remoção de fundo maior (melhor em cabelos), WebP animado sem perda (libwebp em WebAssembly), Web Worker para GIF/WebP, dithering no GIF, arrastar para reordenar quadros, leitura de GIF sem `ImageDecoder` (omggif, MIT), preset do WhatsApp (medida ainda não confirmada em fonte oficial).
- JXL, AVIF, TIFF, APNG, ampliação com IA, QR Code, extração de paleta, projetos salvos.

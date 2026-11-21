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

## Pendências e ideias (Fase 3 e depois)
- Fase 3: remoção de fundo no navegador (modelo local, carregamento só sob pedido), conversor e otimizador em lote, PWA/offline, acabamento e versão 1.0.
- Melhorias adiadas: WebP sem perda (libwebp em WebAssembly), Web Worker para GIF/WebP, dithering no GIF, arrastar para reordenar quadros, leitura de GIF sem `ImageDecoder` (omggif, MIT), preset do WhatsApp (medida ainda não confirmada), favicon próprio do site (gerar com a ferramenta Favicon).

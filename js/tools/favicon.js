import { criarQuadro } from '../core/quadro.js';
import { codificar, zip, baixar } from '../services/exportar.js';
import { gerarIco } from '../services/ico.js';
import { avisar } from '../utils/avisar.js';

const HTML = `<link rel="icon" href="favicon.ico" sizes="48x48">
<link rel="icon" type="image/png" sizes="32x32" href="favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="favicon-16x16.png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="manifest" href="site.webmanifest">`;

export function montarFavicon(raiz) {
  const q = criarQuadro(raiz);
  q.extra.innerHTML = `
    <fieldset><legend>Prévia no tamanho real</legend><div class="mini" id="mini"></div></fieldset>
    <label>Nome do site <input type="text" id="nome" value="Meu site" maxlength="40"></label>
    <details><summary>Código para colar no seu site</summary>
      <textarea id="cod" readonly rows="6"></textarea>
      <p class="aviso">Os caminhos são relativos: coloque os arquivos na mesma pasta da página (ou ajuste os caminhos).</p>
      <button type="button" id="copiar">Copiar código</button></details>
    <p class="aviso">O ícone do iPhone (apple-touch-icon) precisa de fundo: com fundo transparente, ele usa a cor escolhida (branco por padrão).</p>
    <div class="acoes"><button type="button" class="primario" id="baixar">Baixar pacote (ZIP)</button><button type="button" id="trocar">Trocar imagem</button></div>`;
  const $ = s => raiz.querySelector(s);
  q.mini($('#mini'), [16, 32, 48, 64]);
  $('#cod').value = HTML;
  $('#trocar').onclick = q.trocar;
  $('#copiar').onclick = async () => { try { await navigator.clipboard.writeText(HTML); avisar('Código copiado.', 'ok'); } catch { $('#cod').select(); avisar('Selecione o texto e copie com Ctrl+C.', 'erro'); } };
  $('#baixar').onclick = async () => {
    try {
      const png = (t, op) => codificar(q.desenhar(t, op), 'png');
      const nome = $('#nome').value.trim() || 'Meu site';
      const manifesto = JSON.stringify({ name: nome, short_name: nome.slice(0, 12), icons: [
        { src: 'android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: 'android-chrome-512x512.png', sizes: '512x512', type: 'image/png' }],
        theme_color: '#ffffff', background_color: '#ffffff', display: 'standalone' }, null, 2);
      const arqs = [
        { nome: 'favicon.ico', blob: await gerarIco([16, 32, 48], t => q.desenhar(t)) },
        { nome: 'favicon-16x16.png', blob: await png(16) },
        { nome: 'favicon-32x32.png', blob: await png(32) },
        { nome: 'apple-touch-icon.png', blob: await png(180, true) },
        { nome: 'android-chrome-192x192.png', blob: await png(192) },
        { nome: 'android-chrome-512x512.png', blob: await png(512) },
        { nome: 'site.webmanifest', blob: new Blob([manifesto], { type: 'application/manifest+json' }) },
        { nome: 'colar-no-html.txt', blob: new Blob([HTML], { type: 'text/plain' }) }];
      baixar(await zip(arqs), 'favicon-pacote.zip');
      avisar('Pacote baixado. Coloque os arquivos na mesma pasta da sua página.', 'ok');
    } catch (err) { avisar(err.message, 'erro'); }
  };
}

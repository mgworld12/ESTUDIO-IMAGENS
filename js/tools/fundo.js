import { ligarEntrada, metade } from '../core/imagem.js';
import { codificar, baixar } from '../services/exportar.js';
import { segmentar, ampliarMascara, DOWNLOAD_MB } from '../services/fundo.js';
import { suavizar, ajustar, pincel } from '../services/mascara.js';
import { avisar } from '../utils/avisar.js';

const TRAB = 1280;   // a edição acontece com no máximo 1280 px; o arquivo final usa a imagem original inteira
const tela = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });

export function montarFundo(raiz, deps = {}) {
  const segmenta = deps.segmentar || segmentar, amplia = deps.ampliar || ampliarMascara;
  const e = { suav: 2, exp: 0, ferr: 'nada', raio: 30, fundo: 'transp', cor: '#ffffff', fmt: 'png', original: false };
  let orig = null, trab = null, dados = null, mw = 0, mh = 0, mp = null, mIA = null, quadro = 0;
  raiz.innerHTML = `
  <div class="zona" id="zona"><p><strong>Arraste uma imagem para cá</strong>, cole com Ctrl+V ou escolha um arquivo.</p>
    <div class="acoes"><button type="button" class="primario" id="bArq">Escolher imagem</button></div><input id="arq" type="file" accept="image/*" hidden></div>
  <div class="editor" id="editor" hidden>
    <div class="previa"><canvas id="cv" width="10" height="10" aria-label="Prévia do recorte"></canvas><p class="dica" id="dica">Primeiro clique em “Remover fundo”.</p></div>
    <form class="ctrl">
      <button type="button" class="primario" id="ia">Remover fundo (baixa ${DOWNLOAD_MB} MB na primeira vez)</button>
      <progress id="bar" value="0" max="1" hidden></progress><p class="aviso" id="msg">A IA roda no seu navegador e nada é enviado a servidores. Depois do primeiro uso, o motor fica guardado no navegador.</p>
      <div class="ctrl" id="ajustes" hidden>
        <label>Suavizar bordas <input type="range" id="suav" min="0" max="12" value="2"></label>
        <label>Contrair / expandir <input type="range" id="exp" min="-1" max="1" step="0.05" value="0"></label>
        <fieldset><legend>Pincel</legend>
          <label><input type="radio" name="ferr" value="nada" checked> Nenhum</label><label><input type="radio" name="ferr" value="restaurar"> Restaurar</label><label><input type="radio" name="ferr" value="apagar"> Apagar</label>
          <label>Tamanho <input type="range" id="raio" min="5" max="120" value="30"></label></fieldset>
        <button type="button" id="resetar">Desfazer o pincel</button>
        <fieldset><legend>Fundo</legend><label><input type="radio" name="fundo" value="transp" checked> Transparente</label><label><input type="radio" name="fundo" value="cor"> Cor <input type="color" id="cor" value="#ffffff"></label></fieldset>
        <label><input type="checkbox" id="orig"> Mostrar a imagem original</label>
        <label>Salvar como <select id="fmt"><option value="png">PNG (com transparência)</option><option value="webp">WebP (com transparência)</option><option value="jpg">JPG (usa a cor de fundo)</option></select></label>
        <button type="button" class="primario" id="baixar">Baixar</button></div>
      <button type="button" id="trocar">Trocar imagem</button>
    </form></div>`;
  const $ = s => raiz.querySelector(s), cv = $('#cv'), cx = cv.getContext('2d'), arq = $('#arq');
  $('form').onsubmit = ev => ev.preventDefault(); $('#bArq').onclick = $('#trocar').onclick = () => arq.click();

  const alfa = () => suavizar(ajustar(mp, e.exp), mw, mh, e.suav);
  function desenhar() {
    cx.clearRect(0, 0, mw, mh);
    if (!mp || e.original) { cx.drawImage(trab, 0, 0); return; }
    const a = alfa(), d = new Uint8ClampedArray(dados);
    for (let i = 0; i < a.length; i++) d[4 * i + 3] = Math.round(d[4 * i + 3] * a[i]);
    const t = tela(mw, mh); t.getContext('2d').putImageData(new ImageData(d, mw, mh), 0, 0);
    if (e.fundo === 'cor') { cx.fillStyle = e.cor; cx.fillRect(0, 0, mw, mh); }
    cx.drawImage(t, 0, 0);
  }
  const agendar = () => { if (!quadro) quadro = requestAnimationFrame(() => { quadro = 0; desenhar(); }); };

  async function iaClick() {
    $('#ia').disabled = true; $('#bar').hidden = false; $('#bar').value = 0;
    try {
      const m320 = await segmenta(trab, (rotulo, lido, total) => { $('#bar').value = lido / total; $('#msg').textContent = `Baixando ${rotulo}… ${(lido / 1048576).toFixed(1)} de ${(total / 1048576).toFixed(1)} MB`; });
      $('#msg').textContent = 'Recortando…'; await new Promise(r => setTimeout(r));
      mIA = amplia(m320, mw, mh); mp = Float32Array.from(mIA);
      $('#ajustes').hidden = false; $('#ia').textContent = 'Refazer com a IA'; $('#dica').textContent = 'Ajuste as bordas, retoque com o pincel e baixe.';
      $('#msg').textContent = 'Pronto. A IA pode errar em cabelos, pelos e objetos finos: use o pincel para corrigir.'; desenhar();
    } catch (err) { $('#msg').textContent = ''; avisar(err.message, 'erro'); }
    finally { $('#ia').disabled = false; $('#bar').hidden = true; }
  }
  $('#ia').onclick = iaClick;

  const ligar = (id, fn) => { $('#' + id).addEventListener('input', ev => { fn(ev.target); agendar(); }); };
  ligar('suav', t => { e.suav = +t.value; }); ligar('exp', t => { e.exp = +t.value; }); ligar('raio', t => { e.raio = +t.value; });
  ligar('cor', t => { e.cor = t.value; e.fundo = 'cor'; raiz.querySelector('[name=fundo][value=cor]').checked = true; }); ligar('orig', t => { e.original = t.checked; });
  raiz.querySelectorAll('[name=ferr]').forEach(r => r.onchange = () => { e.ferr = r.value; cv.style.cursor = e.ferr === 'nada' ? 'default' : 'crosshair'; });
  raiz.querySelectorAll('[name=fundo]').forEach(r => r.onchange = () => { e.fundo = r.value; agendar(); });
  $('#fmt').onchange = ev => { e.fmt = ev.target.value; };
  $('#resetar').onclick = () => { if (mIA) { mp = Float32Array.from(mIA); agendar(); } };

  let pintando = false;
  const pinta = ev => { const r = cv.getBoundingClientRect(), k = mw / r.width; pincel(mp, mw, mh, (ev.clientX - r.left) * k, (ev.clientY - r.top) * k, e.raio * k, e.ferr === 'restaurar' ? 1 : 0); agendar(); };
  cv.onpointerdown = ev => { if (!mp || e.ferr === 'nada' || e.original) return; cv.setPointerCapture(ev.pointerId); pintando = true; pinta(ev); };
  cv.onpointermove = ev => { if (pintando) pinta(ev); };
  cv.onpointerup = cv.onpointercancel = () => { pintando = false; };

  $('#baixar').onclick = async () => {
    try {
      const W = orig.width, H = orig.height, a = alfa(), mc = tela(mw, mh), d = mc.getContext('2d').createImageData(mw, mh);
      for (let i = 0; i < a.length; i++) d.data[4 * i + 3] = Math.round(a[i] * 255);
      mc.getContext('2d').putImageData(d, 0, 0);
      const rec = tela(W, H), rx = rec.getContext('2d'); rx.drawImage(orig, 0, 0); rx.globalCompositeOperation = 'destination-in'; rx.imageSmoothingQuality = 'high'; rx.drawImage(mc, 0, 0, W, H);
      const fim = tela(W, H), fx = fim.getContext('2d');
      if (e.fundo === 'cor' || e.fmt === 'jpg') { fx.fillStyle = e.cor; fx.fillRect(0, 0, W, H); }
      fx.drawImage(rec, 0, 0);
      baixar(await codificar(fim, e.fmt, 0.95), `sem-fundo.${e.fmt}`); avisar('Imagem baixada.', 'ok');
    } catch (err) { avisar(/memory|size|alloc/i.test(err.message) ? 'Imagem grande demais para este navegador.' : err.message, 'erro'); }
  };

  ligarEntrada(raiz, [arq], bmp => {
    orig = bmp; const s = Math.min(1, TRAB / Math.max(bmp.width, bmp.height)); mw = Math.max(1, Math.round(bmp.width * s)); mh = Math.max(1, Math.round(bmp.height * s));
    let f = bmp, k = s; while (k < 0.5) { f = metade(f); k *= 2; }
    trab = tela(mw, mh); const x = trab.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(f, 0, 0, mw, mh); dados = x.getImageData(0, 0, mw, mh).data;
    cv.width = mw; cv.height = mh; mp = mIA = null; $('#ajustes').hidden = true; $('#ia').textContent = `Remover fundo (baixa ${DOWNLOAD_MB} MB na primeira vez)`;
    $('#zona').hidden = true; $('#editor').hidden = false; $('#dica').textContent = 'Primeiro clique em “Remover fundo”.'; desenhar();
  });
}

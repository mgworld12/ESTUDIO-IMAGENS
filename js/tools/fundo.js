import { ligarEntrada } from '../core/imagem.js';
import { codificar, baixar } from '../services/exportar.js';
import { segmentar, ampliarMascara, reduzirTrabalho, aplicarMascara, DOWNLOAD_MB } from '../services/fundo.js';
import { suavizar, ajustar, pincel } from '../services/mascara.js';
import { avisar } from '../utils/avisar.js';

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
        <button type="button" class="primario" id="baixar">Baixar</button>
        <button type="button" class="primario" id="usar" hidden>Usar este recorte</button></div>
      <button type="button" id="trocar">Trocar imagem</button><button type="button" id="cancelarM" hidden>Cancelar</button>
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

  async function compor(comFundo) {
    const rec = aplicarMascara(orig, alfa(), mw, mh);
    if (!comFundo) return rec;
    const fim = tela(rec.width, rec.height), fx = fim.getContext('2d'); fx.fillStyle = e.cor; fx.fillRect(0, 0, fim.width, fim.height); fx.drawImage(rec, 0, 0);
    return fim;
  }
  const erroTela = err => avisar(/memory|size|alloc/i.test(err.message) ? 'Imagem grande demais para este navegador.' : err.message, 'erro');
  $('#baixar').onclick = async () => {
    try { baixar(await codificar(await compor(e.fundo === 'cor' || e.fmt === 'jpg'), e.fmt, 0.95), `sem-fundo.${e.fmt}`); avisar('Imagem baixada.', 'ok'); } catch (err) { erroTela(err); }
  };
  $('#usar').onclick = async () => { try { deps.aoUsar(await compor(false)); } catch (err) { erroTela(err); } };   // modo janela: devolve o recorte transparente
  $('#cancelarM').onclick = () => deps.aoCancelar?.();

  function carregarImagem(bmp) {
    orig = bmp; ({ c: trab, w: mw, h: mh } = reduzirTrabalho(bmp)); dados = trab.getContext('2d').getImageData(0, 0, mw, mh).data;
    cv.width = mw; cv.height = mh; mp = mIA = null; $('#ajustes').hidden = true; $('#ia').textContent = `Remover fundo (baixa ${DOWNLOAD_MB} MB na primeira vez)`;
    $('#zona').hidden = true; $('#editor').hidden = false; $('#dica').textContent = 'Primeiro clique em “Remover fundo”.'; desenhar();
  }
  if (deps.inicial) {   // aberto por outra ferramenta: sem escolha de arquivo, fundo nem download
    $('#baixar').hidden = $('#trocar').hidden = true; $('#usar').hidden = $('#cancelarM').hidden = false;
    $('#fmt').closest('label').hidden = true; raiz.querySelector('[name=fundo]').closest('fieldset').hidden = true;
    carregarImagem(deps.inicial);
  } else ligarEntrada(raiz, [arq], carregarImagem);
}

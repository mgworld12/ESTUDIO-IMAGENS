import { ligarEntrada, metade } from '../core/imagem.js';
import { codificar, zip, baixar } from '../services/exportar.js';
import { avisar } from '../utils/avisar.js';

const TAMANHOS = [128, 256, 400, 512, 1080];
const PADRAO = [256, 512];

export function montarPerfil(raiz) {
  const e = { img: null, zoom: 1, ox: 0, oy: 0, forma: 'redondo', transp: true, cor: '#ffffff', borda: false, bcor: '#ffffff', besp: 3, fmt: 'png', q: 0.92 };
  let cadeia = [];
  raiz.innerHTML = `
  <ol class="passos"><li id="p1" class="ativo">1. Escolher a imagem</li><li id="p2">2. Ajustar</li><li id="p3">3. Baixar</li></ol>
  <div class="zona" id="zona">
    <p><strong>Arraste uma imagem para cá</strong>, cole com Ctrl+V ou escolha um arquivo.</p>
    <div class="acoes">
      <label class="primario" style="cursor:pointer"><input id="arq" type="file" accept="image/*" hidden><button type="button" class="primario" id="bArq">Escolher imagem</button></label>
      <button type="button" id="bCam">Tirar foto</button>
      <input id="cam" type="file" accept="image/*" capture="user" hidden>
    </div>
  </div>
  <div class="editor" id="editor" hidden>
    <div class="previa"><canvas id="cv" width="520" height="520" aria-label="Prévia da imagem"></canvas><p class="dica">Arraste a imagem para enquadrar. Use o zoom abaixo ou a roda do mouse.</p></div>
    <form class="ctrl">
      <fieldset><legend>Forma</legend>
        <label><input type="radio" name="forma" value="redondo" checked> Redonda</label>
        <label><input type="radio" name="forma" value="arredondado"> Cantos arredondados</label>
        <label><input type="radio" name="forma" value="quadrado"> Quadrada</label></fieldset>
      <label>Zoom <input type="range" id="zoom" min="1" max="4" step="0.01" value="1"></label>
      <label><input type="checkbox" id="transp" checked> Fundo transparente</label>
      <label>Cor do fundo <input type="color" id="cor" value="#ffffff"></label>
      <label><input type="checkbox" id="borda"> Borda <input type="color" id="bcor" value="#ffffff"></label>
      <label>Espessura <input type="range" id="besp" min="1" max="10" value="3"></label>
      <details><summary>Avançado: tamanhos e formato</summary>
        <fieldset id="tams"><legend>Tamanhos (px)</legend>${TAMANHOS.map(t => `<label><input type="checkbox" value="${t}" ${PADRAO.includes(t) ? 'checked' : ''}> ${t}</label>`).join('')}
          <label>Outro <input type="number" id="outro" min="16" max="4096" placeholder="px"></label></fieldset>
        <label>Formato <select id="fmt"><option value="png">PNG (sem perda)</option><option value="webp">WebP (qualidade alta)</option><option value="jpg">JPG (sem transparência)</option></select></label>
        <label>Qualidade <input type="range" id="q" min="0.5" max="1" step="0.01" value="0.92"></label>
        <p class="aviso">PNG não perde qualidade. WebP e JPG sempre perdem um pouco. Redonda com transparência só existe em PNG e WebP.</p>
      </details>
      <p class="aviso" id="aviso"></p>
      <div class="acoes"><button type="button" class="primario" id="baixar">Baixar</button><button type="button" id="trocar">Trocar imagem</button></div>
    </form>
  </div>`;
  const $ = s => raiz.querySelector(s), cv = $('#cv'), cx = cv.getContext('2d');
  const arq = $('#arq'), cam = $('#cam');
  $('#bArq').onclick = ev => { ev.preventDefault(); arq.click(); };
  $('#bCam').onclick = () => cam.click();
  $('#trocar').onclick = () => arq.click();

  const nivel = k => { while (cadeia.length <= k) cadeia.push(metade(cadeia.at(-1))); return cadeia[k]; };
  const caminho = (c, t, m = 0) => {
    const l = t - 2 * m;
    if (e.forma === 'redondo') c.arc(t / 2, t / 2, l / 2, 0, Math.PI * 2);
    else if (e.forma === 'arredondado') c.roundRect(m, m, l, l, l * 0.22);
    else c.rect(m, m, l, l);
  };
  const rel = () => Math.max(1 / e.img.width, 1 / e.img.height) * e.zoom;
  function limitar() {
    const mx = Math.max(0, (e.img.width * rel() - 1) / 2), my = Math.max(0, (e.img.height * rel() - 1) / 2);
    e.ox = Math.min(mx, Math.max(-mx, e.ox)); e.oy = Math.min(my, Math.max(-my, e.oy));
  }
  // Mesma função para prévia e exportação: o enquadramento é guardado em frações, vale para qualquer tamanho.
  function desenhar(c, t, opaco) {
    c.clearRect(0, 0, t, t); c.save(); c.beginPath(); caminho(c, t); c.clip();
    if (opaco || !e.transp) { c.fillStyle = e.cor; c.fillRect(0, 0, t, t); }
    let s = rel() * t, k = 0;
    while (s < 0.5) { s *= 2; k++; }
    const f = nivel(k), w = f.width * s, h = f.height * s;
    c.imageSmoothingQuality = 'high';
    c.drawImage(f, (t - w) / 2 + e.ox * t, (t - h) / 2 + e.oy * t, w, h);
    c.restore();
    if (e.borda) { const w2 = t * e.besp / 100; c.lineWidth = w2; c.strokeStyle = e.bcor; c.beginPath(); caminho(c, t, w2 / 2); c.stroke(); }
  }
  const tamanhos = () => [...raiz.querySelectorAll('#tams input[type=checkbox]:checked')].map(i => +i.value)
    .concat(+$('#outro').value >= 16 ? [Math.min(4096, Math.round(+$('#outro').value))] : []);
  function redesenhar() {
    limitar(); desenhar(cx, cv.width, false);
    const lado = Math.min(e.img.width, e.img.height) / e.zoom, grandes = tamanhos().filter(t => t > lado);
    const av = $('#aviso'); av.classList.toggle('alerta', grandes.length > 0);
    av.textContent = grandes.length ? `Atenção: ${grandes.join(', ')} px é maior que a área usada da foto (cerca de ${Math.round(lado)} px). Ela será ampliada e pode perder nitidez.` : `Área usada da foto: cerca de ${Math.round(lado)} px.`;
  }
  const ligar = (id, prop, tipo) => $('#' + id).addEventListener('input', ev => { e[prop] = tipo === 'b' ? ev.target.checked : tipo === 'n' ? +ev.target.value : ev.target.value; if (id === 'transp' || id === 'cor') { if (id === 'cor') { e.transp = false; $('#transp').checked = false; } } redesenhar(); });
  ligar('zoom', 'zoom', 'n'); ligar('transp', 'transp', 'b'); ligar('cor', 'cor'); ligar('borda', 'borda', 'b'); ligar('bcor', 'bcor'); ligar('besp', 'besp', 'n'); ligar('fmt', 'fmt'); ligar('q', 'q', 'n');
  raiz.querySelectorAll('[name=forma]').forEach(r => r.onchange = () => { e.forma = r.value; redesenhar(); });
  $('#tams').addEventListener('input', () => e.img && redesenhar());

  let arrasto = false;
  cv.onpointerdown = ev => { cv.setPointerCapture(ev.pointerId); arrasto = true; cv.style.cursor = 'grabbing'; };
  cv.onpointermove = ev => { if (!arrasto) return; const k = cv.width / cv.getBoundingClientRect().width; e.ox += ev.movementX * k / cv.width; e.oy += ev.movementY * k / cv.height; redesenhar(); };
  cv.onpointerup = cv.onpointercancel = () => { arrasto = false; cv.style.cursor = 'grab'; };
  cv.onwheel = ev => { ev.preventDefault(); e.zoom = Math.min(4, Math.max(1, e.zoom + (ev.deltaY < 0 ? 0.1 : -0.1))); $('#zoom').value = e.zoom; redesenhar(); };

  $('#baixar').onclick = async () => {
    const tams = tamanhos();
    if (!tams.length) return avisar('Escolha pelo menos um tamanho em “Avançado”.', 'erro');
    try {
      const arqs = [];
      for (const t of tams) {
        const c = Object.assign(document.createElement('canvas'), { width: t, height: t });
        desenhar(c.getContext('2d'), t, e.fmt === 'jpg');
        arqs.push({ nome: `perfil-${t}px.${e.fmt}`, blob: await codificar(c, e.fmt, e.q) });
      }
      if (arqs.length === 1) baixar(arqs[0].blob, arqs[0].nome); else baixar(await zip(arqs), 'perfil-tamanhos.zip');
      $('#p3').classList.add('ativo');
      avisar(arqs.length === 1 ? 'Imagem baixada.' : `${arqs.length} imagens baixadas em um ZIP.`, 'ok');
    } catch (err) { avisar(err.message, 'erro'); }
  };

  ligarEntrada(raiz, [arq, cam], bmp => {
    e.img = bmp; e.zoom = 1; e.ox = e.oy = 0; cadeia = [bmp]; $('#zoom').value = 1;
    $('#zona').hidden = true; $('#editor').hidden = false; $('#p1').classList.remove('ativo'); $('#p2').classList.add('ativo');
    redesenhar();
  });
}

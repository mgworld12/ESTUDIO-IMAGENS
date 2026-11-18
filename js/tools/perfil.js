import { ligarEntrada, metade } from '../core/imagem.js';
import { codificar, zip, baixar } from '../services/exportar.js';
import { avisar } from '../utils/avisar.js';
import { PRESETS } from '../data/presets-redes.js';

const TAMANHOS = [128, 256, 400, 512, 1080];
const PADRAO = [256, 512];

export function montarPerfil(raiz) {
  const e = { img: null, zoom: 1, ox: 0, oy: 0, forma: 'redondo', transp: true, cor: '#ffffff', borda: false, bcor: '#ffffff', besp: 3, fmt: 'png', q: 0.92, extra: [], guia: false };
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
      <label>Rede social <select id="preset" style="width:auto"><option value="">Nenhuma (tamanhos livres)</option></select></label>
      <p class="aviso" id="pnota"></p>
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
          <label>Outro <input type="number" id="outro" min="1" step="any" placeholder="valor"><select id="un"><option value="px">px</option><option value="mm">mm</option><option value="cm">cm</option></select></label><label id="ldpi" hidden>DPI <input type="number" id="dpi" value="300" min="72" max="1200"></label><span class="aviso" id="outroPx"></span></fieldset>
        <label>Formato <select id="fmt"><option value="png">PNG (sem perda)</option><option value="webp">WebP (qualidade alta)</option><option value="jpg">JPG (sem transparência)</option></select></label>
        <label>Qualidade <input type="range" id="q" min="0.5" max="1" step="0.01" value="0.92"></label>
        <p class="aviso">PNG não perde qualidade. WebP e JPG sempre perdem um pouco. Redonda com transparência só existe em PNG e WebP. O DPI só calcula os pixels: o arquivo não guarda DPI.</p>
      </details>
      <p class="aviso" id="aviso"></p>
      <div class="acoes"><button type="button" class="primario" id="baixar">Baixar</button><button type="button" id="trocar">Trocar imagem</button><button type="button" id="desf" disabled>Desfazer</button><button type="button" id="ref" disabled>Refazer</button></div>
    </form>
  </div>`;
  const $ = s => raiz.querySelector(s), cv = $('#cv'), cx = cv.getContext('2d');
  const arq = $('#arq'), cam = $('#cam');
  $('#bArq').onclick = ev => { ev.preventDefault(); arq.click(); };
  $('#bCam').onclick = () => cam.click();
  $('#trocar').onclick = () => arq.click();
  raiz.querySelector('form').onsubmit = ev => ev.preventDefault();

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
  const outroPx = () => { const v = +$('#outro').value, u = $('#un').value, d = +$('#dpi').value || 300; if (!(v > 0)) return 0; const px = Math.round(u === 'px' ? v : v * d / (u === 'cm' ? 2.54 : 25.4)); return px >= 16 && px <= 4096 ? px : 0; };
  const tamanhos = () => [...new Set([...raiz.querySelectorAll('#tams input[type=checkbox]:checked')].map(i => +i.value).concat(e.extra, outroPx() ? [outroPx()] : []))].sort((a, b) => a - b);
  function atualizarOutro() {
    $('#ldpi').hidden = $('#un').value === 'px';
    $('#outroPx').textContent = +$('#outro').value > 0 ? (outroPx() ? ($('#un').value === 'px' ? '' : '= ' + outroPx() + ' px') : 'Use entre 16 e 4096 px.') : '';
  }
  function redesenhar() {
    limitar(); desenhar(cx, cv.width, false);
    if (e.guia) { cx.save(); cx.setLineDash([10, 8]); cx.lineWidth = 3; cx.strokeStyle = '#e0457b'; cx.beginPath(); cx.arc(260, 260, 258, 0, 7); cx.stroke(); cx.restore(); }
    const lado = Math.min(e.img.width, e.img.height) / e.zoom, grandes = tamanhos().filter(t => t > lado);
    const av = $('#aviso'); av.classList.toggle('alerta', grandes.length > 0);
    av.textContent = grandes.length ? `Atenção: ${grandes.join(', ')} px é maior que a área usada da foto (cerca de ${Math.round(lado)} px). Ela será ampliada e pode perder nitidez.` : `Área usada da foto: cerca de ${Math.round(lado)} px.`;
  }
  const ligar = (id, prop, tipo) => $('#' + id).addEventListener('input', ev => { e[prop] = tipo === 'b' ? ev.target.checked : tipo === 'n' ? +ev.target.value : ev.target.value; if (id === 'transp' || id === 'cor') { if (id === 'cor') { e.transp = false; $('#transp').checked = false; } } redesenhar(); });
  ligar('zoom', 'zoom', 'n'); ligar('transp', 'transp', 'b'); ligar('cor', 'cor'); ligar('borda', 'borda', 'b'); ligar('bcor', 'bcor'); ligar('besp', 'besp', 'n'); ligar('fmt', 'fmt'); ligar('q', 'q', 'n');
  raiz.querySelectorAll('[name=forma]').forEach(r => r.onchange = () => { e.forma = r.value; redesenhar(); });
  $('#tams').addEventListener('input', () => { atualizarOutro(); if (e.img) redesenhar(); });

  // Desfazer e refazer (Ctrl+Z, Ctrl+Y): guarda o enquadramento e os ajustes visuais.
  const CAMPOS = ['zoom', 'ox', 'oy', 'forma', 'transp', 'cor', 'borda', 'bcor', 'besp'];
  let hist = [], pos = -1, tw;
  const foto = () => JSON.stringify(CAMPOS.map(k => e[k]));
  const botoes = () => { $('#desf').disabled = pos <= 0; $('#ref').disabled = pos >= hist.length - 1; };
  function salvar() { if (!e.img || hist[pos] === foto()) return; hist = hist.slice(0, pos + 1); hist.push(foto()); if (hist.length > 100) hist.shift(); pos = hist.length - 1; botoes(); }
  function sincronizar() { $('#zoom').value = e.zoom; raiz.querySelector(`[name=forma][value=${e.forma}]`).checked = true; $('#transp').checked = e.transp; $('#cor').value = e.cor; $('#borda').checked = e.borda; $('#bcor').value = e.bcor; $('#besp').value = e.besp; }
  function ir(d) { const n = pos + d; if (!e.img || n < 0 || n >= hist.length) return; pos = n; JSON.parse(hist[pos]).forEach((v, i) => e[CAMPOS[i]] = v); sincronizar(); redesenhar(); botoes(); }
  $('#desf').onclick = () => ir(-1); $('#ref').onclick = () => ir(1);
  raiz.querySelector('form').addEventListener('change', ev => { if (ev.target.id !== 'preset') salvar(); });
  document.onkeydown = ev => {
    const campo = /INPUT|SELECT|TEXTAREA/.test(ev.target.tagName) && !['range', 'checkbox', 'radio'].includes(ev.target.type);
    if (!(ev.ctrlKey || ev.metaKey) || campo) return;
    const k = ev.key.toLowerCase();
    if (k === 'z') { ev.preventDefault(); ir(ev.shiftKey ? 1 : -1); } else if (k === 'y') { ev.preventDefault(); ir(1); }
  };

  // Presets de redes sociais: tamanho recomendado e o dobro; a rede recorta em círculo, então a imagem sai quadrada.
  $('#preset').innerHTML += PRESETS.map(p => `<option value="${p.id}">${p.nome}</option>`).join('');
  $('#preset').onchange = ev => {
    const p = PRESETS.find(x => x.id === ev.target.value), cs = [...raiz.querySelectorAll('#tams input[type=checkbox]')];
    if (!p) { e.extra = []; e.guia = false; cs.forEach(c => c.checked = PADRAO.includes(+c.value)); $('#pnota').textContent = ''; }
    else {
      e.extra = [p.px, p.px * 2]; e.guia = p.circulo; cs.forEach(c => c.checked = false); $('#outro').value = '';
      if (p.circulo) { e.forma = 'quadrado'; sincronizar(); }
      $('#pnota').innerHTML = `${p.nota} ${p.circulo ? 'A rede recorta em círculo, então a imagem sai quadrada (o guia tracejado mostra o recorte). ' : ''}Exporta ${p.px} px e ${p.px * 2} px. Medida de guias do setor, não oficial; conferida em ${p.verificadoEm}. <a href="${p.fonte}" target="_blank" rel="noopener">Fonte</a>`;
    }
    atualizarOutro(); if (e.img) { redesenhar(); salvar(); }
  };

  let arrasto = false;
  cv.onpointerdown = ev => { cv.setPointerCapture(ev.pointerId); arrasto = true; cv.style.cursor = 'grabbing'; };
  cv.onpointermove = ev => { if (!arrasto) return; const k = cv.width / cv.getBoundingClientRect().width; e.ox += ev.movementX * k / cv.width; e.oy += ev.movementY * k / cv.height; redesenhar(); };
  cv.onpointerup = cv.onpointercancel = () => { arrasto = false; cv.style.cursor = 'grab'; salvar(); };
  cv.onwheel = ev => { ev.preventDefault(); e.zoom = Math.min(4, Math.max(1, e.zoom + (ev.deltaY < 0 ? 0.1 : -0.1))); $('#zoom').value = e.zoom; redesenhar(); clearTimeout(tw); tw = setTimeout(salvar, 400); };

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
    redesenhar(); hist = []; pos = -1; salvar();
  });
}

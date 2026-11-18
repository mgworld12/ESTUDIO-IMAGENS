import { ligarEntrada, metade } from './imagem.js';

// Editor quadrado compartilhado por Favicon e Ícone de pasta: entrada, enquadramento, forma e fundo.
export function criarQuadro(raiz) {
  const e = { img: null, zoom: 1, ox: 0, oy: 0, forma: 'quadrado', ajuste: 'inteira', transp: true, cor: '#ffffff' };
  let cadeia = [];
  raiz.innerHTML = `
  <div class="zona" id="zona">
    <p><strong>Arraste uma imagem para cá</strong>, cole com Ctrl+V ou escolha um arquivo.</p>
    <div class="acoes"><button type="button" class="primario" id="bArq">Escolher imagem</button></div>
    <input id="arq" type="file" accept="image/*" hidden>
  </div>
  <div class="editor" id="editor" hidden>
    <div class="previa"><canvas id="cv" width="520" height="520" aria-label="Prévia"></canvas><p class="dica">Arraste a imagem para enquadrar. Zoom pela barra ou pela roda do mouse.</p></div>
    <form class="ctrl">
      <fieldset><legend>Forma</legend>
        <label><input type="radio" name="forma" value="quadrado" checked> Quadrada</label>
        <label><input type="radio" name="forma" value="arredondado"> Cantos arredondados</label>
        <label><input type="radio" name="forma" value="redondo"> Redonda</label></fieldset>
      <fieldset><legend>Ajuste</legend>
        <label><input type="radio" name="ajuste" value="inteira" checked> Imagem inteira</label>
        <label><input type="radio" name="ajuste" value="preencher"> Preencher tudo</label></fieldset>
      <label>Zoom <input type="range" id="zoom" min="1" max="4" step="0.01" value="1"></label>
      <label><input type="checkbox" id="transp" checked> Fundo transparente</label>
      <label>Cor do fundo <input type="color" id="cor" value="#ffffff"></label>
      <div id="extra" class="ctrl"></div>
    </form>
  </div>`;
  const $ = s => raiz.querySelector(s), cv = $('#cv'), cx = cv.getContext('2d'), arq = $('#arq');
  $('form').onsubmit = ev => ev.preventDefault();
  $('#bArq').onclick = () => arq.click();

  const nivel = k => { while (cadeia.length <= k) cadeia.push(metade(cadeia.at(-1))); return cadeia[k]; };
  const caminho = (c, t) => {
    if (e.forma === 'redondo') c.arc(t / 2, t / 2, t / 2, 0, Math.PI * 2);
    else if (e.forma === 'arredondado') c.roundRect(0, 0, t, t, t * 0.22);
    else c.rect(0, 0, t, t);
  };
  const rel = () => (e.ajuste === 'inteira' ? Math.min : Math.max)(1 / e.img.width, 1 / e.img.height) * e.zoom;
  function limitar() {
    const mx = Math.max(0, (e.img.width * rel() - 1) / 2), my = Math.max(0, (e.img.height * rel() - 1) / 2);
    e.ox = Math.min(mx, Math.max(-mx, e.ox)); e.oy = Math.min(my, Math.max(-my, e.oy));
  }
  function pintar(c, t, opaco) {
    c.clearRect(0, 0, t, t); c.save(); c.beginPath(); caminho(c, t); c.clip();
    if (opaco || !e.transp) { c.fillStyle = e.cor; c.fillRect(0, 0, t, t); }
    let s = rel() * t, k = 0;
    while (s < 0.5) { s *= 2; k++; }
    const f = nivel(k), w = f.width * s, h = f.height * s;
    c.imageSmoothingQuality = 'high';
    c.drawImage(f, (t - w) / 2 + e.ox * t, (t - h) / 2 + e.oy * t, w, h); c.restore();
  }
  // Gera o ícone em qualquer tamanho a partir do original (nunca de outro tamanho já gerado).
  const desenhar = (t, opaco = false) => { const c = Object.assign(document.createElement('canvas'), { width: t, height: t }); pintar(c.getContext('2d'), t, opaco); return c; };
  const q = { extra: $('#extra'), aoMudar: null, desenhar, trocar: () => arq.click() };
  q.mini = (el, tams) => {
    const cs = tams.map(t => Object.assign(document.createElement('canvas'), { width: t, height: t, title: t + ' px' }));
    el.append(...cs);
    q.aoMudar = () => cs.forEach(c => { const x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height); x.drawImage(desenhar(c.width), 0, 0); });
  };
  function redesenhar() { limitar(); pintar(cx, cv.width, false); q.aoMudar?.(); }

  $('#zoom').oninput = ev => { e.zoom = +ev.target.value; redesenhar(); };
  $('#transp').oninput = ev => { e.transp = ev.target.checked; redesenhar(); };
  $('#cor').oninput = ev => { e.cor = ev.target.value; e.transp = false; $('#transp').checked = false; redesenhar(); };
  raiz.querySelectorAll('[name=forma]').forEach(r => r.onchange = () => { e.forma = r.value; redesenhar(); });
  raiz.querySelectorAll('[name=ajuste]').forEach(r => r.onchange = () => { e.ajuste = r.value; e.ox = e.oy = 0; redesenhar(); });
  let arrasto = false;
  cv.onpointerdown = ev => { cv.setPointerCapture(ev.pointerId); arrasto = true; };
  cv.onpointermove = ev => { if (!arrasto) return; const k = cv.width / cv.getBoundingClientRect().width; e.ox += ev.movementX * k / cv.width; e.oy += ev.movementY * k / cv.height; redesenhar(); };
  cv.onpointerup = cv.onpointercancel = () => { arrasto = false; };
  cv.onwheel = ev => { ev.preventDefault(); e.zoom = Math.min(4, Math.max(1, e.zoom + (ev.deltaY < 0 ? 0.1 : -0.1))); $('#zoom').value = e.zoom; redesenhar(); };
  ligarEntrada(raiz, [arq], bmp => {
    e.img = bmp; e.zoom = 1; e.ox = e.oy = 0; cadeia = [bmp]; $('#zoom').value = 1;
    $('#zona').hidden = true; $('#editor').hidden = false; redesenhar();
  });
  return q;
}

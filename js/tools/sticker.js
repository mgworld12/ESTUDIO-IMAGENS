import { ligarEntrada, metade } from '../core/imagem.js';
import { codificar, lerAssinatura, zip, baixar } from '../services/exportar.js';
import { avisar } from '../utils/avisar.js';
import { recortarFundo } from '../core/recorte.js';

// Limites oficiais (repositório WhatsApp/stickers): 512x512, estática até 100 KB, pacote de 3 a 30; bandeja 96x96 até 50 KB.
const T = 512, LIM = 100 * 1024, MIN = 3, MAX = 30;
const FONTES = { impact: 'Impact, "Arial Black", sans-serif', arial: '"Arial Black", Arial, sans-serif', comic: '"Comic Sans MS", "Segoe Print", cursive', segoe: '"Segoe UI", system-ui, sans-serif' };
const kb = b => Math.max(1, Math.round(b / 1024)) + ' KB';

function caminho(c, x, w, forma) {
  if (forma === 'redondo') c.arc(x + w / 2, x + w / 2, w / 2, 0, Math.PI * 2);
  else if (forma === 'arredondado') c.roundRect(x, x, w, w, w * 0.22);
  else if (forma === 'coracao') {
    c.moveTo(x + w / 2, x + w * 0.95);
    c.bezierCurveTo(x - w * 0.1, x + w * 0.55, x + w * 0.05, x - w * 0.05, x + w / 2, x + w * 0.25);
    c.bezierCurveTo(x + w * 0.95, x - w * 0.05, x + w * 1.1, x + w * 0.55, x + w / 2, x + w * 0.95);
  } else if (forma === 'estrela') {
    for (let i = 0; i < 10; i++) { const r = (i % 2 ? 0.42 : 1) * w / 2, a = -Math.PI / 2 + i * Math.PI / 5; c[i ? 'lineTo' : 'moveTo'](x + w / 2 + r * Math.cos(a), x + w / 2 + r * Math.sin(a)); }
    c.closePath();
  }
}
const escura = hex => (parseInt(hex.slice(1, 3), 16) * 0.299 + parseInt(hex.slice(3, 5), 16) * 0.587 + parseInt(hex.slice(5, 7), 16) * 0.114) < 128;

// WebP até 100 KB: tenta qualidade alta e, se passar do limite, procura a maior qualidade que cabe.
async function webp(c) {
  const enc = q => new Promise(r => c.toBlob(r, 'image/webp', q));
  let b = await enc(0.95);
  if (!b || await lerAssinatura(b) !== 'webp') throw new Error('Este navegador não gera WebP. Use Chrome, Edge ou Firefox.');
  if (b.size <= LIM) return b;
  let lo = 0.05, hi = 0.95, ok = null;
  for (let i = 0; i < 7; i++) { const q = (lo + hi) / 2, t = await enc(q); if (t.size <= LIM) { ok = t; lo = q; } else hi = q; }
  if (!ok) throw new Error('Não coube em 100 KB nem na qualidade mínima. Simplifique a imagem (menos detalhes e degradês) e tente de novo.');
  return ok;
}

export function montarSticker(raiz) {
  const e = { img: null, zoom: 1, ox: 0, oy: 0, forma: 'arredondado', ajuste: 'preencher', cont: true, ccor: '#ffffff', cw: 14, texto: '', fonte: 'impact', tcor: '#ffffff', fsz: 80, pos: 2 };
  let cadeia = [], pack = [];
  raiz.innerHTML = `
  <div class="zona" id="zona"><p><strong>Arraste uma imagem para cá</strong>, cole com Ctrl+V ou escolha um arquivo.</p>
    <div class="acoes"><button type="button" class="primario" id="bArq">Escolher imagem</button></div><input id="arq" type="file" accept="image/*" hidden></div>
  <div class="editor" id="editor" hidden>
    <div class="previa"><canvas id="cv" width="${T}" height="${T}" aria-label="Prévia da figurinha"></canvas><p class="dica">Arraste para enquadrar. Zoom pela barra ou pela roda do mouse.</p></div>
    <form class="ctrl">
      <fieldset><legend>Forma</legend>
        <label><input type="radio" name="forma" value="arredondado" checked> Arredondada</label><label><input type="radio" name="forma" value="redondo"> Redonda</label>
        <label><input type="radio" name="forma" value="coracao"> Coração</label><label><input type="radio" name="forma" value="estrela"> Estrela</label>
        <label><input type="radio" name="forma" value="livre"> Livre (usa a transparência da imagem)</label></fieldset>
      <fieldset><legend>Ajuste</legend><label><input type="radio" name="ajuste" value="preencher" checked> Preencher a forma</label><label><input type="radio" name="ajuste" value="inteira"> Imagem inteira</label></fieldset>
      <label>Zoom <input type="range" id="zoom" min="1" max="4" step="0.01" value="1"></label>
      <label><input type="checkbox" id="cont" checked> Contorno <input type="color" id="ccor" value="#ffffff"><input type="range" id="cw" min="4" max="30" value="14" aria-label="Espessura do contorno"></label>
      <fieldset><legend>Texto</legend>
        <input type="text" id="texto" maxlength="40" placeholder="Escreva aqui (emojis também)">
        <select id="fonte" aria-label="Fonte" style="width:auto"><option value="impact">Impact</option><option value="arial">Arial Black</option><option value="comic">Comic</option><option value="segoe">Segoe UI</option></select>
        <input type="color" id="tcor" value="#ffffff" aria-label="Cor do texto">
        <select id="pos" aria-label="Posição" style="width:auto"><option value="0">Em cima</option><option value="1">No meio</option><option value="2" selected>Embaixo</option></select>
        <label>Tamanho <input type="range" id="fsz" min="24" max="160" value="80"></label></fieldset>
      <div class="acoes"><button type="button" class="primario" id="add">Adicionar ao pacote</button><button type="button" id="um">Baixar só esta</button><button type="button" id="trocar">Trocar imagem</button><button type="button" id="semfundo">Remover fundo</button></div>
      <p class="aviso">Cada figurinha sai em WebP 512 × 512 com fundo transparente e até 100 KB (a qualidade é ajustada sozinha).</p>
      <fieldset><legend>Pacote</legend><div class="pacote" id="pacote"></div>
        <label>Nome <input type="text" id="pnome" value="Meu pacote" maxlength="30"></label><label>Autor <input type="text" id="pautor" maxlength="30"></label>
        <button type="button" id="zipbtn" disabled>Baixar pacote (ZIP)</button><p class="aviso" id="pinfo"></p></fieldset>
    </form></div>`;
  const $ = s => raiz.querySelector(s), cv = $('#cv'), cx = cv.getContext('2d'), arq = $('#arq');
  $('form').onsubmit = ev => ev.preventDefault(); $('#bArq').onclick = $('#trocar').onclick = () => arq.click();
  $('#semfundo').onclick = async () => {
    const r = await recortarFundo(e.img); if (!r) return;
    e.img = r; cadeia = [r]; e.ox = e.oy = 0; e.forma = 'livre'; e.ajuste = 'inteira';   // o recorte já tem a forma do desenho
    raiz.querySelector('[name=forma][value=livre]').checked = true; raiz.querySelector('[name=ajuste][value=inteira]').checked = true; redesenhar();
  };

  const nivel = k => { while (cadeia.length <= k) cadeia.push(metade(cadeia.at(-1))); return cadeia[k]; };
  const rel = () => (e.ajuste === 'inteira' ? Math.min : Math.max)(1 / e.img.width, 1 / e.img.height) * e.zoom;
  function limitar() { const mx = Math.max(0, (e.img.width * rel() - 1) / 2), my = Math.max(0, (e.img.height * rel() - 1) / 2); e.ox = Math.min(mx, Math.max(-mx, e.ox)); e.oy = Math.min(my, Math.max(-my, e.oy)); }
  function pintar(c) {
    c.clearRect(0, 0, T, T);
    const m = e.cont ? e.cw + 6 : 6, w = T - 2 * m, livre = e.forma === 'livre';
    const foto = x => { let s = rel() * w, k = 0; while (s < 0.5) { s *= 2; k++; } const f = nivel(k), dw = f.width * s, dh = f.height * s; x.imageSmoothingQuality = 'high'; x.drawImage(f, T / 2 - dw / 2 + e.ox * w, T / 2 - dh / 2 + e.oy * w, dw, dh); };
    if (e.cont) {
      if (!livre) { c.beginPath(); caminho(c, m, w, e.forma); c.lineWidth = e.cw * 2; c.lineJoin = 'round'; c.strokeStyle = e.ccor; c.stroke(); }
      else { // contorno que acompanha o desenho: cópia pintada da imagem, repetida em volta
        const t = Object.assign(document.createElement('canvas'), { width: T, height: T }), x = t.getContext('2d');
        foto(x); x.globalCompositeOperation = 'source-in'; x.fillStyle = e.ccor; x.fillRect(0, 0, T, T);
        for (let i = 0; i < 32; i++) { const a = i * Math.PI / 16; c.drawImage(t, Math.cos(a) * e.cw, Math.sin(a) * e.cw); }
      }
    }
    c.save(); if (!livre) { c.beginPath(); caminho(c, m, w, e.forma); c.clip(); } foto(c); c.restore();
    if (e.texto.trim()) {
      c.font = `${e.fsz}px ${FONTES[e.fonte]}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
      c.lineWidth = Math.max(3, e.fsz / 6); c.strokeStyle = escura(e.tcor) ? '#fff' : '#111'; c.fillStyle = e.tcor;
      const y = [0.14, 0.5, 0.86][e.pos] * T; c.strokeText(e.texto, T / 2, y, T - 24); c.fillText(e.texto, T / 2, y, T - 24);
    }
  }
  const redesenhar = () => { limitar(); pintar(cx); };
  const ler = () => Object.assign(e, { cont: $('#cont').checked, ccor: $('#ccor').value, cw: +$('#cw').value, texto: $('#texto').value, fonte: $('#fonte').value, tcor: $('#tcor').value, fsz: +$('#fsz').value, pos: +$('#pos').value, zoom: +$('#zoom').value });
  raiz.querySelector('form').addEventListener('input', ev => { if (e.img && !ev.target.name && !ev.target.id.startsWith('p')) { ler(); redesenhar(); } });
  raiz.querySelectorAll('[name=forma],[name=ajuste]').forEach(r => r.onchange = () => { e[r.name] = r.value; if (r.name === 'ajuste') e.ox = e.oy = 0; redesenhar(); });
  let arr = false;
  cv.onpointerdown = ev => { cv.setPointerCapture(ev.pointerId); arr = true; };
  cv.onpointermove = ev => { if (!arr) return; const k = cv.width / cv.getBoundingClientRect().width, w = T - 2 * (e.cont ? e.cw + 6 : 6); e.ox += ev.movementX * k / w; e.oy += ev.movementY * k / w; redesenhar(); };
  cv.onpointerup = cv.onpointercancel = () => { arr = false; };
  cv.onwheel = ev => { ev.preventDefault(); e.zoom = Math.min(4, Math.max(1, e.zoom + (ev.deltaY < 0 ? 0.1 : -0.1))); $('#zoom').value = e.zoom; redesenhar(); };

  async function gerar() { const c = Object.assign(document.createElement('canvas'), { width: T, height: T }); pintar(c.getContext('2d')); return { c, blob: await webp(c) }; }
  const nome = () => (e.texto.trim() || 'figurinha').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/gi, '-').slice(0, 20);
  $('#um').onclick = async () => { try { const { blob } = await gerar(); baixar(blob, nome() + '.webp'); avisar(`Figurinha baixada (${kb(blob.size)}).`, 'ok'); } catch (err) { avisar(err.message, 'erro'); } };
  function lista() {
    $('#pacote').replaceChildren(...pack.map((p, i) => Object.assign(document.createElement('img'), { src: p.url, alt: 'Figurinha ' + (i + 1), title: 'Clique para remover', onclick: () => { pack.splice(i, 1); lista(); } })));
    $('#zipbtn').disabled = pack.length < MIN;
    $('#pinfo').textContent = pack.length < MIN ? `${pack.length} de ${MIN} figurinhas (mínimo do WhatsApp). Clique em uma miniatura para remover.` : `${pack.length} figurinhas (máximo ${MAX}). Clique em uma miniatura para remover.`;
  }
  $('#add').onclick = async () => {
    if (pack.length >= MAX) return avisar(`O pacote já tem ${MAX} figurinhas (máximo).`, 'erro');
    try { const { c, blob } = await gerar(); pack.push({ c, blob, url: URL.createObjectURL(blob) }); lista(); avisar(`Figurinha ${pack.length} adicionada (${kb(blob.size)}).`, 'ok'); } catch (err) { avisar(err.message, 'erro'); }
  };
  $('#zipbtn').onclick = async () => {
    try {
      let f = pack[0].c; while (f.width > 192) f = metade(f);
      const tray = Object.assign(document.createElement('canvas'), { width: 96, height: 96 }), x = tray.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(f, 0, 0, 96, 96);
      const bandeja = await codificar(tray, 'png'), nm = $('#pnome').value.trim() || 'Meu pacote', au = $('#pautor').value.trim();
      const leia = `PACOTE DE FIGURINHAS: ${nm}${au ? '\nAutor: ' + au : ''}\nGerado no IMAGE STUDIO. ${pack.length} figurinhas.\n\nConteúdo\n- figurinhas/: arquivos WebP 512 x 512 com fundo transparente, até 100 KB cada.\n- bandeja-96x96.png: ícone do pacote (96 x 96 px, ${kb(bandeja.size)}; o limite é 50 KB).\n\nIMPORTANTE: baixar este ZIP não instala as figurinhas no WhatsApp.\nPara usá-las, passe os arquivos para o celular e importe-os com um aplicativo de criação/importação de figurinhas disponível na loja do seu aparelho.\nRegras do WhatsApp: cada pacote tem de 3 a 30 figurinhas e não mistura estáticas com animadas.\n`;
      baixar(await zip([...pack.map((p, i) => ({ nome: `figurinhas/${String(i + 1).padStart(2, '0')}.webp`, blob: p.blob })), { nome: 'bandeja-96x96.png', blob: bandeja }, { nome: 'LEIA-ME.txt', blob: new Blob([leia], { type: 'text/plain' }) }]), nome().replace(/^figurinha$/, 'pacote') + '-pacote.zip');
      avisar('Pacote baixado. Abra o LEIA-ME.txt.', 'ok');
    } catch (err) { avisar(err.message, 'erro'); }
  };
  lista();
  ligarEntrada(raiz, [arq], bmp => { e.img = bmp; e.zoom = 1; e.ox = e.oy = 0; cadeia = [bmp]; $('#zoom').value = 1; $('#zona').hidden = true; $('#editor').hidden = false; redesenhar(); });
}

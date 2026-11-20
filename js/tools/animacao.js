import { abrirArquivo, metade } from '../core/imagem.js';
import { lerAssinatura, baixar } from '../services/exportar.js';
import { codificarGif } from '../services/gif.js';
import { avisar } from '../utils/avisar.js';

const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));

export function montarAnimacao(raiz) {
  const e = { tam: 256, ajuste: 'inteira', transp: true, cor: '#ffffff', ms: 200, rep: 'inf', n: 3, cores: 256, matte: '#ffffff' };
  let frames = [], cache = [], idx = 0, timer = 0, tocando = true, cancelar = false;
  raiz.innerHTML = `
  <div class="zona" id="zona"><p><strong>Arraste várias imagens para cá</strong>, cole com Ctrl+V ou escolha os arquivos. Cada imagem vira um quadro.</p>
    <div class="acoes"><button type="button" class="primario" id="bArq">Escolher imagens</button></div><input id="arq" type="file" accept="image/*" multiple hidden></div>
  <div class="editor" id="editor" hidden>
    <div class="previa"><canvas id="cv" width="256" height="256" aria-label="Prévia da animação"></canvas>
      <div class="acoes"><button type="button" id="play">Pausar</button><span class="dica" id="info"></span></div></div>
    <form class="ctrl">
      <fieldset><legend>Quadros</legend><div class="quadros" id="quadros"></div><div class="acoes"><button type="button" id="mais">Adicionar imagens</button></div></fieldset>
      <label>Tempo padrão <input type="number" id="ms" min="20" max="10000" step="10" value="200"> ms <button type="button" id="aplicar">Aplicar a todos</button></label>
      <label>Tamanho <select id="tam"><option>128</option><option selected>256</option><option>320</option><option>480</option></select> px</label>
      <fieldset><legend>Ajuste</legend><label><input type="radio" name="ajuste" value="inteira" checked> Imagem inteira</label><label><input type="radio" name="ajuste" value="preencher"> Preencher o quadro</label></fieldset>
      <label><input type="checkbox" id="transp" checked> Fundo transparente</label><label>Cor do fundo <input type="color" id="cor" value="#ffffff"></label>
      <label>Repetição <select id="rep"><option value="inf">Infinita</option><option value="1">Tocar 1 vez</option><option value="n">Tocar N vezes</option></select><input type="number" id="n" min="2" max="100" value="3" hidden></label>
      <details><summary>Avançado: cores e bordas</summary>
        <label>Cores <input type="range" id="cores" min="2" max="256" value="256"><output id="ocores">256</output></label>
        <label>Cor para suavizar as bordas <input type="color" id="matte" value="#ffffff"></label>
        <p class="aviso">O GIF só tem transparência total ou nenhuma, sem bordas suaves. As bordas semitransparentes são misturadas com a cor escolhida acima: use a cor do fundo onde a animação vai ser exibida. O tempo de cada quadro é guardado em centésimos de segundo.</p></details>
      <div class="acoes"><button type="button" class="primario" id="gif">Baixar GIF</button><button type="button" id="cancel" hidden>Cancelar</button></div>
      <p class="aviso" id="prog"></p>
    </form></div>`;
  const $ = s => raiz.querySelector(s), cv = $('#cv'), cx = cv.getContext('2d'), arq = $('#arq');
  $('form').onsubmit = ev => ev.preventDefault(); $('#bArq').onclick = $('#mais').onclick = () => arq.click();

  function render(f, S) {
    const c = Object.assign(document.createElement('canvas'), { width: S, height: S }), x = c.getContext('2d');
    if (!e.transp) { x.fillStyle = e.cor; x.fillRect(0, 0, S, S); }
    let s = (e.ajuste === 'inteira' ? Math.min : Math.max)(S / f.img.width, S / f.img.height), im = f.img;
    while (s < 0.5) { im = metade(im); s *= 2; }
    const w = im.width * s, h = im.height * s; x.imageSmoothingQuality = 'high'; x.drawImage(im, (S - w) / 2, (S - h) / 2, w, h); return c;
  }
  const resumo = () => { $('#info').textContent = `${frames.length} quadro(s) · ${(frames.reduce((s, f) => s + f.ms, 0) / 1000).toFixed(1)} s`; };
  function tocar() {
    clearTimeout(timer); if (!tocando || !cache.length) return;
    idx %= cache.length; cx.clearRect(0, 0, cv.width, cv.height); cx.drawImage(cache[idx], 0, 0);
    timer = setTimeout(tocar, frames[idx].ms); idx++;
  }
  function listar() {
    $('#quadros').replaceChildren(...frames.map((f, i) => {
      const d = document.createElement('div'), t = Object.assign(document.createElement('canvas'), { width: 64, height: 64 });
      d.className = 'q'; t.getContext('2d').drawImage(cache[i], 0, 0, 64, 64); d.append(t);
      d.insertAdjacentHTML('beforeend', `<div class="bq"><button type="button" data-a="e" data-i="${i}" aria-label="Mover para antes"${i ? '' : ' disabled'}>◀</button><button type="button" data-a="d" data-i="${i}" aria-label="Mover para depois"${i < frames.length - 1 ? '' : ' disabled'}>▶</button><button type="button" data-a="c" data-i="${i}" aria-label="Duplicar quadro">⧉</button><button type="button" data-a="x" data-i="${i}" aria-label="Remover quadro">✕</button></div><input type="number" class="qms" data-i="${i}" min="20" max="10000" step="10" value="${f.ms}" aria-label="Tempo do quadro ${i + 1} em milissegundos">`);
      return d;
    }));
  }
  function refazer() {
    $('#zona').hidden = frames.length > 0; $('#editor').hidden = !frames.length;
    cache = frames.map(f => render(f, e.tam)); cv.width = cv.height = e.tam; idx = 0; listar(); resumo(); tocar();
  }
  $('#quadros').onclick = ev => {
    const b = ev.target.closest('button'); if (!b) return; const i = +b.dataset.i, a = b.dataset.a;
    if (a === 'x') frames.splice(i, 1); else if (a === 'c') frames.splice(i + 1, 0, { ...frames[i] });
    else { const j = a === 'e' ? i - 1 : i + 1; [frames[i], frames[j]] = [frames[j], frames[i]]; }
    refazer();
  };
  $('#quadros').onchange = ev => { if (ev.target.classList.contains('qms')) { frames[+ev.target.dataset.i].ms = Math.max(20, +ev.target.value || e.ms); resumo(); } };

  const adicionar = async files => {
    for (const f of files) { try { frames.push({ img: await abrirArquivo(f), ms: e.ms }); } catch (err) { avisar(err.message, 'erro'); } }
    refazer();
  };
  arq.onchange = () => { adicionar([...arq.files]); arq.value = ''; };
  raiz.ondragover = ev => { ev.preventDefault(); $('#zona').classList.add('sobre'); }; raiz.ondragleave = () => $('#zona').classList.remove('sobre');
  raiz.ondrop = ev => { ev.preventDefault(); $('#zona').classList.remove('sobre'); adicionar([...ev.dataTransfer.files]); };
  document.onpaste = ev => { const f = [...(ev.clipboardData?.files || [])]; if (f.length) adicionar(f); };

  $('#ms').oninput = ev => { e.ms = Math.max(20, +ev.target.value || 200); };
  $('#aplicar').onclick = () => { frames.forEach(f => f.ms = e.ms); listar(); resumo(); };
  $('#tam').onchange = ev => { e.tam = +ev.target.value; refazer(); };
  raiz.querySelectorAll('[name=ajuste]').forEach(r => r.onchange = () => { e.ajuste = r.value; refazer(); });
  $('#transp').onchange = ev => { e.transp = ev.target.checked; refazer(); };
  $('#cor').oninput = ev => { e.cor = ev.target.value; e.transp = false; $('#transp').checked = false; refazer(); };
  $('#rep').onchange = ev => { e.rep = ev.target.value; $('#n').hidden = e.rep !== 'n'; };
  $('#n').oninput = ev => { e.n = Math.max(2, +ev.target.value || 2); };
  $('#cores').oninput = ev => { e.cores = +ev.target.value; $('#ocores').textContent = e.cores; };
  $('#matte').oninput = ev => { e.matte = ev.target.value; };
  $('#play').onclick = () => { tocando = !tocando; $('#play').textContent = tocando ? 'Pausar' : 'Tocar'; tocar(); };
  $('#cancel').onclick = () => { cancelar = true; };

  $('#gif').onclick = async () => {
    if (!frames.length) return;
    cancelar = false; $('#gif').disabled = true; $('#cancel').hidden = false;
    try {
      const S = e.tam, dados = frames.map(f => ({ data: render(f, S).getContext('2d').getImageData(0, 0, S, S).data, ms: f.ms }));
      const loops = e.rep === 'inf' ? 0 : e.rep === '1' ? -1 : e.n - 1;
      const blob = await codificarGif(dados, S, S, { cores: e.cores, loops, transp: e.transp, matte: hex(e.matte), aoProgresso: (i, n) => { $('#prog').textContent = `Gerando quadro ${i} de ${n}…`; }, cancelado: () => cancelar });
      if (await lerAssinatura(blob) !== 'gif') throw new Error('Não foi possível gerar um GIF válido.');
      baixar(blob, 'animacao.gif'); $('#prog').textContent = `GIF pronto: ${Math.max(1, Math.round(blob.size / 1024))} KB, ${frames.length} quadros, ${S} × ${S} px.`; avisar('GIF baixado.', 'ok');
    } catch (err) { $('#prog').textContent = ''; avisar(err.message, err.message === 'Cancelado.' ? 'ok' : 'erro'); }
    finally { $('#gif').disabled = false; $('#cancel').hidden = true; }
  };
}

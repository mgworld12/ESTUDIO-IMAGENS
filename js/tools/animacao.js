import { abrirArquivo, metade } from '../core/imagem.js';
import { codificar, lerAssinatura, baixar, zip } from '../services/exportar.js';
import { gerarStickerAnimado, LADO } from '../services/sticker-anim.js';
import { codificarGif } from '../services/gif.js';
import { montarWebpAnimado, validarWebpAnimado } from '../services/webp-anim.js';
import { lerQuadros } from '../services/animados.js';
import { avisar } from '../utils/avisar.js';

const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));

export function montarAnimacao(raiz) {
  const e = { tam: 256, ajuste: 'inteira', transp: true, cor: '#ffffff', ms: 200, rep: 'inf', n: 3, cores: 256, matte: '#ffffff', qw: 0.9 };
  let frames = [], cache = [], idx = 0, timer = 0, tocando = true, cancelar = false;
  raiz.innerHTML = `
  <div class="zona" id="zona"><p><strong>Arraste várias imagens para cá</strong>, cole com Ctrl+V ou escolha os arquivos. Cada imagem vira um quadro; GIF e WebP animados são separados em quadros.</p>
    <div class="acoes"><button type="button" class="primario" id="bArq">Escolher imagens</button></div><input id="arq" type="file" accept="image/*" multiple hidden></div>
  <div class="editor" id="editor" hidden>
    <div class="previa"><canvas id="cv" width="256" height="256" aria-label="Prévia da animação"></canvas>
      <div class="acoes"><button type="button" id="play">Pausar</button><span class="dica" id="info"></span></div></div>
    <form class="ctrl">
      <fieldset><legend>Quadros</legend><div class="quadros" id="quadros"></div><div class="acoes"><button type="button" id="mais">Adicionar imagens</button><button type="button" id="semfundo" title="Usa IA no navegador; leva alguns segundos por quadro">Remover fundo de todos os quadros</button></div></fieldset>
      <label>Tempo padrão <input type="number" id="ms" min="20" max="10000" step="10" value="200"> ms <button type="button" id="aplicar">Aplicar a todos</button></label>
      <label>Tamanho <select id="tam"><option>128</option><option selected>256</option><option>320</option><option>480</option></select> px</label>
      <fieldset><legend>Ajuste</legend><label><input type="radio" name="ajuste" value="inteira" checked> Imagem inteira</label><label><input type="radio" name="ajuste" value="preencher"> Preencher o quadro</label></fieldset>
      <label><input type="checkbox" id="transp" checked> Fundo transparente</label><label>Cor do fundo <input type="color" id="cor" value="#ffffff"></label>
      <label>Repetição <select id="rep"><option value="inf">Infinita</option><option value="1">Tocar 1 vez</option><option value="n">Tocar N vezes</option></select><input type="number" id="n" min="2" max="100" value="3" hidden></label>
      <details><summary>Avançado: cores e bordas</summary>
        <label>Cores <input type="range" id="cores" min="2" max="256" value="256"><output id="ocores">256</output></label>
        <label>Cor para suavizar as bordas (GIF) <input type="color" id="matte" value="#ffffff"></label>
        <label>Qualidade do WebP <input type="range" id="qw" min="0.5" max="1" step="0.01" value="0.9"><output id="oqw">90%</output></label>
        <p class="aviso">O GIF só tem transparência total ou nenhuma, sem bordas suaves. As bordas semitransparentes são misturadas com a cor escolhida acima: use a cor do fundo onde a animação vai ser exibida. O tempo de cada quadro é guardado em centésimos de segundo. O WebP animado aceita bordas suaves e fica melhor com fundo transparente, mas sempre perde um pouco de qualidade.</p></details>
      <div class="acoes"><button type="button" class="primario" id="gif">Baixar GIF</button><button type="button" class="primario" id="webp">Baixar WebP animado</button><button type="button" id="cancel" hidden>Cancelar</button></div>
      <p class="aviso" id="prog"></p>
      <fieldset><legend>Sticker animado para WhatsApp</legend>
        <p class="aviso">Gera um WebP animado de 512 × 512 px, até 500 KB e 10 s, ajustando a qualidade sozinho. O WhatsApp termina a animação no primeiro quadro: deixe o primeiro quadro com a imagem completa. Use fundo transparente.</p>
        <div class="acoes"><button type="button" class="primario" id="stk">Baixar sticker animado</button><button type="button" id="stkadd">Adicionar ao pacote</button></div>
        <div class="pacote" id="pacoteA"></div>
        <label>Nome <input type="text" id="pnomeA" value="Meu pacote animado" maxlength="30"></label><label>Autor <input type="text" id="pautorA" maxlength="30"></label>
        <button type="button" id="stkzip" disabled>Baixar pacote (ZIP)</button><p class="aviso" id="pinfoA"></p></fieldset>
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
    for (const f of files) {
      try {
        const q = await lerQuadros(f);
        if (q) frames.push(...q);
        else { if (f.type === 'image/gif' && typeof ImageDecoder === 'undefined') avisar('Este navegador não separa os quadros do GIF: entra só o primeiro.', 'erro'); frames.push({ img: await abrirArquivo(f), ms: e.ms }); }
      } catch (err) { avisar(err.message, 'erro'); }
    }
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

  $('#qw').oninput = ev => { e.qw = +ev.target.value; $('#oqw').textContent = Math.round(e.qw * 100) + '%'; };

  const ocupar = x => { ['#gif', '#webp', '#stk', '#stkadd', '#semfundo'].forEach(s => { $(s).disabled = x; }); $('#cancel').hidden = !x; };
  async function exportar(nome, gerar) {
    if (!frames.length) return;
    cancelar = false; ocupar(true);
    try {
      const blob = await gerar();
      baixar(blob, nome); $('#prog').textContent = `Pronto: ${Math.max(1, Math.round(blob.size / 1024))} KB, ${frames.length} quadros, ${e.tam} × ${e.tam} px.`; avisar('Arquivo baixado.', 'ok');
    } catch (err) { $('#prog').textContent = ''; avisar(err.message, err.message === 'Cancelado.' ? 'ok' : 'erro'); }
    finally { ocupar(false); }
  }
  const progresso = (i, n) => { $('#prog').textContent = `Gerando quadro ${i} de ${n}…`; };

  $('#gif').onclick = () => exportar('animacao.gif', async () => {
    const S = e.tam, dados = frames.map(f => ({ data: render(f, S).getContext('2d').getImageData(0, 0, S, S).data, ms: f.ms }));
    const blob = await codificarGif(dados, S, S, { cores: e.cores, loops: e.rep === 'inf' ? 0 : e.rep === '1' ? -1 : e.n - 1, transp: e.transp, matte: hex(e.matte), aoProgresso: progresso, cancelado: () => cancelar });
    if (await lerAssinatura(blob) !== 'gif') throw new Error('Não foi possível gerar um GIF válido.');
    return blob;
  });

  $('#webp').onclick = () => exportar('animacao.webp', async () => {
    const S = e.tam, partes = [];
    for (let i = 0; i < frames.length; i++) {
      if (cancelar) throw new Error('Cancelado.');
      const b = await new Promise(r => render(frames[i], S).toBlob(r, 'image/webp', e.qw));
      if (!b || await lerAssinatura(b) !== 'webp') throw new Error('Este navegador não gera WebP. Use Chrome, Edge ou Firefox.');
      partes.push({ blob: b, ms: frames[i].ms }); progresso(i + 1, frames.length); await new Promise(r => setTimeout(r));
    }
    const blob = await montarWebpAnimado(partes, S, S, e.rep === 'inf' ? 0 : e.rep === '1' ? 1 : e.n);
    if ((await validarWebpAnimado(blob)).quadros !== frames.length) throw new Error('O WebP animado gerado não ficou com todos os quadros.');
    return blob;
  });

  // ---- Sticker animado para WhatsApp (limites oficiais: 512x512, até 500 KB, até 10 s) ----
  let packA = [];
  const webpQuadro = async (c, q) => { const b = await new Promise(r => c.toBlob(r, 'image/webp', q)); if (!b || await lerAssinatura(b) !== 'webp') throw new Error('Este navegador não gera WebP. Use Chrome, Edge ou Firefox.'); return b; };
  async function gerarSticker() {
    if (frames.length < 2) throw new Error('Um sticker animado precisa de pelo menos 2 quadros.');
    const r = await gerarStickerAnimado(frames.map(f => ({ c: render(f, LADO), ms: f.ms })), { codificar: webpQuadro, aoProgresso: t => { $('#prog').textContent = t; }, cancelado: () => cancelar });
    const v = await validarWebpAnimado(r.blob), dur = v.ms.reduce((a, b) => a + b, 0);
    if (v.quadros !== r.quadros || v.ms.some(m => m < 8) || dur > 10000 || r.blob.size > 500 * 1024) throw new Error('O sticker gerado não passou na conferência dos limites do WhatsApp.');
    $('#prog').textContent = `Sticker pronto: ${Math.round(r.blob.size / 1024)} KB (limite 500), ${r.quadros} quadros, ${(dur / 1000).toFixed(1)} s (limite 10), qualidade ${Math.round(r.qualidade * 100)}%.`;
    return { blob: r.blob, c0: render(frames[0], LADO) };
  }
  const trabalho = async fn => { cancelar = false; ocupar(true); try { await fn(); } catch (err) { $('#prog').textContent = ''; avisar(err.message, err.message === 'Cancelado.' ? 'ok' : 'erro'); } finally { ocupar(false); } };
  $('#stk').onclick = () => trabalho(async () => { baixar((await gerarSticker()).blob, 'sticker-animado.webp'); avisar('Sticker baixado.', 'ok'); });
  function listaA() {
    $('#pacoteA').replaceChildren(...packA.map((p, i) => Object.assign(document.createElement('img'), { src: p.url, alt: 'Sticker ' + (i + 1), title: 'Clique para remover', onclick: () => { packA.splice(i, 1); listaA(); } })));
    $('#stkzip').disabled = packA.length < 3;
    $('#pinfoA').textContent = packA.length < 3 ? `${packA.length} de 3 stickers (mínimo do WhatsApp). Clique em uma miniatura para remover.` : `${packA.length} stickers (máximo 30). Clique em uma miniatura para remover.`;
  }
  $('#stkadd').onclick = () => trabalho(async () => {
    if (packA.length >= 30) throw new Error('O pacote já tem 30 stickers (máximo).');
    const r = await gerarSticker(); packA.push({ ...r, url: URL.createObjectURL(r.blob) }); listaA(); avisar(`Sticker ${packA.length} adicionado ao pacote.`, 'ok');
  });
  $('#stkzip').onclick = () => trabalho(async () => {
    let f = packA[0].c0; while (f.width > 192) f = metade(f);
    const tray = Object.assign(document.createElement('canvas'), { width: 96, height: 96 }), x = tray.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(f, 0, 0, 96, 96);
    const bandeja = await codificar(tray, 'png'), nm = $('#pnomeA').value.trim() || 'Meu pacote animado', au = $('#pautorA').value.trim();
    const leia = `PACOTE DE STICKERS ANIMADOS: ${nm}${au ? '\nAutor: ' + au : ''}\nGerado no IMAGE STUDIO. ${packA.length} stickers.\n\nConteúdo\n- figurinhas/: WebP animado 512 x 512, até 500 KB e 10 s cada.\n- bandeja-96x96.png: ícone do pacote (96 x 96 px, ${Math.max(1, Math.round(bandeja.size / 1024))} KB; o limite é 50 KB).\n\nIMPORTANTE: baixar este ZIP não instala os stickers no WhatsApp.\nPara usá-los, passe os arquivos para o celular e importe-os com um aplicativo de criação/importação de figurinhas animadas. Esses aplicativos pedem de 1 a 3 emojis para cada sticker.\nRegras do WhatsApp: pacote de 3 a 30 stickers; não mistura animados com estáticos; o WhatsApp termina a animação no primeiro quadro.\n`;
    baixar(await zip([...packA.map((p, i) => ({ nome: `figurinhas/${String(i + 1).padStart(2, '0')}.webp`, blob: p.blob })), { nome: 'bandeja-96x96.png', blob: bandeja }, { nome: 'LEIA-ME.txt', blob: new Blob([leia], { type: 'text/plain' }) }]), 'pacote-animado.zip');
    avisar('Pacote baixado. Abra o LEIA-ME.txt.', 'ok');
  });
  listaA();

  // ---- Remover fundo de todos os quadros (IA local; baixa o motor na primeira vez) ----
  $('#semfundo').onclick = () => trabalho(async () => {
    const { recortarAuto } = await import('../services/fundo.js');
    for (let i = 0; i < frames.length; i++) {
      if (cancelar) throw new Error('Cancelado.');
      $('#prog').textContent = `Removendo o fundo do quadro ${i + 1} de ${frames.length}…`;
      frames[i].img = await recortarAuto(frames[i].img, (r, lido, total) => { $('#prog').textContent = `Baixando ${r}… ${(lido / 1048576).toFixed(1)} de ${(total / 1048576).toFixed(1)} MB`; });
    }
    e.transp = true; $('#transp').checked = true; refazer(); $('#prog').textContent = `Fundo removido de ${frames.length} quadros.`;
  });
}

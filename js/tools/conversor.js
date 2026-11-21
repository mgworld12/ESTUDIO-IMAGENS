import { abrirArquivo, metade } from '../core/imagem.js';
import { codificar, lerAssinatura, baixar, zip } from '../services/exportar.js';
import { codificarGif } from '../services/gif.js';
import { gerarIco } from '../services/ico.js';
import { avisar } from '../utils/avisar.js';

const kb = b => b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(b < 10240 ? 1 : 0) + ' KB' : (b / 1048576).toFixed(2) + ' MB';
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const tela = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });

export function montarConversor(raiz) {
  const e = { fmt: 'webp', q: 0.85, red: 'nao', val: 1600, transp: true, cor: '#ffffff', suf: '-otimizado' };
  let itens = [], cancelar = false, rodando = false;
  raiz.innerHTML = `
  <div class="zona" id="zona"><p><strong>Arraste várias imagens para cá</strong>, cole com Ctrl+V ou escolha os arquivos.</p>
    <div class="acoes"><button type="button" class="primario" id="bArq">Escolher imagens</button></div><input id="arq" type="file" accept="image/*" multiple hidden></div>
  <form class="ctrl" style="margin-top:1rem">
    <label>Converter para <select id="fmt"><option value="webp" selected>WebP</option><option value="jpg">JPG</option><option value="png">PNG (sem perda)</option><option value="gif">GIF</option><option value="ico">ICO (16 a 256 px)</option></select></label>
    <label id="lq">Qualidade <input type="range" id="q" min="0.5" max="1" step="0.01" value="0.85"><output id="oq">85%</output></label>
    <label>Reduzir <select id="red"><option value="nao">Não mudar o tamanho</option><option value="lado">Maior lado até…</option><option value="pct">Porcentagem do tamanho</option></select>
      <input type="number" id="val" min="16" max="8000" value="1600" hidden><span id="un"></span></label>
    <details><summary>Avançado: fundo e nome</summary>
      <label><input type="checkbox" id="transp" checked> Manter transparência (PNG, WebP, GIF, ICO)</label>
      <label>Cor do fundo <input type="color" id="cor" value="#ffffff"></label>
      <label>Acrescentar ao nome <input type="text" id="suf" value="-otimizado" maxlength="20"></label>
      <p class="aviso">JPG não tem transparência: usa a cor de fundo. PNG, GIF e ICO não usam qualidade. O ICO ignora a redução de tamanho. Imagens animadas: só o primeiro quadro (use a ferramenta GIF e animação para animações). Nunca amplia a imagem.</p></details>
    <div class="acoes"><button type="button" class="primario" id="go" disabled>Converter</button><button type="button" id="cancel" hidden>Cancelar</button>
      <button type="button" id="zipb" disabled>Baixar tudo (ZIP)</button><button type="button" id="limpar" disabled>Limpar lista</button></div>
    <progress id="barra" value="0" max="1" hidden></progress><p class="aviso" id="resumo"></p>
  </form>
  <div style="overflow-x:auto"><table class="tab" id="tab" hidden><thead><tr><th>Arquivo</th><th>Original</th><th>Novo</th><th>Variação</th><th>Situação</th><th></th></tr></thead><tbody id="corpo"></tbody></table></div>`;
  const $ = s => raiz.querySelector(s), arq = $('#arq');
  $('form').onsubmit = ev => ev.preventDefault(); $('#bArq').onclick = () => arq.click();

  const nomeFinal = it => { const base = it.file.name.replace(/\.[^.]*$/, '') || 'imagem'; return `${base}${e.suf}.${e.fmt}`; };
  function tabela() {
    $('#tab').hidden = !itens.length;
    $('#corpo').innerHTML = itens.map((it, i) => {
      const ok = it.estado === 'ok', v = ok ? (it.blob.size / it.file.size - 1) * 100 : 0;
      return `<tr><td>${esc(it.file.name)}</td><td>${kb(it.file.size)}</td><td>${ok ? kb(it.blob.size) : '—'}</td>
        <td class="${v > 0 ? 'mais' : 'menos'}">${ok ? (v > 0 ? '+' : '') + v.toFixed(0) + '%' : ''}</td>
        <td>${{ espera: 'Aguardando', fazendo: 'Convertendo…', ok: 'Pronto', erro: esc(it.msg || 'Erro') }[it.estado]}</td>
        <td>${ok ? `<button type="button" data-a="b" data-i="${i}">Baixar</button>` : ''}<button type="button" data-a="x" data-i="${i}" aria-label="Remover ${esc(it.file.name)}">✕</button></td></tr>`;
    }).join('');
    const ok = itens.filter(i => i.estado === 'ok'), o = ok.reduce((s, i) => s + i.file.size, 0), n = ok.reduce((s, i) => s + i.blob.size, 0);
    $('#resumo').textContent = ok.length ? `${ok.length} de ${itens.length} convertidas: ${kb(o)} → ${kb(n)} (${n <= o ? '-' : '+'}${Math.abs((n / o - 1) * 100).toFixed(0)}%).` : (itens.length ? `${itens.length} imagem(ns) na lista.` : '');
    $('#go').disabled = rodando || !itens.length; $('#zipb').disabled = rodando || !ok.length; $('#limpar').disabled = rodando || !itens.length;
  }
  const zerar = () => { itens.forEach(i => { i.estado = 'espera'; i.blob = null; }); tabela(); };

  async function converter(file) {
    const img = await abrirArquivo(file), alvo = e.red === 'lado' ? Math.min(1, e.val / Math.max(img.width, img.height)) : e.red === 'pct' ? Math.min(100, e.val) / 100 : 1;
    const W = Math.max(1, Math.round(img.width * alvo)), H = Math.max(1, Math.round(img.height * alvo));
    let f = img, s = alvo; while (s < 0.5) { f = metade(f); s *= 2; }
    const c = tela(W, H), x = c.getContext('2d');
    if (e.fmt === 'jpg' || !e.transp) { x.fillStyle = e.cor; x.fillRect(0, 0, W, H); }
    x.imageSmoothingQuality = 'high'; x.drawImage(f, 0, 0, W, H); img.close?.();
    if (e.fmt === 'ico') return gerarIco([16, 24, 32, 48, 64, 128, 256], t => { const q = tela(t, t), y = q.getContext('2d'); let g = c, k = Math.min(t / W, t / H); while (k < 0.5) { g = metade(g); k *= 2; } const w = W * Math.min(t / W, t / H), h = H * Math.min(t / W, t / H); y.imageSmoothingQuality = 'high'; y.drawImage(g, (t - w) / 2, (t - h) / 2, w, h); return q; });
    if (e.fmt === 'gif') {
      const b = await codificarGif([{ data: x.getImageData(0, 0, W, H).data, ms: 100 }], W, H, { transp: e.transp, loops: -1, matte: hex(e.cor) });
      if (await lerAssinatura(b) !== 'gif') throw new Error('GIF inválido'); return b;
    }
    return codificar(c, e.fmt, e.q);
  }
  async function rodar() {
    rodando = true; cancelar = false; $('#go').disabled = true; $('#cancel').hidden = false; $('#barra').hidden = false; let feitos = 0;
    for (const it of itens) {
      if (cancelar) break;
      it.estado = 'fazendo'; tabela();
      try { it.blob = await converter(it.file); it.estado = 'ok'; } catch (err) { it.estado = 'erro'; it.msg = /memory|size|alloc/i.test(err.message) ? 'Imagem grande demais para este navegador.' : err.message; }
      $('#barra').value = ++feitos / itens.length; await new Promise(r => setTimeout(r));
    }
    itens.forEach(i => { if (i.estado === 'fazendo') i.estado = 'espera'; });
    rodando = false; $('#cancel').hidden = true; $('#barra').hidden = true; tabela();
    if (cancelar) avisar('Conversão cancelada.', 'ok');
  }
  const adicionar = files => { for (const f of files) if (f.type.startsWith('image/')) itens.push({ file: f, estado: 'espera' }); tabela(); };
  arq.onchange = () => { adicionar([...arq.files]); arq.value = ''; };
  raiz.ondragover = ev => { ev.preventDefault(); $('#zona').classList.add('sobre'); }; raiz.ondragleave = () => $('#zona').classList.remove('sobre');
  raiz.ondrop = ev => { ev.preventDefault(); $('#zona').classList.remove('sobre'); adicionar([...ev.dataTransfer.files]); };
  document.onpaste = ev => adicionar([...(ev.clipboardData?.files || [])]);

  $('#corpo').onclick = ev => {
    const b = ev.target.closest('button'); if (!b || rodando) return; const i = +b.dataset.i;
    if (b.dataset.a === 'x') itens.splice(i, 1); else baixar(itens[i].blob, nomeFinal(itens[i]));
    tabela();
  };
  const ajustaTela = () => { $('#lq').hidden = !['jpg', 'webp'].includes(e.fmt); $('#val').hidden = e.red === 'nao'; $('#un').textContent = e.red === 'lado' ? ' px' : e.red === 'pct' ? ' %' : ''; $('#val').max = e.red === 'pct' ? 100 : 8000; if (e.red === 'pct' && e.val > 100) { e.val = 100; $('#val').value = 100; } };
  $('#fmt').onchange = ev => { e.fmt = ev.target.value; ajustaTela(); zerar(); };
  $('#q').oninput = ev => { e.q = +ev.target.value; $('#oq').textContent = Math.round(e.q * 100) + '%'; zerar(); };
  $('#red').onchange = ev => { e.red = ev.target.value; ajustaTela(); zerar(); };
  $('#val').oninput = ev => { e.val = Math.max(1, +ev.target.value || 1); zerar(); };
  $('#transp').onchange = ev => { e.transp = ev.target.checked; zerar(); };
  $('#cor').oninput = ev => { e.cor = ev.target.value; zerar(); };
  $('#suf').oninput = ev => { e.suf = ev.target.value; };
  $('#go').onclick = rodar; $('#cancel').onclick = () => { cancelar = true; };
  $('#limpar').onclick = () => { itens = []; tabela(); };
  $('#zipb').onclick = async () => {
    try {
      const usados = new Set(), arqs = itens.filter(i => i.estado === 'ok').map(i => { let n = nomeFinal(i), k = 1; while (usados.has(n)) n = nomeFinal(i).replace(/(\.[^.]+)$/, `-${++k}$1`); usados.add(n); return { nome: n, blob: i.blob }; });
      baixar(await zip(arqs), 'imagens-convertidas.zip'); avisar('ZIP baixado.', 'ok');
    } catch (err) { avisar(err.message, 'erro'); }
  };
  ajustaTela(); tabela();
}

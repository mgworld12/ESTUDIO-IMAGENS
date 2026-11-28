import { abrirVideo, planejar, validar, extrairQuadros, LIMITE_S } from '../services/video.js';
import { avisar } from '../utils/avisar.js';

// Painel "Vídeo" da ferramenta GIF e animação: abre um vídeo curto, escolhe o trecho e transforma em quadros.
export function montarVideo(c) {
  const entrada = Object.assign(document.createElement('input'), { type: 'file', accept: 'video/*', hidden: true }), wrap = document.createElement('div');
  wrap.hidden = true;
  wrap.innerHTML = `<fieldset><legend>Vídeo</legend>
    <video id="vid" controls muted playsinline></video>
    <div class="ctrl">
      <label>Início <input type="number" id="vi" min="0" step="0.1" value="0"> s <button type="button" id="vi2">Usar a posição atual</button></label>
      <label>Fim <input type="number" id="vf" min="0.1" step="0.1" value="5"> s <button type="button" id="vf2">Usar a posição atual</button></label>
      <label>Quadros por segundo <select id="vfps"><option>5</option><option>8</option><option selected>10</option><option>12</option><option>15</option><option>20</option></select></label>
      <label>Largura <select id="vlar"><option>160</option><option>240</option><option selected>320</option><option>480</option><option>640</option></select> px</label>
      <p class="aviso" id="vinfo"></p>
      <div class="acoes"><button type="button" class="primario" id="vext">Extrair quadros</button><button type="button" id="vfechar">Fechar vídeo</button></div>
    </div></fieldset>`;
  c.raiz.querySelector('#zona').after(wrap, entrada);
  const abrir = () => entrada.click();
  for (const ref of ['#bArq', '#mais']) c.raiz.querySelector(ref).after(Object.assign(document.createElement('button'), { type: 'button', textContent: 'Abrir vídeo', onclick: abrir }));
  const $ = s => wrap.querySelector(s), vid = $('#vid'); let V = null;

  const plano = () => planejar({ ini: Math.max(0, +$('#vi').value || 0), fim: +$('#vf').value || 0, fps: +$('#vfps').value, largura: +$('#vlar').value, w: V.w, h: V.h, duracao: V.duracao });
  function info() {
    if (!V) return; const p = plano(), erro = validar(p);
    $('#vinfo').textContent = erro || `${p.quadros} quadros de ${p.lw} × ${p.lh} px (cerca de ${Math.round(p.mb)} MB na memória). Vídeo original: ${V.w} × ${V.h}, ${V.duracao.toFixed(1)} s. Sem áudio: GIF e WebP não têm som.`;
    $('#vinfo').classList.toggle('alerta', !!erro);
  }
  entrada.onchange = async () => {
    const f = entrada.files[0]; entrada.value = ''; if (!f) return;
    try {
      V = await abrirVideo(f, vid);
      $('#vi').value = 0; $('#vf').value = Math.min(V.duracao, 5).toFixed(1); $('#vf').max = $('#vi').max = V.duracao.toFixed(1);
      wrap.hidden = false; info();
      if (V.duracao > LIMITE_S) avisar(`O vídeo tem ${V.duracao.toFixed(0)} s: escolha um trecho de até ${LIMITE_S} s.`, 'ok');
    } catch (err) { avisar(err.message, 'erro'); }
  };
  ['#vi', '#vf', '#vfps', '#vlar'].forEach(s => { $(s).oninput = info; });
  $('#vi2').onclick = () => { $('#vi').value = vid.currentTime.toFixed(1); info(); };
  $('#vf2').onclick = () => { $('#vf').value = vid.currentTime.toFixed(1); info(); };
  $('#vfechar').onclick = () => { vid.pause(); vid.removeAttribute('src'); vid.load(); wrap.hidden = true; V = null; };
  $('#vext').onclick = async () => {
    if (!V) return; const p = plano(), erro = validar(p); if (erro) return avisar(erro, 'erro');
    $('#vext').disabled = true; c.ocupar(true);
    try {
      const q = await extrairQuadros(vid, p, { aoProgresso: (i, n) => c.progresso(`Extraindo o quadro ${i} de ${n}…`), cancelado: c.cancelado });
      c.anexar(q);
      c.progresso(`${q.length} quadros extraídos.${q.length > 100 ? ' Dica: com tantos quadros, o WebP animado costuma ficar bem menor que o GIF.' : ''}`);
    } catch (err) { c.progresso(''); avisar(err.message, err.message === 'Cancelado.' ? 'ok' : 'erro'); }
    finally { $('#vext').disabled = false; c.ocupar(false); }
  };
}

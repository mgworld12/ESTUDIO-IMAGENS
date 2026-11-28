import * as Q from '../services/quadros.js';
import * as O from '../services/imagem-ops.js';
import { avisar } from '../utils/avisar.js';

// Painel "Editar quadros" da ferramenta GIF e animação. c = contexto entregue pela animacao.js.
export function montarEdicao(c) {
  const det = document.createElement('details');
  det.innerHTML = `<summary>Editar quadros: selecionar, inverter, girar, ajustes e texto</summary>
    <p class="aviso">Clique nas miniaturas para selecionar (Shift seleciona um trecho). As ações valem para os quadros selecionados ou, se não houver seleção, para todos.</p>
    <div class="acoes"><button type="button" data-a="todos">Selecionar todos</button><button type="button" data-a="nenhum">Limpar seleção</button><span class="dica" id="ed-n"></span></div>
    <div class="acoes"><button type="button" data-a="inv">Inverter ordem</button><button type="button" data-a="ida">Ida e volta</button><button type="button" data-a="rep">Remover repetidos</button><button type="button" data-a="manter">Manter só os selecionados</button><button type="button" data-a="rem">Remover selecionados</button></div>
    <label>Velocidade <input type="number" id="ed-vel" min="10" max="1000" step="10" value="100"> % <button type="button" data-a="vel">Aplicar</button></label>
    <div class="acoes"><button type="button" data-a="esq">↺ 90°</button><button type="button" data-a="dir">↻ 90°</button><button type="button" data-a="eh">Espelhar ↔</button><button type="button" data-a="ev">Espelhar ↕</button></div>
    <label>Recortar bordas (%) esq. <input type="number" id="ed-ce" min="0" max="90" value="0"> dir. <input type="number" id="ed-cd" min="0" max="90" value="0"> topo <input type="number" id="ed-ct" min="0" max="90" value="0"> base <input type="number" id="ed-cb" min="0" max="90" value="0"> <button type="button" data-a="rec">Recortar</button></label>
    <label>Brilho <input type="range" id="ed-br" min="50" max="150" value="100"> Contraste <input type="range" id="ed-co" min="50" max="150" value="100"> Saturação <input type="range" id="ed-sa" min="0" max="200" value="100"> <button type="button" data-a="aj">Aplicar ajustes</button></label>
    <label>Texto <input type="text" id="ed-tx" maxlength="40" placeholder="Escreva aqui"> <input type="color" id="ed-tc" value="#ffffff" aria-label="Cor do texto"> tamanho <input type="number" id="ed-tt" min="3" max="40" value="12"> % <select id="ed-tp"><option value="0">Em cima</option><option value="1">No meio</option><option value="2" selected>Embaixo</option></select> <button type="button" data-a="txt">Aplicar texto</button></label>
    <div class="acoes"><button type="button" data-a="desf">Desfazer</button><button type="button" data-a="refaz">Refazer</button></div>`;
  c.raiz.querySelector('#quadros').closest('fieldset').after(det);
  const $ = s => det.querySelector(s), num = id => +$('#' + id).value, alvo = () => c.sel.size ? [...c.sel].sort((a, b) => a - b) : c.frames().map((_, i) => i);
  c.aoSelecionar = () => { $('#ed-n').textContent = c.sel.size ? `${c.sel.size} selecionado(s)` : ''; };

  const lista = fn => { const fr = c.frames(); if (!fr.length) return; c.salvarHist(); c.definir(fn(fr, alvo()), true); };
  async function imagens(fn) {   // aplica uma operação de imagem em cada quadro do alvo, sem travar a tela
    const fr = c.frames(); if (!fr.length) return; const idx = alvo(), novo = fr.map(f => ({ ...f }));
    try {
      for (let k = 0; k < idx.length; k++) { novo[idx[k]].img = fn(novo[idx[k]].img); c.progresso(`Aplicando… ${k + 1} de ${idx.length}`); if (k % 4 === 3) await new Promise(r => setTimeout(r)); }
      c.salvarHist(); c.definir(novo, true); c.progresso(`Pronto: ${idx.length} quadro(s) alterado(s).`);
    } catch (e) { c.progresso(''); avisar(e.message, 'erro'); }
  }
  const exigeSel = () => { if (!c.sel.size) { avisar('Selecione pelo menos um quadro.', 'erro'); return false; } return true; };
  const acoes = {
    todos: () => { c.frames().forEach((_, i) => c.sel.add(i)); c.listar(); }, nenhum: () => { c.sel.clear(); c.listar(); },
    inv: () => lista((fr, idx) => Q.inverter(fr, idx)), ida: () => { const fr = c.frames(); c.salvarHist(); c.definir(Q.idaEVolta(fr)); },
    rep: () => { const fr = c.frames(); c.salvarHist(); const nf = Q.removerRepetidos(fr, fr.map(f => O.assinatura(f.img))); c.definir(nf); avisar(`${fr.length - nf.length} quadro(s) repetido(s) removido(s).`, 'ok'); },
    manter: () => { if (exigeSel()) { const fr = c.frames(); c.salvarHist(); c.definir(Q.manter(fr, alvo())); } },
    rem: () => { if (exigeSel()) { const fr = c.frames(); if (c.sel.size >= fr.length) return avisar('Deixe pelo menos um quadro.', 'erro'); c.salvarHist(); c.definir(Q.remover(fr, alvo())); } },
    vel: () => lista((fr, idx) => Q.velocidade(fr, idx, Math.max(10, num('ed-vel') || 100))),
    esq: () => imagens(i => O.girar(i, -90)), dir: () => imagens(i => O.girar(i, 90)), eh: () => imagens(i => O.espelhar(i, 'h')), ev: () => imagens(i => O.espelhar(i, 'v')),
    rec: () => { const m = { e: num('ed-ce'), d: num('ed-cd'), t: num('ed-ct'), b: num('ed-cb') }; if (m.e + m.d >= 95 || m.t + m.b >= 95) return avisar('Recorte demais: sobra quase nada da imagem.', 'erro'); imagens(i => O.recortar(i, m)); },
    aj: () => imagens(i => O.ajustar(i, { brilho: num('ed-br'), contraste: num('ed-co'), saturacao: num('ed-sa') })),
    txt: () => { const t = $('#ed-tx').value.trim(); if (!t) return avisar('Escreva o texto primeiro.', 'erro'); imagens(i => O.texto(i, { t, cor: $('#ed-tc').value, tam: num('ed-tt') || 12, pos: num('ed-tp') })); },
    desf: () => c.desfazer(), refaz: () => c.refazer(),
  };
  det.onclick = ev => { const b = ev.target.closest('button[data-a]'); if (b) acoes[b.dataset.a](); };
}

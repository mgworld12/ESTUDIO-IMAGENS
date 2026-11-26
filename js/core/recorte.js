import { montarFundo } from '../tools/fundo.js';

// Abre o editor "Remover fundo" numa janela por cima da ferramenta atual. Devolve um canvas com transparência (ou null se cancelar).
export function recortarFundo(imagem, deps = {}) {
  return new Promise(resolve => {
    const d = document.createElement('dialog'); d.className = 'modal-recorte';
    d.innerHTML = '<h2>Remover fundo</h2><div></div>'; document.body.append(d);
    const fim = r => { d.close(); d.remove(); resolve(r); };
    montarFundo(d.querySelector('div'), { ...deps, inicial: imagem, aoUsar: fim, aoCancelar: () => fim(null) });
    d.addEventListener('cancel', ev => { ev.preventDefault(); fim(null); });
    d.showModal();
  });
}

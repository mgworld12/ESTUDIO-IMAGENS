import { montarWebpAnimado } from './webp-anim.js';

// Limites do WhatsApp (repositório oficial WhatsApp/stickers): 512 x 512, WebP animado até 500 KB, até 10 s, quadros de no mínimo 8 ms.
export const LIM_BYTES = 500 * 1024, MAX_MS = 10000, LADO = 512;

// quadros: [{ c: canvas 512x512, ms }]. codificar(canvas, qualidade) devolve um Blob WebP.
// Tenta qualidade alta; se passar de 500 KB procura a maior qualidade que cabe; se não couber, tira um quadro sim, um não.
export async function gerarStickerAnimado(quadros, { codificar, aoProgresso, cancelado }) {
  const total = quadros.reduce((s, f) => s + f.ms, 0);
  if (total > MAX_MS) throw new Error(`A animação dura ${(total / 1000).toFixed(1)} s e o WhatsApp aceita até 10 s. Diminua o tempo dos quadros ou remova quadros.`);
  let lista = quadros;
  for (let rodada = 0; rodada < 4; rodada++) {
    const tentar = async q => {
      const partes = [];
      for (let i = 0; i < lista.length; i++) {
        if (cancelado?.()) throw new Error('Cancelado.');
        partes.push({ blob: await codificar(lista[i].c, q), ms: lista[i].ms });
        await new Promise(r => setTimeout(r));
      }
      return montarWebpAnimado(partes, LADO, LADO, 0);
    };
    aoProgresso?.(`Ajustando ao limite de 500 KB com ${lista.length} quadros…`);
    const b = await tentar(0.9);
    if (b.size <= LIM_BYTES) return { blob: b, qualidade: 0.9, quadros: lista.length };
    let lo = 0.3, hi = 0.9, ok = null;
    for (let i = 0; i < 5; i++) { const q = (lo + hi) / 2, t = await tentar(q); if (t.size <= LIM_BYTES) { ok = { blob: t, qualidade: q, quadros: lista.length }; lo = q; } else hi = q; }
    if (ok) return ok;
    if (lista.length < 4) break;
    lista = lista.reduce((r, f, i) => { if (i % 2) r[r.length - 1].ms += f.ms; else r.push({ ...f }); return r; }, []);  // o primeiro quadro sempre fica
  }
  throw new Error('Não coube em 500 KB. Simplifique a animação (menos quadros, menos detalhes e degradês) e tente de novo.');
}

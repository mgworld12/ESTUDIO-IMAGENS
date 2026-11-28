// Operações sobre a lista de quadros [{ img, ms }]. Funções puras: devolvem uma lista nova, sem alterar a original.
// idx = posições (em ordem) dos quadros afetados.
export const inverter = (fr, idx) => { const o = fr.slice(), v = idx.map(i => fr[i]).reverse(); idx.forEach((i, k) => { o[i] = v[k]; }); return o; };
export const idaEVolta = fr => fr.length < 3 ? fr.slice() : [...fr, ...fr.slice(1, -1).reverse().map(f => ({ ...f }))];   // 1 2 3 4 -> 1 2 3 4 3 2
export const velocidade = (fr, idx, pct) => fr.map((f, i) => idx.includes(i) ? { ...f, ms: Math.max(20, Math.round(f.ms * 100 / pct)) } : f);   // 200% = duas vezes mais rápido
export const manter = (fr, idx) => idx.map(i => ({ ...fr[i] }));
export const remover = (fr, idx) => fr.filter((_, i) => !idx.includes(i));

const dif = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length; };
// ass[i] = assinatura (miniatura em tons de cinza) do quadro i. Quadros iguais ao último mantido saem; o tempo deles soma ao quadro que fica.
export function removerRepetidos(fr, ass, limiar = 2) {
  const o = []; let ult = -1;
  fr.forEach((f, i) => {
    if (ult >= 0 && dif(ass[i], ass[ult]) < limiar) o[o.length - 1] = { ...o[o.length - 1], ms: o[o.length - 1].ms + f.ms };
    else { o.push({ ...f }); ult = i; }
  });
  return o;
}

// WebP animado sem biblioteca: junta quadros WebP (gerados pelo navegador) no contêiner de animação (RIFF > VP8X + ANIM + ANMF).
const t4 = (u, i) => String.fromCharCode(u[i], u[i + 1], u[i + 2], u[i + 3]);
const p24 = (a, d, n) => { a[d] = n & 255; a[d + 1] = (n >> 8) & 255; a[d + 2] = (n >> 16) & 255; };
const ler24 = (u, d) => u[d] | (u[d + 1] << 8) | (u[d + 2] << 16);

function blocos(u) { // lista os blocos de um arquivo WebP: { id, ini, dados, fim }
  const v = new DataView(u.buffer, u.byteOffset, u.byteLength), r = []; let p = 12;
  while (p + 8 <= u.length) { const n = v.getUint32(p + 4, true), fim = Math.min(p + 8 + n + (n & 1), u.length); r.push({ id: t4(u, p), ini: p, dados: p + 8, fim }); p = fim; }
  return r;
}
function bloco(id, dados) {
  const n = dados.length, o = new Uint8Array(8 + n + (n & 1));
  for (let i = 0; i < 4; i++) o[i] = id.charCodeAt(i);
  new DataView(o.buffer).setUint32(4, n, true); o.set(dados, 8); return o;
}

// quadros: [{ blob (WebP de um quadro, w x h), ms }]. loops: 0 = sempre, n = n vezes.
export async function montarWebpAnimado(quadros, w, h, loops = 0) {
  const partes = [], vp8x = new Uint8Array(10), anim = new Uint8Array(6);
  vp8x[0] = 0x12; p24(vp8x, 4, w - 1); p24(vp8x, 7, h - 1);          // 0x12 = animação + transparência
  anim[4] = loops & 255; anim[5] = (loops >> 8) & 255;                 // cor de fundo 0 e número de repetições
  partes.push(bloco('VP8X', vp8x), bloco('ANIM', anim));
  for (const { blob, ms } of quadros) {
    const u = new Uint8Array(await blob.arrayBuffer());
    if (t4(u, 0) !== 'RIFF' || t4(u, 8) !== 'WEBP') throw new Error('Um dos quadros não é um WebP válido.');
    const img = blocos(u).filter(c => ['ALPH', 'VP8 ', 'VP8L'].includes(c.id));
    if (!img.length) throw new Error('Um dos quadros veio sem imagem.');
    const d = new Uint8Array(16 + img.reduce((s, c) => s + c.fim - c.ini, 0));
    p24(d, 6, w - 1); p24(d, 9, h - 1); p24(d, 12, Math.max(1, Math.round(ms))); d[15] = 0x02;   // sem mistura: cada quadro substitui o anterior
    let o = 16; for (const c of img) { d.set(u.subarray(c.ini, c.fim), o); o += c.fim - c.ini; }
    partes.push(bloco('ANMF', d));
  }
  const total = 4 + partes.reduce((s, p) => s + p.length, 0), cab = new Uint8Array(12), v = new DataView(cab.buffer);
  cab.set([0x52, 0x49, 0x46, 0x46], 0); v.setUint32(4, total, true); cab.set([0x57, 0x45, 0x42, 0x50], 8);
  return new Blob([cab, ...partes], { type: 'image/webp' });
}

// Confere a estrutura do arquivo gerado: animação marcada, tamanho do RIFF, número de quadros e tempos.
export async function validarWebpAnimado(blob) {
  const u = new Uint8Array(await blob.arrayBuffer());
  if (t4(u, 0) !== 'RIFF' || t4(u, 8) !== 'WEBP') throw new Error('O arquivo gerado não é um WebP.');
  if (new DataView(u.buffer).getUint32(4, true) !== u.length - 8) throw new Error('O arquivo WebP gerado está com o tamanho inconsistente.');
  const cs = blocos(u), x = cs.find(c => c.id === 'VP8X'), a = cs.find(c => c.id === 'ANIM'), an = cs.filter(c => c.id === 'ANMF');
  if (!x || !(u[x.dados] & 2)) throw new Error('O arquivo gerado não está marcado como animado.');
  return { quadros: an.length, ms: an.map(c => ler24(u, c.dados + 12)), loops: a ? u[a.dados + 4] | (u[a.dados + 5] << 8) : null };
}

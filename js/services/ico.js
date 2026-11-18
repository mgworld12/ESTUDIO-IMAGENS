import { codificar } from './exportar.js';

// ICO de verdade: cabeçalho + diretório + uma imagem PNG por tamanho (formato aceito pelo Windows Vista em diante).
export async function gerarIco(tamanhos, desenhar) {
  const imgs = [];
  for (const t of tamanhos) imgs.push({ t, d: new Uint8Array(await (await codificar(desenhar(t), 'png')).arrayBuffer()) });
  const n = imgs.length, h = new DataView(new ArrayBuffer(6 + 16 * n));
  h.setUint16(2, 1, true); h.setUint16(4, n, true);
  let off = 6 + 16 * n;
  imgs.forEach((p, i) => {
    const o = 6 + 16 * i, lado = p.t >= 256 ? 0 : p.t; // 0 significa 256
    h.setUint8(o, lado); h.setUint8(o + 1, lado); h.setUint16(o + 4, 1, true); h.setUint16(o + 6, 32, true);
    h.setUint32(o + 8, p.d.length, true); h.setUint32(o + 12, off, true); off += p.d.length;
  });
  return new Blob([h.buffer, ...imgs.map(p => p.d)], { type: 'image/x-icon' });
}

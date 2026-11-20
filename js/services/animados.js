// Extrai os quadros de um GIF ou WebP animado com o ImageDecoder do navegador. Devolve null se não for animado ou não houver suporte.
const MAX = 150;
export async function lerQuadros(arquivo) {
  if (typeof ImageDecoder === 'undefined' || !/^image\/(gif|webp)$/.test(arquivo.type)) return null;
  let dec;
  try { dec = new ImageDecoder({ data: await arquivo.arrayBuffer(), type: arquivo.type }); await dec.tracks.ready; await dec.completed; } catch { dec?.close(); return null; }
  try {
    const n = dec.tracks.selectedTrack.frameCount;
    if (n < 2) return null;
    if (n > MAX) throw new Error(`A animação tem ${n} quadros; o limite é ${MAX}. Reduza o arquivo e tente de novo.`);
    const q = [];
    for (let i = 0; i < n; i++) {
      const { image } = await dec.decode({ frameIndex: i });
      q.push({ img: await createImageBitmap(image), ms: Math.max(20, Math.round((image.duration || 100000) / 1000)) });
      image.close();
    }
    return q;
  } finally { dec.close(); }
}

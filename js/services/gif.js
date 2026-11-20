import { GIFEncoder, quantize, applyPalette } from '../../vendor/gifenc.esm.js';

// GIF só tem transparência total ou nenhuma. Pixels semitransparentes (bordas suaves) são misturados com uma
// cor de apoio, para não aparecer halo claro ou escuro em volta do desenho.
export function prepararAlfa(d, matte) {
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3];
    if (a < 128) d[i + 3] = 0;
    else if (a < 255) { const k = a / 255; for (let c = 0; c < 3; c++) d[i + c] = Math.round(d[i + c] * k + matte[c] * (1 - k)); d[i + 3] = 255; }
  }
}

// frames: [{ data: RGBA, ms }]. loops: -1 = uma vez, 0 = sempre, n = n repetições extras.
export async function codificarGif(frames, w, h, { cores = 256, loops = 0, transp = false, matte = [255, 255, 255], aoProgresso, cancelado } = {}) {
  const gif = GIFEncoder();
  for (let i = 0; i < frames.length; i++) {
    if (cancelado?.()) throw new Error('Cancelado.');
    const d = new Uint8ClampedArray(frames[i].data);
    if (transp) prepararAlfa(d, matte);
    const paleta = transp ? quantize(d, cores, { format: 'rgba4444', oneBitAlpha: true }) : quantize(d, cores);
    const indice = applyPalette(d, paleta, transp ? 'rgba4444' : 'rgb565');
    const t = transp ? paleta.findIndex(p => p[3] === 0) : -1;
    gif.writeFrame(indice, w, h, { palette: paleta, delay: frames[i].ms, transparent: t >= 0, transparentIndex: Math.max(t, 0), ...(i === 0 ? { repeat: loops } : {}) });
    aoProgresso?.(i + 1, frames.length);
    await new Promise(r => setTimeout(r));   // deixa a tela respirar entre os quadros
  }
  gif.finish();
  return new Blob([gif.bytes()], { type: 'image/gif' });
}

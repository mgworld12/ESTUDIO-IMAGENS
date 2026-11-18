const MIME = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' };

// Descobre o formato REAL pelos primeiros bytes (nunca pela extensão).
export async function lerAssinatura(blob) {
  const b = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  const t = (i, j) => String.fromCharCode(...b.slice(i, j));
  if (b[0] === 0x89 && t(1, 4) === 'PNG') return 'png';
  if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return 'jpg';
  if (t(0, 4) === 'RIFF' && t(8, 12) === 'WEBP') return 'webp';
  if (t(0, 3) === 'GIF') return 'gif';
  if (b[0] === 0 && b[1] === 0 && b[2] === 1 && b[3] === 0) return 'ico';
  return null;
}

export async function codificar(canvas, formato, qualidade = 0.92) {
  const blob = await new Promise(r => canvas.toBlob(r, MIME[formato], formato === 'png' ? undefined : qualidade));
  const real = blob && await lerAssinatura(blob);
  if (real !== formato) throw new Error(`Este navegador não gerou ${formato.toUpperCase()} de verdade (gerou ${real ? real.toUpperCase() : 'outro formato'}). Escolha outro formato.`);
  return blob;
}

const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = u => { let c = 0xFFFFFFFF; for (let i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };

// ZIP sem compressão (PNG/WebP/JPG já são comprimidos). Entrada: [{nome, blob}]
export async function zip(arquivos) {
  const enc = new TextEncoder(), partes = [], central = []; let pos = 0;
  for (const { nome, blob } of arquivos) {
    const d = new Uint8Array(await blob.arrayBuffer()), n = enc.encode(nome), crc = crc32(d);
    const l = new DataView(new ArrayBuffer(30));
    l.setUint32(0, 0x04034b50, true); l.setUint16(4, 20, true); l.setUint16(6, 0x0800, true); l.setUint16(12, 0x21, true);
    l.setUint32(14, crc, true); l.setUint32(18, d.length, true); l.setUint32(22, d.length, true); l.setUint16(26, n.length, true);
    partes.push(l.buffer, n, d);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(14, 0x21, true);
    c.setUint32(16, crc, true); c.setUint32(20, d.length, true); c.setUint32(24, d.length, true); c.setUint16(28, n.length, true); c.setUint32(42, pos, true);
    central.push(c.buffer, n); pos += 30 + n.length + d.length;
  }
  const tam = central.reduce((s, p) => s + p.byteLength, 0), f = new DataView(new ArrayBuffer(22));
  f.setUint32(0, 0x06054b50, true); f.setUint16(8, arquivos.length, true); f.setUint16(10, arquivos.length, true); f.setUint32(12, tam, true); f.setUint32(16, pos, true);
  return new Blob([...partes, ...central, f.buffer], { type: 'application/zip' });
}

export function baixar(blob, nome) {
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: nome });
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

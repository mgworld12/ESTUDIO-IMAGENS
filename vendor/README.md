# Bibliotecas de terceiros

| Biblioteca | Versão | Licença | Uso | Origem |
|---|---|---|---|---|
| gifenc (`gifenc.esm.js`) | 1.0.3 | MIT (veja `gifenc-LICENSE.md`) | Codificar GIF animado (paleta e transparência) | https://www.npmjs.com/package/gifenc |

Copiada sem alterações. Sem CDN: o site não depende de servidores de terceiros.

## Remoção de fundo (IA local)
| Item | Versão | Licença | Uso |
|---|---|---|---|
| onnxruntime-web (`vendor/ort/`: `ort.wasm.min.mjs`, `ort-wasm-simd-threaded.mjs`, `ort-wasm-simd-threaded.wasm`) | 1.31.1 | MIT | Executa o modelo no navegador (WebAssembly) |
| U²-Net pequeno, `u2netp.onnx` (`vendor/modelos/`, 4,6 MB) | — | Apache-2.0 (`LICENSE-U2NET.txt`, do repositório xuebinqin/U-2-Net) | Separa objeto e fundo. Arquivo ONNX publicado pelo projeto rembg (danielgatis/rembg, versão v0.0.0) |

O primeiro uso baixa cerca de 19 MB (motor + modelo); depois ficam guardados no navegador. Nenhuma imagem sai do dispositivo.

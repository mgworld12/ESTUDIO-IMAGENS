import { criarQuadro } from '../core/quadro.js';
import { zip, baixar } from '../services/exportar.js';
import { gerarIco } from '../services/ico.js';
import { avisar } from '../utils/avisar.js';

const TAMANHOS = [16, 24, 32, 48, 64, 128, 256];
const limpar = n => n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'icone-pasta';

// Script só com caracteres ASCII e quebras de linha do Windows (CRLF).
export const textoBat = ico => [
  '@echo off', 'setlocal', 'title Aplicar icone na pasta',
  `set "ICONE=${ico}"`, 'echo.',
  'echo Arraste a PASTA para esta janela (ou digite o caminho) e tecle Enter:',
  'set /p "PASTA="', 'set "PASTA=%PASTA:"=%"',
  String.raw`if not exist "%PASTA%\" (echo Pasta nao encontrada. & pause & exit /b 1)`,
  'if not exist "%~dp0%ICONE%" (echo Arquivo %ICONE% nao encontrado ao lado deste script. & pause & exit /b 1)',
  String.raw`copy /y "%~dp0%ICONE%" "%PASTA%\%ICONE%" >nul`,
  String.raw`if exist "%PASTA%\desktop.ini" attrib -s -h "%PASTA%\desktop.ini"`,
  String.raw`> "%PASTA%\desktop.ini" (`, 'echo [.ShellClassInfo]', 'echo IconResource=%ICONE%,0', ')',
  String.raw`attrib +h +s "%PASTA%\desktop.ini"`, String.raw`attrib +h "%PASTA%\%ICONE%"`, 'attrib +s "%PASTA%"',
  'ie4uinit.exe -show 2>nul', 'echo.',
  'echo Pronto. Se o icone nao mudar, reinicie o Explorer ou saia e entre no Windows.', 'pause'].join('\r\n') + '\r\n';

const leiame = ico => `ÍCONE DE PASTA DO WINDOWS (gerado no IMAGE STUDIO)

Arquivos deste pacote
- ${ico}: o ícone, com os tamanhos 16, 24, 32, 48, 64, 128 e 256 px.
- aplicar-icone.bat: script que aplica o ícone em uma pasta.

MÉTODO 1 - Automático (script)
1. Extraia o ZIP em uma pasta (não rode de dentro do ZIP).
2. Dê dois cliques em aplicar-icone.bat. Se o Windows avisar sobre arquivo desconhecido, clique em "Mais informações" e "Executar assim mesmo". O script é texto simples: você pode abri-lo no Bloco de Notas antes.
3. Arraste a pasta desejada para a janela preta e tecle Enter.

MÉTODO 2 - Manual (sem script)
1. Clique com o botão direito na pasta > Propriedades > aba Personalizar > Alterar Ícone.
2. Clique em Procurar, escolha ${ico} e confirme com OK.

Importante
- Não apague nem mova o arquivo .ico depois de aplicar: o script o copia para dentro da pasta (oculto), mas no método manual o Windows usa o arquivo do local escolhido.
- Se o ícone não mudar, reinicie o Explorer (Gerenciador de Tarefas > Windows Explorer > Reiniciar) ou saia e entre no Windows.
`;
export { leiame };

export function montarPasta(raiz) {
  const q = criarQuadro(raiz);
  q.extra.innerHTML = `
    <fieldset><legend>Prévia nos tamanhos do Windows</legend><div class="mini" id="mini"></div></fieldset>
    <label>Nome do ícone <input type="text" id="nome" value="minha-pasta" maxlength="40"></label>
    <p class="aviso">O pacote traz o ícone (.ico), um script para aplicá-lo e instruções para o método manual. Use letras sem acento no nome.</p>
    <div class="acoes"><button type="button" class="primario" id="baixar">Baixar pacote (ZIP)</button><button type="button" id="trocar">Trocar imagem</button></div>`;
  const $ = s => raiz.querySelector(s);
  q.mini($('#mini'), [16, 32, 48, 128]);
  $('#trocar').onclick = q.trocar;
  $('#baixar').onclick = async () => {
    try {
      const nome = limpar($('#nome').value), ico = nome + '.ico';
      baixar(await zip([
        { nome: ico, blob: await gerarIco(TAMANHOS, t => q.desenhar(t)) },
        { nome: 'aplicar-icone.bat', blob: new Blob([textoBat(ico)], { type: 'text/plain' }) },
        { nome: 'LEIA-ME.txt', blob: new Blob([leiame(ico)], { type: 'text/plain' }) }]), nome + '-icone-pasta.zip');
      avisar('Pacote baixado. Abra o LEIA-ME.txt para ver como aplicar.', 'ok');
    } catch (err) { avisar(err.message, 'erro'); }
  };
}

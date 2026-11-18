export function avisar(msg, tipo = 'ok') {
  let el = document.getElementById('aviso-global');
  if (!el) { el = document.createElement('div'); el.id = 'aviso-global'; el.setAttribute('role', 'status'); document.body.append(el); }
  el.textContent = msg; el.className = 'toast ' + tipo + ' visivel';
  clearTimeout(avisar.t); avisar.t = setTimeout(() => el.classList.remove('visivel'), 4500);
}

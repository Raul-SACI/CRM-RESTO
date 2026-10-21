// Helpers para generar el PDF de la Gift Card (membrete CLUB CRAFT).
// Usa el motor de impresión del navegador ("Guardar como PDF"), sin librerías.

export interface GiftCardPdfData {
  code: string;
  value: number;
  expires_at: string;
  recipient_name?: string | null;
  sender_name?: string | null;
  message?: string | null;
}

const esc = (s: string) =>
  String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function giftCardPdfHtml(card: GiftCardPdfData, qrSvg: string): string {
  const venc = card.expires_at ? new Date(card.expires_at).toLocaleDateString('es-AR') : '';
  const value = '$' + (Number(card.value) || 0).toLocaleString('es-AR');
  const para = card.recipient_name ? `<p class="line"><b>Para:</b> ${esc(card.recipient_name)}</p>` : '';
  const dede = card.sender_name ? `<p class="line"><b>De:</b> ${esc(card.sender_name)}</p>` : '';
  const msg = card.message ? `<p class="msg">“${esc(card.message)}”</p>` : '';
  const paraDe = (para || dede || msg)
    ? `<div class="dedic">${para}${dede}${msg}</div>`
    : '';

  return (
    `<!doctype html><html lang="es"><head><meta charset="utf-8">` +
    `<title>GiftCard-CLUB-CRAFT-${esc(card.code)}</title>` +
    `<style>
      * { box-sizing: border-box; }
      body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 0; padding: 28px; display: flex; justify-content: center; }
      .card { width: 540px; border-radius: 26px; overflow: hidden; border: 2px solid #e2e8f0; box-shadow: 0 10px 30px rgba(15,23,42,.08); }
      .top { background: #D90015; color: #fff; padding: 26px 30px 22px; }
      .brand { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }
      .brand .w { opacity: .85; }
      .kind { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 4px; margin-top: 4px; opacity: .9; }
      .body { padding: 26px 30px 28px; text-align: center; }
      .valueLbl { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #94a3b8; }
      .value { font-size: 52px; font-weight: 800; color: #0f172a; line-height: 1; margin: 4px 0 2px; }
      .valueSub { font-size: 12px; color: #64748b; margin-bottom: 18px; }
      .codeBox { display: flex; align-items: center; justify-content: center; gap: 20px; background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 16px; padding: 18px; margin: 8px 0 16px; }
      .codeWrap { text-align: left; }
      .codeLbl { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #94a3b8; }
      .code { font-size: 32px; font-weight: 800; letter-spacing: 2px; color: #D90015; font-family: 'Courier New', monospace; }
      .qr { width: 96px; height: 96px; }
      .qr svg { width: 96px; height: 96px; }
      .dedic { background: #fff7f7; border: 1px solid #fde0e2; border-radius: 14px; padding: 12px 16px; margin: 6px 0 16px; text-align: left; }
      .line { font-size: 13px; margin: 2px 0; color: #334155; }
      .msg { font-size: 13px; font-style: italic; color: #475569; margin: 6px 0 0; }
      .rules { font-size: 11px; color: #64748b; text-align: left; line-height: 1.55; border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 8px; }
      .rules b { color: #0f172a; }
      @media print { body { padding: 0; } @page { margin: 12mm; } }
    </style></head><body>` +
    `<div class="card">` +
    `<div class="top"><div class="brand">CLUB <span class="w">CRAFT</span></div><div class="kind">Gift Card</div></div>` +
    `<div class="body">` +
    `<p class="valueLbl">Saldo para consumir</p>` +
    `<p class="value">${value}</p>` +
    `<p class="valueSub">Válida hasta el ${esc(venc)}</p>` +
    `<div class="codeBox"><div class="codeWrap"><p class="codeLbl">Código</p><p class="code">${esc(card.code)}</p></div><div class="qr">${qrSvg}</div></div>` +
    paraDe +
    `<div class="rules">` +
    `<b>Cómo se usa:</b> presentá este código en la caja de CLUB CRAFT al pagar tu consumo. ` +
    `<b>Uso único:</b> se canjea entero en una sola visita (si la cuenta es menor al saldo, no se acumula la diferencia). ` +
    `<b>Vencimiento:</b> ${esc(venc)}.` +
    `</div>` +
    `</div></div>` +
    `</body></html>`
  );
}

// Abre una ventana con el HTML y dispara el diálogo de impresión (Guardar como PDF).
export function printGiftCard(html: string): boolean {
  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  setTimeout(() => { try { w.focus(); w.print(); } catch { /* el usuario puede imprimir manualmente */ } }, 400);
  return true;
}

// Serializa el <svg> del QR (por id) para incrustarlo en el PDF.
export function serializeQr(elementId: string): string {
  const svg = document.getElementById(elementId);
  if (!svg) return '';
  try {
    const clone = svg.cloneNode(true) as any;
    clone.removeAttribute('style');
    clone.setAttribute('width', '96');
    clone.setAttribute('height', '96');
    return new XMLSerializer().serializeToString(clone);
  } catch {
    return '';
  }
}

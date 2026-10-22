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

// Tramos por monto para la gift card "a elección": devuelve el % de bono del
// tramo más alto cuyo mínimo no supera el monto pagado (0 si no alcanza ninguno).
export interface GiftCardTier { id?: string; minAmount: number; bonusPct: number }
export function giftCardBonusPct(amount: number, tiers?: GiftCardTier[]): number {
  if (!Array.isArray(tiers) || tiers.length === 0) return 0;
  const a = Number(amount) || 0;
  const eligibles = tiers
    .filter((t) => (Number(t.minAmount) || 0) <= a)
    .sort((x, y) => (Number(y.minAmount) || 0) - (Number(x.minAmount) || 0));
  return eligibles.length ? (Number(eligibles[0].bonusPct) || 0) : 0;
}
// Saldo que recibe (regalás) a partir del monto pagado y los tramos.
export function giftCardCustomValue(amount: number, tiers?: GiftCardTier[]): number {
  const a = Number(amount) || 0;
  const pct = giftCardBonusPct(a, tiers);
  return Math.round(a * (1 + pct / 100));
}

export function giftCardPdfHtml(card: GiftCardPdfData, qrSvg: string): string {
  const venc = card.expires_at ? new Date(card.expires_at).toLocaleDateString('es-AR') : '';
  const value = '$' + (Number(card.value) || 0).toLocaleString('es-AR');
  const para = card.recipient_name ? `<div class="tagLine"><span class="tagLbl">Para</span><span class="tagName">${esc(card.recipient_name)}</span></div>` : '';
  const dede = card.sender_name ? `<div class="tagLine"><span class="tagLbl">De</span><span class="tagName">${esc(card.sender_name)}</span></div>` : '';
  const tag = (para || dede) ? `<div class="tag">${para}${dede}</div>` : '';
  const msg = card.message ? `<p class="msg">“${esc(card.message)}”</p>` : '';

  return (
    `<!doctype html><html lang="es"><head><meta charset="utf-8">` +
    `<title>GiftCard-CRAFT-${esc(card.code)}</title>` +
    `<style>
      * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 30px; display: flex; justify-content: center; background: #f1f5f9; }
      .card {
        width: 560px; border-radius: 30px; overflow: hidden; position: relative;
        background-color: #D90015;
        color: #fff; padding: 34px 34px 30px; box-shadow: 0 16px 40px rgba(217,0,21,.28);
        border: 1px solid rgba(255,255,255,.18);
      }
      .ribbon { position:absolute; top:22px; right:-44px; transform: rotate(45deg); background:#fff; color:#D90015; font-weight:800; font-size:10px; letter-spacing:2px; padding:5px 56px; text-transform:uppercase; }
      .brand { font-size: 27px; font-weight: 800; letter-spacing: -0.5px; }
      .brand .w { opacity: .9; }
      .kind { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 5px; margin-top: 2px; opacity: .92; }
      .tag { margin: 18px 0 6px; display: flex; gap: 10px; flex-wrap: wrap; }
      .tagLine { background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.25); border-radius: 12px; padding: 8px 14px; min-width: 150px; }
      .tagLbl { display:block; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; opacity: .8; }
      .tagName { display:block; font-size: 18px; font-weight: 800; margin-top: 1px; }
      .valueBlock { text-align: center; margin: 18px 0 16px; }
      .valueLbl { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 4px; opacity: .9; }
      .value { font-size: 60px; font-weight: 800; line-height: 1; margin: 4px 0 2px; }
      .valueSub { font-size: 12px; opacity: .9; }
      .codeBox { display: flex; align-items: center; justify-content: space-between; gap: 18px; background: #fff; color: #0f172a; border-radius: 18px; padding: 18px 20px; margin: 8px 0 14px; }
      .codeLbl { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #94a3b8; }
      .code { font-size: 32px; font-weight: 800; letter-spacing: 3px; color: #D90015; font-family: 'Courier New', monospace; }
      .qr { width: 96px; height: 96px; background:#fff; border-radius:8px; }
      .qr svg { width: 96px; height: 96px; display:block; }
      .msg { text-align:center; font-size: 14px; font-style: italic; margin: 0 0 14px; opacity: .95; }
      .rules { font-size: 11px; line-height: 1.55; opacity: .92; border-top: 1px solid rgba(255,255,255,.25); padding-top: 12px; }
      .rules b { color: #fff; }
      @media print { body { padding: 0; background: #fff; } @page { margin: 12mm; } }
    </style></head><body>` +
    `<div class="card">` +
    `<div class="ribbon">Regalo</div>` +
    `<div class="brand">CLUB <span class="w">CRAFT</span></div>` +
    `<div class="kind">🎁 Gift Card</div>` +
    tag +
    `<div class="valueBlock"><p class="valueLbl">Vale por</p><p class="value">${value}</p><p class="valueSub">para disfrutar en CRAFT</p></div>` +
    `<div class="codeBox"><div><p class="codeLbl">Código</p><p class="code">${esc(card.code)}</p></div><div class="qr">${qrSvg}</div></div>` +
    msg +
    `<div class="rules">` +
    `<b>Cómo se usa:</b> presentá este código en la caja de <b>cualquier sucursal de CRAFT</b> al pagar tu consumo. ` +
    `<b>Uso único:</b> se canjea entero en una sola visita (si la cuenta es menor al valor, no se acumula la diferencia). ` +
    `<b>Válida hasta el ${esc(venc)}.</b>` +
    `</div>` +
    `</div></body></html>`
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

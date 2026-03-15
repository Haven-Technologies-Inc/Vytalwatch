export function buildOrderEmailHtml(
  name: string,
  orderId: string,
  contents: Array<{ name: string; quantity: number }>,
): string {
  const total = contents.reduce((s, c) => s + c.quantity, 0);
  const rows = contents
    .map(
      (c) =>
        `<tr><td style="padding:8px;border-bottom:1px solid #eee">${c.name}</td>` +
        `<td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${c.quantity}</td></tr>`,
    )
    .join('');

  return `
<div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto">
  <div style="background:#1e40af;color:#fff;padding:20px;border-radius:8px 8px 0 0">
    <h2 style="margin:0">Device Order Confirmation</h2>
    <p style="margin:4px 0 0;opacity:.8">Order #${orderId.slice(0, 8).toUpperCase()}</p>
  </div>
  <div style="padding:20px;border:1px solid #e5e7eb;border-top:0">
    <p>Hello <strong>${name}</strong>,</p>
    <p>Your device order has been submitted successfully.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <thead><tr style="background:#f3f4f6">
        <th style="padding:8px;text-align:left">Device</th>
        <th style="padding:8px;text-align:center">Qty</th>
      </tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr style="font-weight:bold;background:#f9fafb">
        <td style="padding:8px">Total</td>
        <td style="padding:8px;text-align:center">${total}</td>
      </tr></tfoot>
    </table>
    <p style="color:#6b7280;font-size:13px">You will receive updates as your order is processed and shipped.</p>
  </div>
  <div style="padding:12px;text-align:center;color:#9ca3af;font-size:12px">
    VytalWatch &mdash; Intelligent Remote Patient Monitoring<br>
    <a href="https://vytalwatch.com" style="color:#6b7280;text-decoration:none">vytalwatch.com</a> &bull;
    <a href="mailto:support@vytalwatch.com" style="color:#6b7280;text-decoration:none">support@vytalwatch.com</a>
  </div>
</div>`;
}

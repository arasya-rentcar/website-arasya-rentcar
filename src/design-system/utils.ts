/**
 * Utilities from @arasya/design-system, ported verbatim from `_ds_bundle.js`.
 * Message wording and the ref-code alphabet are contractual — the ops team
 * matches inbound WhatsApp messages against them. Do not "improve" the copy.
 */

export interface QuoteMessageInput {
  refCode: string;
  cityName: string;
  pickupLocation: string;
  dropoffLocation: string;
  carType: string;
  duration: string;
  pickupTime: string;
  pickupDate?: string;
  passengerInfo?: string;
}

/** e.g. generateRefCode("BGR") -> "BGR-7F3K". Omits I/O/0/1 to stay unambiguous by phone. */
export function generateRefCode(cityCode: string): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `${cityCode.toUpperCase()}-${suffix}`;
}

export function buildQuoteMessage(input: QuoteMessageInput): string {
  const lines = [
    'Halo Arasya Rent Car, saya ingin minta penawaran sewa mobil.',
    '',
    `Ref: ${input.refCode}`,
    `Kota/Halaman: ${input.cityName}`,
    `Lokasi jemput: ${input.pickupLocation}`,
    `Lokasi antar: ${input.dropoffLocation}`,
    `Jenis mobil: ${input.carType}`,
    `Durasi: ${input.duration}`,
  ];
  if (input.pickupDate) lines.push(`Tanggal jemput: ${input.pickupDate}`);
  lines.push(`Jam jemput: ${input.pickupTime}`);
  if (input.passengerInfo) lines.push(`Nama/Jumlah penumpang: ${input.passengerInfo}`);
  lines.push('', 'Mohon info ketersediaan dan total biayanya. Terima kasih.');
  return lines.join('\n');
}

export function buildWaHref(phone: string, message?: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) digits = '62' + digits.slice(1);
  const query = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${digits}${query}`;
}

/** formatIDR(700000) -> "Rp700.000" */
export function formatIDR(value: number): string {
  return 'Rp' + new Intl.NumberFormat('id-ID').format(value);
}

/** formatIDRCompact(1250000) -> "Rp1,3jt" */
export function formatIDRCompact(value: number): string {
  if (value >= 1e6) {
    const jt = value / 1e6;
    const s = Number.isInteger(jt) ? String(jt) : jt.toFixed(1).replace('.', ',');
    return `Rp${s}jt`;
  }
  if (value >= 1e3) return `Rp${Math.round(value / 1e3)}rb`;
  return `Rp${value}`;
}

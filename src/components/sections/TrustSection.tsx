import { Glyph } from '@/components/icons';
import { CopyButton } from '@/components/CopyButton';
import type { Official } from '@/lib/shared';
import type { TrustCard } from '@/types';
import { CONTAINER_TIGHT, GRID_AUTOFIT } from './styles';

interface TrustSectionProps {
  cards: TrustCard[];
  official: Official;
  labels: {
    copy: string;
    copied: string;
  };
}

/**
 * Trust cards plus the Kartu Verifikasi — the anti-fraud block.
 *
 * This section exists because customers get targeted by impersonators, so the
 * official numbers and bank accounts are presented as a document to check
 * against before paying. Copy stays verbatim; the numbers are rendered from
 * `site_settings`, never hardcoded.
 */
export function TrustSection({ cards, official, labels }: TrustSectionProps) {
  return (
    <section
      data-sec="trust"
      data-screen-label="Kepercayaan & Keamanan"
      style={{ order: 30, background: '#ffffff', borderBottom: '1px solid var(--ar-color-border)' }}
    >
      <div style={CONTAINER_TIGHT}>
        <div className="ar-reveal" style={{ ...GRID_AUTOFIT(240, 0), gap: 'clamp(18px, 3vw, 28px)' }}>
          {cards.map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  flex: '0 0 40px',
                  borderRadius: 'var(--ar-radius-md)',
                  background: 'var(--ar-blue-50)',
                  border: '1px solid var(--ar-blue-100)',
                  color: 'var(--ar-color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Glyph name={t.preset} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 'var(--ar-text-sm)',
                    fontWeight: 'var(--ar-weight-bold)',
                    color: 'var(--ar-color-text)',
                  }}
                >
                  {t.title}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: 'var(--ar-text-xs)',
                    lineHeight: 1.6,
                    color: 'var(--ar-color-text-secondary)',
                    textWrap: 'pretty',
                  }}
                >
                  {t.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <VerificationCard official={official} labels={labels} />
      </div>
    </section>
  );
}

function VerificationCard({
  official,
  labels,
}: {
  official: Official;
  labels: { copy: string; copied: string };
}) {
  return (
    <div
      className="ar-reveal"
      style={{
        marginTop: 'clamp(22px, 3vw, 30px)',
        position: 'relative',
        isolation: 'isolate',
        borderRadius: 'var(--ar-radius-xl)',
        overflow: 'hidden',
        background: 'linear-gradient(150deg, var(--ar-blue-950) 0%, var(--city-navy-2) 100%)',
        boxShadow: 'var(--ar-shadow-lg)',
        display: 'flex',
        flexWrap: 'wrap',
      }}
    >
      <div
        style={{
          position: 'absolute',
          right: -36,
          bottom: -48,
          zIndex: -1,
          color: 'rgba(147,197,246,0.08)',
          pointerEvents: 'none',
        }}
      >
        <Glyph name="shield" size={180} />
      </div>

      <div
        style={{
          flex: '1.15 1 300px',
          minWidth: 'min(100%, 300px)',
          padding: 'clamp(24px, 3.5vw, 42px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          alignItems: 'flex-start',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '5px 12px',
            borderRadius: 999,
            background: 'rgba(239,68,68,0.14)',
            border: '1px solid rgba(248,113,113,0.4)',
            fontSize: 'var(--ar-text-xs)',
            fontWeight: 'var(--ar-weight-semibold)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#fca5a5',
          }}
        >
          <Glyph name="alert" size={14} />
          Waspada Penipuan
        </span>
        <h3
          style={{
            margin: 0,
            fontSize: 'clamp(22px, 2.8vw, 32px)',
            lineHeight: 1.18,
            letterSpacing: '-0.01em',
            fontWeight: 'var(--ar-weight-bold)',
            color: '#ffffff',
            textWrap: 'balance',
          }}
        >
          Sebelum membayar, cocokkan dengan Kartu Verifikasi resmi kami.
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: 'var(--ar-text-sm)',
            lineHeight: 1.75,
            color: 'var(--ar-blue-200)',
            textWrap: 'pretty',
          }}
        >
          Seluruh komunikasi dan pembayaran Arasya Rent Car hanya melalui kontak dan rekening pada
          kartu di samping. Di luar itu, bukan kami — segera konfirmasi ke nomor resmi.
        </p>
        <div
          style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8, marginTop: 2 }}
        >
          <WarnRow text="Nomor lain yang mengaku sebagai Arasya" tag="ABAIKAN" />
          <WarnRow text="Permintaan transfer ke rekening atas nama pribadi" tag="BUKAN KAMI" />
        </div>
      </div>

      <div
        style={{
          flex: '1 1 330px',
          minWidth: 'min(100%, 330px)',
          padding: 'clamp(16px, 2.5vw, 28px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 10,
        }}
      >
        <div
          style={{
            width: '100%',
            background: '#ffffff',
            borderRadius: 'var(--ar-radius-lg)',
            boxShadow: 'var(--ar-shadow-lg)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: 5,
              background: 'repeating-linear-gradient(-45deg, #dc2626 0 10px, #ffffff 10px 20px)',
            }}
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              padding: '14px 18px 10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span
                style={{
                  flex: '0 0 auto',
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: 'var(--ar-blue-950)',
                  color: '#7cc0f8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Glyph name="shield" size={15} />
              </span>
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 11,
                    fontWeight: 'var(--ar-weight-bold)',
                    letterSpacing: '0.14em',
                    color: 'var(--ar-color-text)',
                  }}
                >
                  KARTU VERIFIKASI
                </p>
                <p
                  style={{
                    margin: '1px 0 0',
                    fontSize: 10,
                    letterSpacing: '0.08em',
                    color: 'var(--ar-color-text-muted)',
                  }}
                >
                  ARASYA RENT CAR · PT. AYOMI RAYA
                </p>
              </div>
            </div>
            <span
              style={{
                flex: '0 0 auto',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 10,
                fontWeight: 'var(--ar-weight-bold)',
                letterSpacing: '0.1em',
                color: '#15803d',
                background: '#e9f7ee',
                border: '1px solid #bbe5c8',
                borderRadius: 999,
                padding: '4px 9px',
              }}
            >
              <Glyph name="check" size={12} />
              RESMI
            </span>
          </div>

          <div style={{ padding: '4px 14px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {official.phones.map((n) => (
              <div
                key={n.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 'var(--ar-radius-md)',
                  background: 'var(--ar-gray-25)',
                  border: '1px solid var(--ar-color-border)',
                }}
              >
                <span
                  style={{
                    flex: '0 0 auto',
                    width: 26,
                    height: 26,
                    borderRadius: 999,
                    background: '#e7f6ec',
                    color: '#1a7f4b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Glyph name="phone" size={13} />
                </span>
                <span
                  style={{
                    flex: 1,
                    fontSize: 'var(--ar-text-md)',
                    fontWeight: 'var(--ar-weight-bold)',
                    color: 'var(--ar-color-text)',
                    letterSpacing: '0.02em',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {n.display}
                </span>
                <CopyButton
                  value={n.value}
                  label={labels.copy}
                  copiedLabel={labels.copied}
                  className="copy-chip"
                  style={{
                    flex: '0 0 auto',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 34,
                    padding: '0 14px',
                    borderRadius: 999,
                    background: 'var(--ar-blue-50)',
                    border: '1px solid var(--ar-blue-100)',
                    color: 'var(--ar-blue-700)',
                    fontSize: 'var(--ar-text-xs)',
                    fontWeight: 'var(--ar-weight-semibold)',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    transition: 'background var(--ar-duration-fast) var(--ar-ease)',
                  }}
                />
              </div>
            ))}
          </div>

          <div style={{ borderTop: '2px dashed var(--ar-color-border)', margin: '14px 14px 0' }} />

          <div style={{ margin: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {official.bankAccounts.map((bk) => (
              <div
                key={bk.key}
                style={{
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, var(--ar-blue-950), var(--ar-blue-700))',
                  padding: '16px 18px',
                  color: '#ffffff',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 10,
                      fontWeight: 'var(--ar-weight-semibold)',
                      letterSpacing: '0.14em',
                      color: 'var(--ar-blue-200)',
                    }}
                  >
                    REKENING RESMI
                  </p>
                  <span
                    style={{
                      fontSize: 'var(--ar-text-sm)',
                      fontWeight: 'var(--ar-weight-bold)',
                      fontStyle: 'italic',
                      letterSpacing: '0.04em',
                      color: '#7cc0f8',
                    }}
                  >
                    {bk.bank}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    marginTop: 12,
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 'clamp(18px, 2vw, 21px)',
                      fontWeight: 'var(--ar-weight-bold)',
                      letterSpacing: '0.08em',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {bk.number}
                  </p>
                  <CopyButton
                    value={bk.digits}
                    label={labels.copy}
                    copiedLabel={labels.copied}
                    className="copy-chip-dark"
                    style={{
                      flex: '0 0 auto',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: 34,
                      padding: '0 14px',
                      borderRadius: 999,
                      background: 'rgba(255,255,255,0.12)',
                      border: '1px solid rgba(255,255,255,0.32)',
                      color: '#ffffff',
                      fontSize: 'var(--ar-text-xs)',
                      fontWeight: 'var(--ar-weight-semibold)',
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                      transition: 'background var(--ar-duration-fast) var(--ar-ease)',
                    }}
                  />
                </div>
                <p
                  style={{
                    margin: '8px 0 0',
                    fontSize: 'var(--ar-text-xs)',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'var(--ar-blue-200)',
                  }}
                >
                  {bk.owner}
                </p>
              </div>
            ))}
          </div>
        </div>
        <p
          style={{
            margin: 0,
            textAlign: 'center',
            fontSize: 'var(--ar-text-xs)',
            color: 'var(--ar-blue-300, var(--ar-blue-200))',
          }}
        >
          Simpan kartu ini — cocokkan kembali sebelum melakukan pembayaran.
        </p>
      </div>
    </div>
  );
}

function WarnRow({ text, tag }: { text: string; tag: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '10px 12px',
        borderRadius: 'var(--ar-radius-md)',
        background: 'rgba(239,68,68,0.10)',
        border: '1px solid rgba(248,113,113,0.22)',
      }}
    >
      <span style={{ flex: '0 0 auto', color: '#fca5a5', display: 'flex' }}>
        <Glyph name="alert" size={14} />
      </span>
      <span style={{ flex: 1, fontSize: 'var(--ar-text-sm)', lineHeight: 1.5, color: '#fecaca' }}>
        {text}
      </span>
      <span
        style={{
          flex: '0 0 auto',
          fontSize: 10,
          fontWeight: 'var(--ar-weight-bold)',
          letterSpacing: '0.12em',
          color: '#fca5a5',
          border: '1px solid rgba(248,113,113,0.45)',
          borderRadius: 4,
          padding: '3px 7px',
          whiteSpace: 'nowrap',
        }}
      >
        {tag}
      </span>
    </div>
  );
}

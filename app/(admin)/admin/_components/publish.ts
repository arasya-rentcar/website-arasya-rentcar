import type { PublishResult } from '@/lib/publish';

/**
 * Turns a publish result into one sentence the owner can act on.
 *
 * Every branch here says the change is already live, because it is — the
 * rebuild is an optimisation, not a prerequisite. An earlier version warned
 * that a new address "would not work until the next deploy"; that was true of
 * the `dynamicParams = false` design and stopped being true when that flag had
 * to go. A message that overstates the problem is its own bug: it would send
 * the owner off to check a deployment that did not need checking.
 */
export function describePublish(result: PublishResult): string {
  if (!result.ok) return `Gagal: ${result.error}`;

  const parts = ['Diterbitkan.'];
  parts.push(`${result.revalidated ?? 0} halaman diperbarui.`);

  switch (result.rebuild) {
    case 'triggered':
      parts.push(
        `Alamat halaman berubah (${result.rebuildReason}) — sudah aktif sekarang, dan situs ` +
          'sedang dibangun ulang agar halaman baru ikut tersimpan sebagai halaman statis.'
      );
      break;
    case 'unavailable':
      parts.push(
        `Alamat halaman berubah (${result.rebuildReason}) dan sudah aktif. ` +
          'VERCEL_DEPLOY_HOOK_URL belum diset, jadi halaman ini dirender saat diminta sampai deploy berikutnya.'
      );
      break;
    case 'failed':
      parts.push(
        `Alamat halaman berubah (${result.rebuildReason}) dan sudah aktif. ` +
          'Permintaan build ulang gagal terkirim — tidak mendesak, tetapi periksa deploy hook-nya.'
      );
      break;
    default:
      break;
  }

  if (result.ignored?.length) {
    parts.push(`Field diabaikan: ${result.ignored.join(', ')}.`);
  }

  return parts.join(' ');
}

import type { Metadata } from 'next';
import { RootShell, rootMetadata } from '@/components/layout/RootShell';
import '../globals.css';
import '../landing.css';

export const metadata: Metadata = rootMetadata;

/** Indonesian root layout — `/`, `/sewa-mobil`, `/{city}`, `/travel`, `/blog`. */
export default function IdRootLayout({ children }: { children: React.ReactNode }) {
  return <RootShell locale="id">{children}</RootShell>;
}

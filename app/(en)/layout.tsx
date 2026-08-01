import type { Metadata } from 'next';
import { RootShell, rootMetadata } from '@/components/layout/RootShell';
import '../globals.css';
import '../landing.css';

export const metadata: Metadata = rootMetadata;

/** English root layout — everything under `/en`. Exists solely so those pages
 *  can declare `<html lang="en">`; see RootShell. */
export default function EnRootLayout({ children }: { children: React.ReactNode }) {
  return <RootShell locale="en">{children}</RootShell>;
}

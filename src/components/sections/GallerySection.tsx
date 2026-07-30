import Image from 'next/image';
import { SectionHeading } from '@/design-system';
import type { GalleryImage } from '@/types';
import { CONTAINER } from './styles';

interface GallerySectionProps {
  images: GalleryImage[];
  eyebrow: string;
  title: string;
  subtitle: string;
}

/**
 * Galeri — one landscape hero plus a 3-up cluster, matching the prototype grid.
 *
 * The prototypes filled these with `image-slot` drag-drop placeholders, a
 * design-tool affordance with no production data behind it. Real images are
 * CMS-managed via `site_settings.gallery`; until at least four exist the whole
 * section is omitted rather than rendering empty boxes.
 */
export function GallerySection({ images, eyebrow, title, subtitle }: GallerySectionProps) {
  if (images.length < 4) return null;
  const [main, portrait, third, fourth] = images;

  return (
    <section
      data-screen-label="Galeri"
      style={{ order: 92, background: '#ffffff', borderTop: '1px solid var(--ar-color-border)' }}
    >
      <div style={CONTAINER}>
        <div className="ar-reveal">
          <SectionHeading eyebrow={eyebrow} title={title} subtitle={subtitle} />
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 460px), 1fr))',
            gap: 12,
            marginTop: 24,
          }}
        >
          <div
            className="ar-reveal"
            style={{ aspectRatio: '4 / 3', borderRadius: 'var(--ar-radius-lg)', overflow: 'hidden' }}
          >
            <Tile image={main} />
          </div>
          <div
            className="ar-reveal"
            style={{
              aspectRatio: '4 / 3',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gridTemplateRows: '1fr 1fr',
              gap: 12,
            }}
          >
            <div
              style={{ gridRow: 'span 2', borderRadius: 'var(--ar-radius-lg)', overflow: 'hidden' }}
            >
              <Tile image={portrait} />
            </div>
            <div style={{ borderRadius: 'var(--ar-radius-lg)', overflow: 'hidden' }}>
              <Tile image={third} />
            </div>
            <div style={{ borderRadius: 'var(--ar-radius-lg)', overflow: 'hidden' }}>
              <Tile image={fourth} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Tile({ image }: { image: GalleryImage }) {
  return (
    <Image
      src={image.src}
      alt={image.alt}
      width={800}
      height={600}
      loading="lazy"
      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
    />
  );
}

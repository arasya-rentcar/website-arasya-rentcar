'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

interface CopyButtonProps {
  /** Digits-only value actually written to the clipboard. */
  value: string;
  label: string;
  copiedLabel: string;
  style?: CSSProperties;
  hoverStyle?: CSSProperties;
  className?: string;
}

/**
 * Copy-to-clipboard control for the Kartu Verifikasi phone numbers and bank
 * accounts. Reverts to the idle label after 1.6s, matching the prototype.
 *
 * The confirmation shows even when the clipboard write is rejected (permissions,
 * insecure context) — same as the original, which treats the button as an
 * affordance rather than a guarantee. The number stays visible either way.
 */
export function CopyButton({
  value,
  label,
  copiedLabel,
  style,
  hoverStyle,
  className,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const [hover, setHover] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function onCopy() {
    const done = () => {
      clearTimeout(timer.current);
      setCopied(true);
      timer.current = setTimeout(() => setCopied(false), 1600);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(value).then(done, done);
    } else {
      done();
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={className}
      style={{ ...style, ...(hover ? hoverStyle : undefined) }}
    >
      {copied ? copiedLabel : label}
    </button>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Analyze" },
  { href: "/batch", label: "Batch" },
  { href: "/research", label: "Research" },
];

function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="#16151A" />
      <rect x="8" y="17" width="3" height="8" rx="1" fill="#fff" />
      <rect x="13" y="13" width="3" height="12" rx="1" fill="#fff" />
      <rect x="18" y="19" width="3" height="6" rx="1" fill="#fff" />
      <circle cx="21.5" cy="10" r="3.5" fill="none" stroke="#fff" strokeWidth="1.6" />
      <circle cx="21.5" cy="10" r="1.2" fill="#fff" />
    </svg>
  );
}

export default function Header() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto grid h-[72px] grid-cols-[auto_1fr] sm:grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 sm:px-8">
        <Link href="/" className="flex items-center gap-3 justify-self-start rounded">
          <Logo />
          <span className="hidden whitespace-nowrap text-lg font-semibold tracking-tight sm:inline">Misread Score</span>
          <span className="sr-only sm:hidden">Misread Score</span>
        </Link>
        <nav aria-label="Main" className="flex items-stretch justify-end gap-1 self-stretch sm:justify-center sm:gap-6">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex items-center px-2 text-[15px] font-medium transition-colors ${
                  active ? "text-ink" : "text-muted hover:text-ink"
                }`}
              >
                {item.label}
                {active && <span aria-hidden="true" className="absolute inset-x-0 -bottom-px h-0.5 bg-primary" />}
              </Link>
            );
          })}
        </nav>
        <p className="hidden justify-self-end text-xs text-muted lg:block">Rule-based checks · runs in your browser</p>
      </div>
    </header>
  );
}

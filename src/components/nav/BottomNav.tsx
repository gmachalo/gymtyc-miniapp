"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", icon: "🏠", label: "Home" },
  { href: "/workout",   icon: "💪", label: "Train" },
  { href: "/gyms",      icon: "🏢", label: "Gyms" },
  { href: "/rewards",   icon: "💰", label: "Rewards" },
  { href: "/profile",   icon: "👤", label: "Profile" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="nav-bar" role="navigation" aria-label="Main navigation">
      {NAV_ITEMS.map(({ href, icon, label }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            id={`nav-${label.toLowerCase()}`}
            className={`nav-item ${active ? "active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <span className="nav-icon">{icon}</span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

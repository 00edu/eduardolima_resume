"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, FolderKanban, Plus } from "lucide-react";
import clsx from "clsx";

export function AppShell({
  children,
  title,
  subtitle,
  action,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col px-4 pb-28 pt-6 sm:max-w-xl">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <Link href="/" className="group inline-block">
            <p className="font-display text-3xl font-semibold tracking-tight text-ink transition group-hover:text-pine">
              ObraCam
            </p>
          </Link>
          {title ? (
            <h1 className="mt-2 font-display text-xl font-medium text-ink/90">{title}</h1>
          ) : null}
          {subtitle ? <p className="mt-1 text-sm text-slate">{subtitle}</p> : null}
        </div>
        {action}
      </header>

      <main className="flex-1">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-ink/10 bg-mist/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-3 sm:max-w-xl">
          <NavLink href="/" active={pathname === "/"} icon={<FolderKanban size={20} />} label="Obras" />
          <Link
            href="/projects/new"
            className="relative -mt-8 flex h-14 w-14 items-center justify-center rounded-full bg-clay text-white shadow-soft transition hover:scale-105 active:scale-95"
            aria-label="Novo projeto"
          >
            <Plus size={28} strokeWidth={2.5} />
          </Link>
          <NavLink
            href="/agent"
            active={pathname.startsWith("/agent")}
            icon={<Bot size={20} />}
            label="Agente"
          />
        </div>
      </nav>
    </div>
  );
}

function NavLink({
  href,
  active,
  icon,
  label,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "flex min-w-[4.5rem] flex-col items-center gap-1 rounded-xl px-3 py-1 text-xs font-semibold transition",
        active ? "text-pine" : "text-slate hover:text-ink"
      )}
    >
      {icon}
      {label}
    </Link>
  );
}

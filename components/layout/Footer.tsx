import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t border-white/8 py-10 mt-16 bg-black">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2 shrink-0 group">
            <Image
              src="/logo_dark.png"
              width={1006}
              height={372}
              alt="Journality"
              className="h-6 w-auto transition-opacity group-hover:opacity-90"
            />
            <span className="sr-only">Journality</span>
          </Link>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {[
              { href: "/", label: "Home" },
              { href: "/about", label: "About" },
              { href: "/papers/submit", label: "Submit" },
              { href: "/auth/login", label: "Sign in" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors font-mono"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <p className="text-[11px] font-mono text-zinc-700">
            © {new Date().getFullYear()} Journality
          </p>
        </div>
      </div>
    </footer>
  );
}

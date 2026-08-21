import Link from "next/link";
import type { AccountRole } from "@/lib/auth";

export type AccountSection = "profile" | "saved" | "interests" | "admin";

export function AccountNavigation({
  current,
  role,
  configured,
  email,
}: {
  current: AccountSection;
  role: AccountRole;
  configured: boolean;
  email?: string | null;
}) {
  const links: Array<{ key: AccountSection; label: string }> = [
    { key: "profile", label: "Profile" },
    { key: "saved", label: "Saved" },
    { key: "interests", label: "Interest history" },
  ];
  if (role === "operator" || role === "admin") links.push({ key: "admin", label: "Operator inbox" });

  return (
    <div className="account-navigation">
      <nav className="account-navigation__links" aria-label="Account navigation">
        {links.map((link) => (
          <Link
            key={link.key}
            className="account-navigation__link"
            href={`/en/${link.key}`}
            aria-current={current === link.key ? "page" : undefined}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <p className="account-navigation__identity">
        {configured ? email : "Local preview"}
      </p>
    </div>
  );
}

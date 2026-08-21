import Image from "next/image";
import Link from "next/link";
import { pickText, type Locale } from "@/lib/i18n";
import type { TravelStyle } from "@/lib/types";

export function TravelStyleCard({ style, locale }: { style: TravelStyle; locale: Locale }) {
  const href = `/${locale}/explore?style=${encodeURIComponent(style.slug)}`;
  return (
    <article className="travel-style-card">
      <Link className="travel-style-media" href={href}>
        <Image
          src={style.media.src}
          alt={pickText(style.media.alt, locale)}
          fill
          sizes="(max-width: 760px) 82vw, 320px"
        />
      </Link>
      <div>
        <h3>
          <Link href={href}>{pickText(style.title, locale)}</Link>
        </h3>
        <p>{pickText(style.summary, locale)}</p>
      </div>
    </article>
  );
}

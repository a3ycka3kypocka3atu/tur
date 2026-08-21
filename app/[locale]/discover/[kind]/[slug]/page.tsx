import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DetailPage, getDetailMetadata } from "@/components/detail-page";
import { getDiscoverable, isMvpDiscoverableKind } from "@/lib/content/repository";
import { isLocale } from "@/lib/i18n";

type PageProps = {
  params: Promise<{ locale: string; kind: string; slug: string }>;
};

async function resolveItem({ params }: PageProps) {
  const { locale, kind, slug } = await params;
  if (!isLocale(locale) || !isMvpDiscoverableKind(kind)) notFound();
  const item = await getDiscoverable(kind, slug);
  if (!item) notFound();
  return { locale, item };
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale, item } = await resolveItem(props);
  return getDetailMetadata(locale, item);
}

export default async function Page(props: PageProps) {
  const { locale, item } = await resolveItem(props);
  return <DetailPage locale={locale} item={item} />;
}

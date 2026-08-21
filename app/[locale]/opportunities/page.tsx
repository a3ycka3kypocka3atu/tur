import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CollectionPage, getCollectionMetadata } from "@/components/collection-page";
import { isLocale } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return getCollectionMetadata(locale, "opportunities");
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <CollectionPage locale={locale} collection="opportunities" />;
}

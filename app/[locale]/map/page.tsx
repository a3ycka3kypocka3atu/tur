import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  CollectionPage,
  getCollectionMetadata,
  type RouteSearchParams,
} from "@/components/collection-page";
import { isLocale } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return getCollectionMetadata(locale, "map");
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<RouteSearchParams>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <CollectionPage locale={locale} collection="map" searchParams={await searchParams} />;
}

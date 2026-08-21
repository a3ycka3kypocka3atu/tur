import { descriptionJson, localizedJson, type ContentRecord } from "@/lib/account";
import type { Locale } from "@/lib/i18n";

const copy = {
    legend: "CMS fields",
    titleEn: "Title in English",
    summaryEn: "Summary in English",
    descriptionEn: "Description in English",
    location: "Location name",
    categories: "Categories",
    styles: "Travel styles",
    externalUrl: "External URL",
    featured: "Feature this item",
    save: "Save CMS fields",
} as const;

export function AdminContentForm({
  locale,
  item,
  action,
  disabled = false,
}: {
  locale: Locale;
  item: ContentRecord;
  action: (formData: FormData) => void | Promise<void>;
  disabled?: boolean;
}) {
  const text = copy;

  return (
    <form className="admin-content-form account-form" action={action}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="id" value={item.id} />
      <input type="hidden" name="kind" value={item.kind} />
      <input type="hidden" name="slug" value={item.slug} />
      <fieldset className="admin-content-form__fieldset" disabled={disabled}>
        <legend>{text.legend}</legend>
        <div className="admin-content-form__grid account-form__grid">
          <label>{text.titleEn}<input name="title_en" defaultValue={localizedJson(item.title_i18n, "en", "")} maxLength={160} required /></label>
          <label>{text.summaryEn}<textarea name="summary_en" defaultValue={localizedJson(item.summary_i18n, "en", "")} maxLength={1200} /></label>
          <label>{text.descriptionEn}<textarea name="description_en" defaultValue={descriptionJson(item.payload, "en")} maxLength={5000} /></label>
          <label>{text.location}<input name="location_name" defaultValue={item.location_name ?? ""} maxLength={240} /></label>
          <label>{text.externalUrl}<input name="external_url" type="url" defaultValue={item.external_url ?? ""} maxLength={2000} /></label>
          <label>{text.categories}<input name="categories" defaultValue={item.categories.join(", ")} /></label>
          <label>{text.styles}<input name="travel_styles" defaultValue={item.travel_styles.join(", ")} /></label>
        </div>
        <label className="admin-content-form__check">
          <input name="featured" type="checkbox" defaultChecked={item.featured} />
          {text.featured}
        </label>
        <button className="button button-primary" type="submit">{text.save}</button>
      </fieldset>
    </form>
  );
}

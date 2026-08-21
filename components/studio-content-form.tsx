import { descriptionJson, localizedJson, type ContentRecord } from "@/lib/account";
import type { Locale } from "@/lib/i18n";

const copy = {
    legendCreate: "New draft",
    legendEdit: "Edit draft",
    kind: "Content type",
    kinds: { place: "Place", journey: "Journey", opportunity: "Opportunity", creator: "Creator" },
    slug: "Slug",
    slugHelp: "Lowercase letters, numbers, and hyphens only.",
    titleEn: "Title in English",
    summaryEn: "Summary in English",
    descriptionEn: "Description in English",
    location: "Location name",
    categories: "Categories",
    styles: "Travel styles",
    listsHelp: "Separate values with commas.",
    externalUrl: "External URL",
    create: "Create draft",
    save: "Save as draft",
} as const;

export function StudioContentForm({
  locale,
  item,
  action,
  disabled = false,
}: {
  locale: Locale;
  item?: ContentRecord | null;
  action: (formData: FormData) => void | Promise<void>;
  disabled?: boolean;
}) {
  const text = copy;
  const title = (code: Locale) => item ? localizedJson(item.title_i18n, code, "") : "";
  const summary = (code: Locale) => item ? localizedJson(item.summary_i18n, code, "") : "";
  const description = (code: Locale) => item ? descriptionJson(item.payload, code) : "";

  return (
    <form className="studio-content-form account-form" action={action}>
      <input type="hidden" name="locale" value={locale} />
      {item ? <input type="hidden" name="id" value={item.id} /> : null}
      <fieldset className="studio-content-form__fieldset" disabled={disabled}>
        <legend>{item ? text.legendEdit : text.legendCreate}</legend>
        <div className="studio-content-form__grid account-form__grid">
          <label>
            {text.kind}
            <select name="kind" defaultValue={item?.kind ?? "place"}>
              {Object.entries(text.kinds).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label>
            {text.slug}
            <input name="slug" defaultValue={item?.slug ?? ""} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={160} aria-describedby="studio-slug-help" required />
            <span id="studio-slug-help" className="field-help">{text.slugHelp}</span>
          </label>
          <label>
            {text.titleEn}
            <input name="title_en" defaultValue={title("en")} maxLength={160} required />
          </label>
        </div>
        <div className="studio-content-form__grid account-form__grid">
          <label>{text.summaryEn}<textarea name="summary_en" defaultValue={summary("en")} maxLength={1200} /></label>
          <label>{text.descriptionEn}<textarea name="description_en" defaultValue={description("en")} maxLength={5000} /></label>
        </div>
        <div className="studio-content-form__grid account-form__grid">
          <label>{text.location}<input name="location_name" defaultValue={item?.location_name ?? ""} maxLength={240} /></label>
          <label>{text.externalUrl}<input name="external_url" type="url" defaultValue={item?.external_url ?? ""} maxLength={2000} /></label>
          <label>
            {text.categories}
            <input name="categories" defaultValue={item?.categories.join(", ") ?? ""} aria-describedby="studio-lists-help" />
            <span id="studio-lists-help" className="field-help">{text.listsHelp}</span>
          </label>
          <label>{text.styles}<input name="travel_styles" defaultValue={item?.travel_styles.join(", ") ?? ""} /></label>
        </div>
        <button className="button button-primary" type="submit">{item ? text.save : text.create}</button>
      </fieldset>
    </form>
  );
}

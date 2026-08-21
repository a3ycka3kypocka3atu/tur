"use client";

import { useActionState } from "react";
import { saveProfileAction, type ActionResult } from "@/app/actions";
import type { ProfileRecord } from "@/lib/account";

const initialState: ActionResult = { ok: false, message: "" };

export function ProfileForm({
  profile,
  fallbackName,
}: {
  profile: ProfileRecord | null;
  fallbackName: string;
}) {
  const [state, formAction, pending] = useActionState(saveProfileAction, initialState);
  const list = (items: string[]) => items.join(", ");

  return (
    <form className="profile-form account-form" action={formAction}>
      <fieldset className="profile-form__fieldset" disabled={pending}>
        <legend>Travel profile</legend>
        <div className="profile-form__grid account-form__grid">
          <label>
            Public name
            <input
              name="public_name"
              defaultValue={profile?.public_name || fallbackName}
              maxLength={80}
              required
            />
          </label>
          <label>
            Country
            <input name="country" defaultValue={profile?.country ?? ""} maxLength={120} />
          </label>
          <label>
            Region or base
            <input name="region" defaultValue={profile?.region ?? ""} maxLength={160} />
          </label>
          <label>
            Languages
            <input
              name="languages"
              defaultValue={list(profile?.languages ?? [])}
              aria-describedby="profile-languages-help"
            />
            <span id="profile-languages-help" className="field-help">
              Separate values with commas.
            </span>
          </label>
        </div>
        <label>
          Introduction
          <textarea
            name="introduction"
            defaultValue={profile?.introduction ?? ""}
            maxLength={1200}
          />
        </label>
        <div className="profile-form__grid account-form__grid">
          <label>
            Travel interests
            <textarea
              name="travel_interests"
              defaultValue={list(profile?.travel_interests ?? [])}
            />
          </label>
          <label>
            Preferred environments
            <textarea
              name="preferred_environments"
              defaultValue={list(profile?.preferred_environments ?? [])}
            />
          </label>
          <label>
            Travel styles
            <textarea
              name="travel_styles"
              defaultValue={list(profile?.travel_styles ?? [])}
            />
          </label>
          <label>
            Current travel goals
            <textarea
              name="travel_goals"
              defaultValue={profile?.travel_goals ?? ""}
              maxLength={1200}
            />
          </label>
        </div>
        <label>
          Website
          <input
            name="website"
            type="url"
            defaultValue={profile?.social_links.website ?? ""}
            maxLength={2000}
          />
        </label>
        <div className="account-form__submit">
          <button className="button button-primary" type="submit">
            {pending ? "Saving profile" : "Save profile"}
          </button>
          <p
            className={`form-status ${state.ok ? "is-success" : state.message ? "is-error" : ""}`}
            role="status"
            aria-live="polite"
          >
            {state.message}
          </p>
        </div>
      </fieldset>
    </form>
  );
}

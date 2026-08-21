import assert from "node:assert/strict";
import test from "node:test";

import {
  creators,
  discoverables,
  filterTags,
  journeys,
  opportunities,
  people,
  places,
  projects,
  seedContent,
  travelStyles,
} from "../lib/content/seed.ts";
import {
  MAPPABLE_DISCOVERABLE_KINDS,
  SUPPORTED_LOCALES,
  type Discoverable,
  type LocalizedText,
} from "../lib/types.ts";

const assertLocalized = (value: LocalizedText, path: string) => {
  for (const locale of SUPPORTED_LOCALES) {
    assert.equal(
      typeof value[locale],
      "string",
      `${path}.${locale} must be a string`,
    );
    assert.notEqual(
      value[locale].trim(),
      "",
      `${path}.${locale} must not be empty`,
    );
  }
};

const assertLocalizedList = (
  values: readonly LocalizedText[],
  path: string,
) => {
  assert.ok(values.length > 0, `${path} must not be empty`);
  values.forEach((value, index) =>
    assertLocalized(value, `${path}[${index}]`),
  );
};

const assertBaseTranslations = (item: Discoverable) => {
  const path = `discoverables.${item.slug}`;
  assertLocalized(item.title, `${path}.title`);
  assertLocalized(item.summary, `${path}.summary`);
  assertLocalized(item.description, `${path}.description`);
  assertLocalized(item.location, `${path}.location`);
  assertLocalized(item.statusLabel, `${path}.statusLabel`);
  assertLocalized(item.media.alt, `${path}.media.alt`);
  assertLocalized(item.source.label, `${path}.source.label`);
  assertLocalized(item.source.note, `${path}.source.note`);
  assert.ok(item.actions.length > 0, `${path}.actions must not be empty`);
  item.actions.forEach((action, index) => {
    assertLocalized(action.label, `${path}.actions[${index}].label`);
    assert.ok(action.href.startsWith("/"), `${path}.actions[${index}].href`);
  });

  switch (item.kind) {
    case "place":
      assertLocalized(item.coordinateLabel, `${path}.coordinateLabel`);
      assertLocalized(item.categoryLabel, `${path}.categoryLabel`);
      assertLocalized(item.comfortLabel, `${path}.comfortLabel`);
      break;
    case "journey":
      assertLocalized(item.coordinateLabel, `${path}.coordinateLabel`);
      assertLocalized(item.duration, `${path}.duration`);
      assertLocalized(item.groupSize, `${path}.groupSize`);
      assertLocalized(item.accommodation, `${path}.accommodation`);
      assertLocalized(item.pace, `${path}.pace`);
      assertLocalized(item.availabilityNotice, `${path}.availabilityNotice`);
      break;
    case "opportunity":
      assertLocalized(item.coordinateLabel, `${path}.coordinateLabel`);
      assertLocalized(item.categoryLabel, `${path}.categoryLabel`);
      assertLocalized(item.participationType, `${path}.participationType`);
      assertLocalized(item.requirements, `${path}.requirements`);
      assertLocalized(item.availability.notice, `${path}.availability.notice`);
      break;
    case "creator":
      assertLocalized(item.coordinateLabel, `${path}.coordinateLabel`);
      assertLocalizedList(item.languages, `${path}.languages`);
      assertLocalizedList(item.specialties, `${path}.specialties`);
      assertLocalized(item.profileNotice, `${path}.profileNotice`);
      break;
    case "project":
      assertLocalized(item.coordinateLabel, `${path}.coordinateLabel`);
      assertLocalized(item.purpose, `${path}.purpose`);
      assertLocalized(item.participation, `${path}.participation`);
      assertLocalizedList(item.needs, `${path}.needs`);
      assertLocalized(item.profileNotice, `${path}.profileNotice`);
      break;
    case "person":
      assertLocalizedList(item.languages, `${path}.languages`);
      assertLocalized(item.introduction, `${path}.introduction`);
      assertLocalizedList(
        item.preferredEnvironments,
        `${path}.preferredEnvironments`,
      );
      assertLocalized(item.comfortLabel, `${path}.comfortLabel`);
      assertLocalized(item.travelRhythm, `${path}.travelRhythm`);
      assertLocalized(item.socialStyle, `${path}.socialStyle`);
      assertLocalized(item.currentDirection, `${path}.currentDirection`);
      break;
  }
};

test("seed meets the MVP content counts", () => {
  assert.ok(places.length >= 4 && places.length <= 6);
  assert.equal(journeys.length, 3);
  assert.ok(opportunities.length >= 4 && opportunities.length <= 6);
  assert.equal(creators.length + projects.length, 3);
  assert.ok(creators.length > 0);
  assert.ok(projects.length > 0);
  assert.equal(people.length, 4);
  assert.ok(travelStyles.length >= 8 && travelStyles.length <= 12);
});

test("all content slugs are globally unique", () => {
  const slugs = [
    ...discoverables.map((item) => item.slug),
    ...travelStyles.map((style) => style.slug),
    ...filterTags.map((tag) => tag.slug),
  ];
  assert.equal(new Set(slugs).size, slugs.length);
});

test("all visible seed fields contain English and Russian text", () => {
  filterTags.forEach((tag) =>
    assertLocalized(tag.label, `filterTags.${tag.slug}.label`),
  );

  travelStyles.forEach((style) => {
    const path = `travelStyles.${style.slug}`;
    assertLocalized(style.title, `${path}.title`);
    assertLocalized(style.summary, `${path}.summary`);
    assertLocalized(style.description, `${path}.description`);
    assertLocalized(style.practicalNote, `${path}.practicalNote`);
    assertLocalized(style.media.alt, `${path}.media.alt`);
    assertLocalized(style.source.label, `${path}.source.label`);
    assertLocalized(style.source.note, `${path}.source.note`);
    assertLocalized(style.action.label, `${path}.action.label`);
  });

  discoverables.forEach(assertBaseTranslations);
});

test("mappable kinds have valid coordinates and demo people do not", () => {
  const mappableKinds = new Set<string>(MAPPABLE_DISCOVERABLE_KINDS);

  discoverables.forEach((item) => {
    if (mappableKinds.has(item.kind)) {
      assert.ok("coordinates" in item, `${item.slug} needs coordinates`);
      const coordinates = item.coordinates;
      assert.ok(coordinates, `${item.slug} needs coordinate values`);
      assert.ok(Number.isFinite(coordinates.latitude));
      assert.ok(Number.isFinite(coordinates.longitude));
      assert.ok(coordinates.latitude >= -90 && coordinates.latitude <= 90);
      assert.ok(coordinates.longitude >= -180 && coordinates.longitude <= 180);
      return;
    }

    assert.equal("coordinates" in item, false, `${item.slug} must stay approximate`);
  });
});

test("all relations, tags and travel style references resolve", () => {
  const discoverableSlugs = new Set(discoverables.map((item) => item.slug));
  const placeSlugs = new Set(places.map((item) => item.slug));
  const creatorSlugs = new Set<string>(creators.map((item) => item.slug));
  const styleSlugs = new Set(travelStyles.map((style) => style.slug));
  const tagSlugs = new Set(filterTags.map((tag) => tag.slug));

  const assertReferences = (
    owner: string,
    references: readonly string[],
    known: ReadonlySet<string>,
    relation: string,
  ) => {
    assert.equal(new Set(references).size, references.length, `${owner}.${relation}`);
    for (const reference of references) {
      assert.notEqual(reference, owner, `${owner}.${relation} must not reference itself`);
      assert.ok(known.has(reference), `${owner}.${relation} has unknown ${reference}`);
    }
  };

  discoverables.forEach((item) => {
    assertReferences(item.slug, item.relatedSlugs, discoverableSlugs, "relatedSlugs");
    assertReferences(item.slug, item.travelStyleSlugs, styleSlugs, "travelStyleSlugs");
    assertReferences(item.slug, item.tagSlugs, tagSlugs, "tagSlugs");

    if (item.kind === "journey") {
      assertReferences(item.slug, item.routePlaceSlugs, placeSlugs, "routePlaceSlugs");
    }

    if (item.kind === "opportunity") {
      assert.ok(creatorSlugs.has(item.organiserSlug), `${item.slug}.organiserSlug`);
    }
  });

  travelStyles.forEach((style) => {
    assertReferences(style.slug, style.relatedSlugs, discoverableSlugs, "relatedSlugs");
    assertReferences(style.slug, style.tagSlugs, tagSlugs, "tagSlugs");
  });
});

test("visible content does not contain en dash or em dash characters", () => {
  const serialized = JSON.stringify(seedContent);
  assert.equal(/[\u2013\u2014]/u.test(serialized), false);
});

test("concepts and demo profiles never imply live external availability", () => {
  const allowedOpportunitySources = new Set(["veya-concept", "partner-call"]);

  opportunities.forEach((item) => {
    assert.notEqual(item.status, "published");
    assert.equal(item.availability.state, item.status);
    assert.ok(allowedOpportunitySources.has(item.source.type));
    assert.ok(item.actions.every((action) => action.external === false));
  });

  journeys.forEach((item) => {
    assert.notEqual(item.status, "published");
    assert.ok(item.source.type === "veya-concept");
  });

  people.forEach((item) => {
    assert.equal(item.profileMode, "demo");
    assert.equal(item.source.type, "demo");
    assert.equal(item.socialLinks.length, 0);
  });
});

test("seed uses only approved workspace assets", () => {
  const approvedAssets = new Set([
    "/assets/veya-world.png",
    "/assets/albania-coast-road.jpg",
    "/assets/community-hero.jpg",
    "/assets/community-table.png",
  ]);

  discoverables.forEach((item) => assert.ok(approvedAssets.has(item.media.src)));
  travelStyles.forEach((style) => assert.ok(approvedAssets.has(style.media.src)));
});

test("medical travel is not a discovery category or title", () => {
  const visibleTitles = [
    ...discoverables.flatMap((item) => [item.title.en, item.title.ru]),
    ...travelStyles.flatMap((style) => [style.title.en, style.title.ru]),
  ].join(" ");

  assert.doesNotMatch(visibleTitles, /medical travel|medical tourism|медицинский туризм/iu);
  assert.ok(discoverables.every((item) => !item.tagSlugs.includes("medical")));
});

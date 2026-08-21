const header = document.querySelector("[data-header]");
const navToggle = document.querySelector("[data-nav-toggle]");
const nav = document.querySelector("[data-nav]");
const requestForm = document.querySelector("[data-request-form]");
const formStatus = document.querySelector("[data-form-status]");
const submitButton = document.querySelector("[data-submit-button]");
const languageButtons = document.querySelectorAll("[data-lang-switch]");
const offerFilterButtons = document.querySelectorAll("[data-offer-filter]");
const offerCards = document.querySelectorAll("[data-offer-category]");
const roleSelect = document.querySelector("[data-role-select]");
const metaDescription = document.querySelector('meta[name="description"]');
const metaOgTitle = document.querySelector('meta[property="og:title"]');
const metaOgDescription = document.querySelector('meta[property="og:description"]');

const FORM_ENDPOINT = "/api/submit";

// Canonical interest vocabulary. These keys are shared by the discovery
// links, journey filters, interest checkboxes and journey card categories.
// Do not introduce new interest values without updating this list and the
// matching labels in both languages.
const INTEREST_KEYS = ["nature", "retreat", "food", "community", "stays", "remote", "active", "care"];

const pageMeta = {
  ru: {
    title: "AC Travel | Авторские путешествия и сообщество",
    description: "Авторские путешествия, необычные дома, ретриты, экопоселения и небольшие группы близких по духу людей — с понятными ценами и личной поддержкой.",
    ogTitle: "AC Travel — особенные места и хорошие люди",
    ogDescription: "Природа, локальная еда, необычные места и настоящее сообщество путешественников.",
  },
  en: {
    title: "AC Travel | Curated Journeys & Travel Community",
    description: "Curated journeys, uncommon stays, retreats, ecovillages and small groups of like-minded people—with clear prices and personal support.",
    ogTitle: "AC Travel — special places and good people",
    ogDescription: "Nature, local food, uncommon stays and a real community of travelers.",
  },
};

const english = {
  skipLink: "Skip to content",
  brandAria: "AC Travel home",
  brandTag: "journeys & community",
  navAria: "Main navigation",
  navExperiences: "Ways to travel",
  navJourneys: "Journeys",
  navCommunity: "Community",
  navHow: "How it works",
  languageAria: "Language selection",
  menuAria: "Open menu",
  headerCta: "Find my journey",
  heroEyebrow: "Curated journeys · uncommon stays · real community",
  heroTitleOne: "Special places.",
  heroTitleTwo: "Good people.",
  heroText: "Discover nature-rich routes, retreat centers, ecovillages, local homes and remote places. We bring together small groups of like-minded people and take care of the organization.",
  heroPrimary: "Explore journeys",
  heroSecondary: "Join the community",
  proofAria: "Our principles",
  proofOne: "Small groups",
  proofTwo: "Clear, fair pricing",
  proofThree: "Handpicked places and hosts",
  proofFour: "Support before and during travel",
  discoveryTitle: "What do you want to experience?",
  interestNature: "Nature and remote places",
  interestRetreat: "Retreats and healthy living",
  interestFood: "Food and local culture",
  interestPeople: "Interesting people",
  interestStays: "Uncommon homes",
  interestRemote: "Live and work remotely",
  manifestoLabel: "our approach",
  manifestoEyebrow: "More than a hotel and a beach",
  manifestoTitle: "Travel means feeling a place and finding your people.",
  manifestoText: "We collect places worth staying in, food worth sharing and experiences that naturally bring people together. Some journeys are active, others help you slow down—but none are built like a tourist conveyor belt.",
  manifestoNote: "Albania remains our first destination. Next come the Balkans, the Mediterranean and other regions with powerful nature, living communities and an honest rhythm of life.",
  pillarOneTitle: "Beyond the obvious",
  pillarOneText: "Mountains, coastlines, small towns, villages and remote areas outside the standard route.",
  pillarTwoTitle: "Stays with character",
  pillarTwoText: "Homes, retreat centers, ecovillages, farms and independent local hotels.",
  pillarThreeTitle: "A healthy rhythm",
  pillarThreeText: "Fresh food, movement, nature, proper rest and space to simply breathe.",
  pillarFourTitle: "People going your way",
  pillarFourText: "Small groups shaped around shared interests, with introductions before departure—without forced networking.",
  experiencesLabel: "formats",
  experiencesEyebrow: "Choose a feeling, not just a country",
  experiencesTitle: "Different ways to travel well.",
  experiencesText: "Each format can become its own journey, part of a longer route or a special offer from the host of a place.",
  experienceOneTag: "Nature / Active",
  experienceOneTitle: "Nature and remote places",
  experienceOneText: "Mountains, water, forests, quiet regions and days in motion.",
  experienceTwoTag: "Retreat / Wellbeing",
  experienceTwoTitle: "Retreats and healthy living",
  experienceTwoText: "Restoration, practices, silence, movement and time without overload.",
  experienceThreeTag: "Food / Local life",
  experienceThreeTitle: "Food and local life",
  experienceThreeText: "Markets, farms, local kitchens, shared tables and regional traditions.",
  experienceFourTag: "Eco / Remote",
  experienceFourTitle: "Ecovillages and remote living",
  experienceFourText: "Purposeful places, a natural rhythm and the option to stay longer.",
  experienceFiveTag: "People / Community",
  experienceFiveTitle: "Interest-led journeys",
  experienceFiveText: "Small groups for genuine conversation, useful connections and shared experience.",
  experienceSixTag: "Health / Care",
  experienceSixTitle: "Health and care",
  experienceSixText: "Carefully coordinated travel around treatment or recovery.",
  journeysLabel: "journeys in development",
  journeysEyebrow: "Real journeys · clear offers",
  journeysTitle: "Where we can begin.",
  journeysText: "We are now bringing together the first groups and partner places. The ideas are honestly marked as in development—without invented dates, prices or promises.",
  filterAria: "Journey filter",
  filterAll: "All",
  filterNature: "Nature",
  filterWellbeing: "Retreats",
  filterCommunity: "Community",
  filterRemote: "Longer stays",
  statusPlanning: "Building the interest list",
  statusHosts: "Seeking a place partner",
  statusConcept: "Shaping the concept",
  offerOneLocation: "Albania · coast and mountains",
  offerOneTitle: "Roads, villages and shared tables",
  offerOneText: "A relaxed route through nature and southern Albania, staying in small family-run places instead of one resort hotel.",
  factDuration: "Duration",
  factGroup: "Group",
  factStay: "Stay",
  factPace: "Pace",
  factFood: "Food",
  factWifi: "Internet",
  offerOneDuration: "7–9 days",
  offerOneGroup: "6–10 people",
  offerOneStay: "Homes + guesthouses",
  offerOnePace: "Active, not rushed",
  priceLabel: "Price",
  pricePending: "after host confirmation",
  priceShared: "transparent shared budget",
  joinList: "Join the interest list",
  offerTwoLocation: "Balkans · nature",
  offerTwoTitle: "A week of healthy rhythm",
  offerTwoText: "Fresh food, walks, movement, good sleep and conversation—without promises of a miraculous reset.",
  offerTwoDuration: "5–7 days",
  offerTwoGroup: "8–14 people",
  offerTwoStay: "Retreat center",
  offerTwoFood: "Seasonal menu",
  offerThreeLocation: "Mediterranean · flexible region",
  offerThreeTitle: "A home for living and working",
  offerThreeText: "A beautiful home in nature for people who need focus, reliable internet and a new circle around them.",
  offerThreeDuration: "2–4 weeks",
  offerThreeGroup: "6–12 people",
  offerThreeStay: "Home / ecovillage",
  offerThreeWifi: "Verified in advance",
  standardEyebrow: "Every offer follows one standard",
  standardTitle: "Everything important—before booking.",
  standardOne: "Exact dates and availability",
  standardTwo: "Per-person price and currency",
  standardThree: "What is included and excluded",
  standardFour: "Host or journey leader",
  standardFive: "Stay, rooms and food",
  standardSix: "Pace, difficulty and transport",
  standardSeven: "Group language and internet",
  standardEight: "Payment and cancellation terms",
  stayLabel: "places",
  stayEyebrow: "The stay is part of the journey",
  stayTitle: "Not just a room. A place with character.",
  stayText: "We look beyond a rating and a beautiful room. What matters is who welcomes you, what surrounds the place, how it lives and whether it fits the group.",
  stayCta: "Tell us where you would like to stay",
  stayOne: "Retreat centers",
  stayOneText: "Silence, space and a program with a clear purpose.",
  stayTwo: "Ecovillages",
  stayTwoText: "Living communities and practical experience of another rhythm.",
  stayThree: "Homes and villas",
  stayThreeText: "Shared space for a small group or family.",
  stayFour: "Farms and guesthouses",
  stayFourText: "Local life, local produce and direct contact with hosts.",
  stayFive: "Nature cabins",
  stayFiveText: "Forest, mountains, water and very little city noise.",
  staySix: "Small hotels",
  staySixText: "Independent places with genuinely human service.",
  wellbeingLabel: "healthy life",
  wellbeingEyebrow: "Healthy days, naturally",
  wellbeingTitle: "Come home with energy—not feeling like you need another holiday.",
  wellbeingText: "Good travel leaves room for seasonal food, movement, sleep, nature and calm conversation. Every offer explains the meals, activities and conditions clearly—without exaggerated wellness promises.",
  rhythmOne: "Eat well",
  rhythmTwo: "Move naturally",
  rhythmThree: "Rest properly",
  rhythmFour: "Spend time outdoors",
  rhythmFive: "Learn from local people",
  communityLabel: "people",
  communityEyebrow: "Come for the place. Leave with new connections.",
  communityTitle: "We do more than fill available seats.",
  communityText: "We connect travelers with compatible interests, pace and expectations. Meet the group before departure, connect with local hosts during the journey and stay part of the circle afterward.",
  communityStepOne: "Tell us about yourself",
  communityStepOneText: "Interests, pace, budget and the people you hope to meet.",
  communityStepTwo: "Receive relevant ideas",
  communityStepTwoText: "Only suitable journeys and special offers.",
  communityStepThree: "Meet before departure",
  communityStepThreeText: "A short group call and clear expectations.",
  communityStepFour: "Travel and stay connected",
  communityStepFourText: "The shared experience becomes a beginning, not the end of the connection.",
  howLabel: "support",
  howEyebrow: "We stay one step ahead",
  howTitle: "From the first idea to the journey home.",
  howText: "You describe the feeling you want. We compare options, clarify the price, coordinate hosts, stays and routes, introduce the group and remain available.",
  processOne: "Listen",
  processOneText: "Interests, people, budget and constraints.",
  processTwo: "Match",
  processTwoText: "Route, place, hosts and group format.",
  processThree: "Verify",
  processThreeText: "Price, food, conditions, transfers and details.",
  processFour: "Connect",
  processFourText: "The group knows who is going and why.",
  processFive: "Support",
  processFiveText: "Before, during and after the journey.",
  faqOneQ: "Why are exact prices not shown yet?",
  faqOneA: "An exact price appears only after the dates, hosts, group size and every inclusion are confirmed. Until then, we show an idea as an idea instead of disguising it as a finished tour.",
  faqTwoQ: "Can I travel solo?",
  faqTwoA: "Yes. The community is especially useful for solo travelers: we explain the group format and introduce participants before departure.",
  faqThreeQ: "Are these group journeys only?",
  faqThreeA: "No. Options can include small groups, private routes, family journeys and longer shared stays. Each offer will state its format clearly.",
  faqFourQ: "What happens to the dental travel direction?",
  faqFourA: "It remains a dedicated Health & Care format rather than the subject of the whole project. Medical decisions stay between the traveler and the clinic; we coordinate the travel and practical details.",
  hostEyebrow: "For hosts and makers",
  hostTitle: "Do you have a place people should know about?",
  hostText: "We are looking for welcoming homes, retreat centers, ecovillages, farms, local kitchens, guides and nature-based experiences. We help shape a strong place into a clear offer and introduce it to the right people.",
  hostCta: "Share your place",
  profileLabel: "next step",
  profileEyebrow: "Your travel profile",
  profileTitle: "What kind of journey fits you?",
  profileText: "Tell us about the places, people, pace and budget you prefer. We will save your profile and write when a suitable offer appears or the right group starts forming.",
  profilePromiseOne: "No spam or random tours",
  profilePromiseTwo: "Flexible dates are welcome",
  profilePromiseThree: "The request is not a booking",
  formAbout: "About you",
  roleLabel: "I want to",
  roleTraveler: "find a journey and people",
  rolePrivate: "build a private route",
  roleHost: "share my place or experience",
  roleCare: "ask about a Health & Care journey",
  firstName: "First name",
  lastName: "Last name",
  whatsappLabel: "WhatsApp / phone",
  formJourney: "The journey",
  formInterests: "What interests you",
  choiceNature: "Nature",
  choiceRetreat: "Retreat",
  choiceFood: "Food",
  choicePeople: "People",
  choiceStays: "Special stays",
  choiceRemote: "Remote life",
  choiceActive: "Activities",
  choiceCare: "Health & Care",
  destinationsLabel: "Places or regions you are interested in",
  destinationsPlaceholder: "For example: Balkans, mountains, warm sea or open to anything",
  departureLabel: "Date from",
  returnLabel: "Date to",
  travelersLabel: "Travelers",
  budgetLabel: "Budget / person",
  budgetOpen: "open for now",
  groupLabel: "Format",
  groupSmall: "small group",
  groupPrivate: "private journey",
  groupEither: "either works",
  formRhythm: "Rhythm and people",
  stayTypesLabel: "Where you would like to stay",
  stayChoiceRetreat: "Retreat center",
  stayChoiceEco: "Ecovillage",
  stayChoiceHouse: "Home / villa",
  stayChoiceGuest: "Guesthouse",
  activityLabel: "Activity level",
  activitySlow: "slow",
  activityBalanced: "balanced",
  activityActive: "active",
  wifiLabel: "Internet for work",
  wifiNo: "not important",
  wifiUseful: "useful",
  wifiRequired: "required",
  foodLabel: "Food and dietary needs",
  foodPlaceholder: "Vegetarian, allergies, no restrictions...",
  peopleLabel: "Who or what interests you hope to meet",
  peoplePlaceholder: "For example: founders, creative people, hikers, families...",
  commentsLabel: "Anything else that matters",
  commentsPlaceholder: "Tell us about your pace, place, journey idea or project.",
  consentText: "I agree to the processing of the data in this request so we can reply and send relevant offers.",
  privacyNote: "Your request is saved in our requests sheet and used only to contact you about it. We do not collect medical documents.",
  submitButton: "Create my travel profile",
  footerStatement: "Special places, a healthy rhythm and people you will want to keep traveling with.",
  footerContact: "Send a request",
  footerNote: "Curated journeys & travel community",
};

const messages = {
  ru: {
    sending: "Отправляем вашу заявку...",
    success: "Спасибо. Заявка отправлена — мы свяжемся с вами, когда появится подходящий формат.",
    error: "Не удалось отправить заявку. Данные формы сохранены — проверьте соединение и попробуйте ещё раз.",
  },
  en: {
    sending: "Sending your request...",
    success: "Thank you. Your request has been sent—we will contact you when a suitable format appears.",
    error: "We could not send your request. Your form entries are kept—check your connection and try again.",
  },
};

const originalText = new Map();
const originalPlaceholders = new Map();
const originalAria = new Map();

document.querySelectorAll("[data-i18n]").forEach((element) => {
  originalText.set(element, element.textContent);
});

document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
  originalPlaceholders.set(element, element.getAttribute("placeholder") || "");
});

document.querySelectorAll("[data-i18n-aria]").forEach((element) => {
  originalAria.set(element, element.getAttribute("aria-label") || "");
});

let currentLanguage = localStorage.getItem("siteLanguage") === "en" ? "en" : "ru";

function getMenuLabel(isOpen) {
  if (currentLanguage === "en") {
    return isOpen ? "Close menu" : "Open menu";
  }

  return isOpen ? "Закрыть меню" : "Открыть меню";
}

function translatePage(language) {
  currentLanguage = language === "en" ? "en" : "ru";
  const useEnglish = currentLanguage === "en";
  const meta = pageMeta[currentLanguage];

  document.documentElement.lang = currentLanguage;
  document.title = meta.title;
  metaDescription?.setAttribute("content", meta.description);
  metaOgTitle?.setAttribute("content", meta.ogTitle);
  metaOgDescription?.setAttribute("content", meta.ogDescription);

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    const translated = useEnglish ? english[key] : originalText.get(element);
    if (typeof translated === "string") {
      element.textContent = translated;
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    const key = element.dataset.i18nPlaceholder;
    const translated = useEnglish ? english[key] : originalPlaceholders.get(element);
    if (typeof translated === "string") {
      element.setAttribute("placeholder", translated);
    }
  });

  document.querySelectorAll("[data-i18n-aria]").forEach((element) => {
    const key = element.dataset.i18nAria;
    const translated = useEnglish ? english[key] : originalAria.get(element);
    if (typeof translated === "string") {
      element.setAttribute("aria-label", translated);
    }
  });

  languageButtons.forEach((button) => {
    const isActive = button.dataset.langSwitch === currentLanguage;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  navToggle.setAttribute("aria-label", getMenuLabel(nav.classList.contains("is-open")));
  formStatus.textContent = "";
  localStorage.setItem("siteLanguage", currentLanguage);
}

function updateHeader() {
  header.classList.toggle("is-scrolled", window.scrollY > 24);
}

function closeMenu() {
  nav.classList.remove("is-open");
  header.classList.remove("nav-active");
  document.body.classList.remove("nav-open");
  navToggle.setAttribute("aria-expanded", "false");
  navToggle.setAttribute("aria-label", getMenuLabel(false));
}

function setFormStatus(message, type = "info") {
  formStatus.textContent = message;
  formStatus.classList.toggle("is-error", type === "error");
  formStatus.classList.toggle("is-success", type === "success");
}

function getValues(data, name) {
  return data.getAll(name).filter(Boolean).join(", ");
}

function buildProfileNotes(data) {
  const profileLines = [
    `Interests: ${getValues(data, "interests") || "—"}`,
    `Destinations: ${data.get("destinations") || "—"}`,
    `Budget: ${data.get("budget") || "—"}`,
    `Group style: ${data.get("groupStyle") || "—"}`,
    `Stay types: ${getValues(data, "stayTypes") || "—"}`,
    `Activity: ${data.get("activity") || "—"}`,
    `Wi-Fi: ${data.get("wifi") || "—"}`,
    `Food needs: ${data.get("foodNeeds") || "—"}`,
    `People to meet: ${data.get("peopleToMeet") || "—"}`,
    `Notes: ${data.get("comments") || "—"}`,
  ];

  return profileLines.join("\n");
}

function buildRequestPayload(data) {
  return {
    submittedAt: new Date().toISOString(),
    source: "AC Travel Website",
    language: currentLanguage,
    firstName: data.get("firstName") || "",
    lastName: data.get("lastName") || "",
    whatsapp: data.get("whatsapp") || "",
    email: data.get("email") || "",
    service: data.get("service") || "traveler",
    departure: data.get("departure") || "",
    returnDate: data.get("returnDate") || "",
    travelers: data.get("travelers") || "",
    comments: buildProfileNotes(data),
    contactConsent: data.get("contactConsent") === "on",
  };
}

window.addEventListener("scroll", updateHeader, { passive: true });
updateHeader();

languageButtons.forEach((button) => {
  button.addEventListener("click", () => translatePage(button.dataset.langSwitch));
});

navToggle.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("is-open");
  header.classList.toggle("nav-active", isOpen);
  document.body.classList.toggle("nav-open", isOpen);
  navToggle.setAttribute("aria-expanded", String(isOpen));
  navToggle.setAttribute("aria-label", getMenuLabel(isOpen));
});

nav.addEventListener("click", (event) => {
  if (event.target.matches("a")) {
    closeMenu();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeMenu();
  }
});

document.querySelectorAll(".faq-list").forEach((list) => {
  list.addEventListener("toggle", (event) => {
    if (event.target.tagName !== "DETAILS" || !event.target.open) {
      return;
    }

    list.querySelectorAll("details").forEach((details) => {
      if (details !== event.target) {
        details.removeAttribute("open");
      }
    });
  }, true);
});

offerFilterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.offerFilter;
    offerFilterButtons.forEach((item) => item.classList.toggle("is-active", item === button));
    offerCards.forEach((card) => {
      const categories = card.dataset.offerCategory.split(" ");
      card.classList.toggle("is-hidden", filter !== "all" && !categories.includes(filter));
    });
  });
});

document.querySelectorAll("[data-prefill-interest]").forEach((link) => {
  link.addEventListener("click", () => {
    const value = link.dataset.prefillInterest;
    if (!INTEREST_KEYS.includes(value)) {
      return;
    }
    const checkbox = requestForm.querySelector(`input[name="interests"][value="${value}"]`);
    if (checkbox) {
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
});

document.querySelectorAll("[data-prefill-role]").forEach((link) => {
  link.addEventListener("click", () => {
    roleSelect.value = link.dataset.prefillRole;
    roleSelect.dispatchEvent(new Event("change", { bubbles: true }));
  });
});

requestForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const dictionary = messages[currentLanguage];

  submitButton.disabled = true;
  setFormStatus(dictionary.sending);

  try {
    const data = new FormData(requestForm);
    const payload = buildRequestPayload(data);
    const response = await fetch(FORM_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("REQUEST_FAILED");
    }

    const result = await response.json();
    if (result.status !== "success") {
      throw new Error("REQUEST_FAILED");
    }

    setFormStatus(dictionary.success, "success");
    requestForm.reset();
  } catch (error) {
    setFormStatus(dictionary.error, "error");
  } finally {
    submitButton.disabled = false;
  }
});

document.querySelectorAll("[data-current-year]").forEach((element) => {
  element.textContent = String(new Date().getFullYear());
});

translatePage(currentLanguage);

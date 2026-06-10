const header = document.querySelector("[data-header]");
const navToggle = document.querySelector("[data-nav-toggle]");
const nav = document.querySelector("[data-nav]");
const serviceSelect = document.querySelector("#serviceSelect");
const requestForm = document.querySelector("[data-request-form]");
const formStatus = document.querySelector("[data-form-status]");
const submitButton = document.querySelector("[data-submit-button]");
const languageButtons = document.querySelectorAll("[data-lang-switch]");
const metaDescription = document.querySelector('meta[name="description"]');

const GOOGLE_SHEETS_ENDPOINT = "https://script.google.com/macros/s/AKfycbyq-0h9g672pb-rTpHDsW45f5eQIsQfXidIauKjHd0TVD8-g7VSz_pbBj_cuSXTLznajA/exec";
const MAX_UPLOAD_SIZE = 8 * 1024 * 1024;

const priceData = {
  cleaning: { prague: 90, albania: 45 },
  filling: { prague: 160, albania: 75 },
  root: { prague: 430, albania: 190 },
  crown: { prague: 720, albania: 260 },
  implant: { prague: 1450, albania: 620 },
  restoration: { prague: 14500, albania: 6200 },
};

const translations = {
  ru: {
    metaTitle: "AlbaniaCare Travel | Албания из Праги: путешествия и стоматология",
    metaDescription: "Авторские поездки по Албании и стоматологический туризм из Праги: маршруты, клиники, трансферы, жилье и поддержка на каждом этапе.",
    brandAria: "AlbaniaCare Travel на главную",
    languageAria: "Выбор языка",
    menuAria: "Открыть меню",
    navRoad: "Путешествия",
    navDental: "Стоматология",
    navDates: "Даты",
    navContact: "Контакты",
    heroEyebrow: "Из Праги в Албанию",
    heroTitle: "Албания по-другому",
    heroText: "Авторские поездки и стоматологический туризм из Праги с понятной организацией, поддержкой и маршрутом без лишнего стресса.",
    heroRoadCta: "Посмотреть маршруты",
    heroDentalCta: "Узнать про лечение",
    introEyebrow: "Один сайт, два понятных направления",
    introTitle: "Можно ехать за впечатлениями. Можно совместить отдых с лечением.",
    introRoadText: "Небольшие группы, красивые дороги, море, горы, юг Албании и места, куда редко доезжают обычные туристы.",
    introDentalText: "Предварительный план лечения, расчет стоимости, подбор дат и помощь с логистикой из Праги.",
    roadTitle: "Небольшие road trip-поездки по самым красивым местам Албании",
    roadText: "Едем небольшой компанией: комфортный транспорт, продуманный маршрут, локальные подсказки и достаточно свободы, чтобы поездка не ощущалась как экскурсионный конвейер.",
    roadCta: "Хочу такой маршрут",
    roadPreviewAria: "Превью маршрута по побережью Албании",
    roadImageAlt: "Дорога вдоль албанского побережья и бирюзовое море",
    roadOverlayTitle: "Маршрут вдоль побережья",
    roadOverlayText: "Влёра, Саранда, Ксамил и пляжи без толп",
    whyTitle: "Почему Албания",
    why1: "Очень чистое море и сильная береговая линия",
    why2: "Цены заметно мягче, чем в популярных курортных странах",
    why3: "Спокойное направление для пары, друзей или семьи",
    why4: "Живая местная культура без ощущения декораций",
    why5: "Горы, бухты и красивые дороги в одной поездке",
    why6: "Удобная логистика из Праги",
    transportTitle: "Транспорт и поддержка",
    transport1: "Встреча в аэропорту",
    transport2: "Комфортный автомобиль по маршруту",
    transport3: "Переезды между городами и пляжами",
    transport4: "Помощь на связи во время поездки",
    tripTypesEyebrow: "Форматы поездок",
    tripTypesTitle: "Выберите стиль маршрута",
    trip1Title: "Юг Албании",
    trip1Text: "Влёра • Саранда • Ксамил • Голубой глаз",
    trip2Title: "Побережье и пляжи",
    trip2Text: "Лучшие бухты, виды и локации без случайного маршрута",
    trip3Title: "Культура и природа",
    trip3Text: "UNESCO-города, горные виды и традиционные деревни",
    trip4Title: "Индивидуальная поездка",
    trip4Text: "Маршрут под ваши даты, темп и интересы",
    itineraryEyebrow: "Пример маршрута",
    itineraryTitle: "Семь дней по южному побережью",
    itineraryText: "Это пример спокойного маршрута: море, природные точки, переезды без гонки и время просто побыть на месте. Для частной группы программу можно адаптировать.",
    day1: "День 1",
    day1Text: "Прилет, трансфер и заселение",
    day2: "День 2",
    day2Text: "Влёра и дорога вдоль моря",
    day3: "День 3",
    day3Text: "Скрытые пляжи и видовые точки",
    day4: "День 4",
    day4Text: "Голубой глаз",
    day5: "День 5",
    day5Text: "Саранда",
    day6: "День 6",
    day6Text: "Ксамил",
    day7: "День 7",
    day7Text: "Возвращение",
    accommodationAlt: "Вид на албанское побережье для блока размещения",
    accommodationEyebrow: "Размещение",
    accommodationTitle: "Подбираем жилье под формат поездки",
    stay1: "Апартаменты",
    stay2: "Отели",
    stay3: "Виллы",
    stay4: "Варианты для семьи",
    galleryAria: "Галерея road trip-поездок",
    gallery: "Галерея",
    roadFaqEyebrow: "FAQ по поездкам",
    roadFaqTitle: "Что важно знать до выезда",
    roadFaq1Q: "Что входит в поездку?",
    roadFaq1A: "Маршрут, транспорт, помощь с размещением и сопровождение по программе зависят от выбранного формата. Перед оплатой вы получаете понятный список того, что включено.",
    roadFaq2Q: "Сколько человек в группе?",
    roadFaq2A: "Формат рассчитан на небольшие группы, чтобы поездка оставалась гибкой, спокойной и не превращалась в автобусный тур.",
    roadFaq3Q: "Можно ехать с семьей?",
    roadFaq3A: "Да. Можно заранее подобрать семейное размещение, удобный темп переездов и активности без перегруза.",
    roadFaq4Q: "Можно выбрать свои даты?",
    roadFaq4A: "Да. Для частной поездки маршрут можно собрать вокруг ваших дат вылета и возвращения.",
    roadFaq5Q: "Через какой аэропорт летим?",
    roadFaq5A: "Обычно маршрут строится под вылет из Праги и прилет в Албанию, а трансфер на месте планируется заранее.",
    roadFaq6Q: "Нужна ли страховка?",
    roadFaq6A: "Да, туристическую страховку лучше оформить до выезда. Это простая вещь, которая сильно снижает риски в дороге.",
    dentalTitle: "Совместите отдых на море с профессиональным лечением зубов",
    dentalText: "Получите предварительный план и понятную смету до поездки, а свободное время проведите на албанском побережье.",
    dentalCta: "Получить расчет лечения",
    dentalImageAlt: "Современная стоматологическая клиника с панорамным снимком",
    howEyebrow: "Как это работает",
    howTitle: "От снимка до дат поездки",
    step1: "Отправляете панорамный снимок",
    step2: "Получаете план лечения",
    step3: "Видите предварительную стоимость",
    step4: "Выбираете удобные даты",
    step5: "Летите на лечение и отдых",
    servicesEyebrow: "Стоматологические услуги",
    servicesTitle: "Популярные направления лечения",
    serviceCleaning: "Чистка",
    serviceFillings: "Пломбы",
    serviceRoot: "Лечение каналов",
    serviceCrowns: "Коронки",
    serviceImplants: "Импланты",
    serviceRestoration: "Полная реставрация",
    clinicEyebrow: "О клинике",
    clinicTitle: "Что проверяем заранее",
    clinic1: "Оборудование",
    clinic2: "Сертификации",
    clinic3: "Врачи",
    clinic4: "Гарантии",
    clinic5: "Материалы",
    priceEyebrow: "Сравнение цен",
    priceTitle: "Прага vs Албания",
    priceText: "Выберите услугу, чтобы увидеть ориентировочную разницу. Точный план и стоимость подтверждаются только после оценки снимков и консультации врача.",
    treatmentLabel: "Лечение",
    priceCleaning: "Чистка",
    priceFilling: "Пломба",
    priceRoot: "Лечение каналов",
    priceCrown: "Коронка",
    priceImplant: "Имплант",
    priceRestoration: "Полная реставрация",
    pragueEstimate: "Ориентир в Праге",
    albaniaEstimate: "Ориентир в Албании",
    savingEstimate: "Возможная экономия",
    journeyEyebrow: "Путь пациента",
    journeyTitle: "Понятный процесс от прилета до возвращения домой",
    journey1: "Прилет",
    journey2: "Консультация",
    journey3: "Лечение",
    journey4: "Восстановление",
    journey5: "Отдых",
    journey6: "Возвращение",
    testimonialVideo: "Видео",
    testimonial1Title: "История пациента",
    testimonial1Text: "Сюда можно добавить короткие видеоотзывы, когда первые кейсы будут согласованы для публикации.",
    testimonialReviews: "Отзывы",
    testimonial2Title: "Проверенная обратная связь",
    testimonial2Text: "Блок подойдет для отзывов из Google, WhatsApp или прямых сообщений клиентов.",
    testimonialBefore: "До/после",
    testimonial3Title: "Результаты лечения",
    testimonial3Text: "Фото до/после стоит публиковать только с письменного согласия пациента.",
    dentalFaqEyebrow: "FAQ по стоматологии",
    dentalFaqTitle: "Частые вопросы перед лечением",
    dentalFaq1Q: "Это безопасно?",
    dentalFaq1A: "Перед поездкой важно проверить стандарты клиники, квалификацию врачей, материалы и условия гарантии. Решение о лечении принимает пациент после консультации.",
    dentalFaq2Q: "Сколько длится лечение?",
    dentalFaq2A: "Простые процедуры могут занять один визит, а имплантация или полная реставрация часто требуют этапов и отдельных сроков.",
    dentalFaq3Q: "Нужны ли снимки?",
    dentalFaq3A: "Панорамный снимок помогает врачу подготовить предварительный план и понять реальный объем работы.",
    dentalFaq4Q: "Можно ли путешествовать после лечения?",
    dentalFaq4A: "Это зависит от процедуры. Безопасный график перелета, отдыха и восстановления подтверждает врач.",
    dentalFaq5Q: "Какие есть гарантии?",
    dentalFaq5A: "Гарантии зависят от вида лечения, материалов и политики клиники. Их нужно получить в письменном виде до начала лечения.",
    dentalFaq6Q: "Сколько можно сэкономить?",
    dentalFaq6A: "Разница зависит от процедуры. Чем больше объем лечения, тем заметнее обычно становится экономия.",
    requestEyebrow: "Заявка на даты",
    requestTitle: "Выберите удобные даты поездки",
    requestText: "Оставьте контакты, направление и желаемые даты. Позже эту форму можно подключить к календарю заявок и системе бронирования.",
    firstName: "Имя",
    lastName: "Фамилия",
    whatsappLabel: "WhatsApp",
    serviceLabel: "Направление",
    formRoad: "Путешествие по Албании",
    formDental: "Стоматологический туризм",
    departureLabel: "Вылет из Праги",
    returnLabel: "Возвращение в Прагу",
    travelersLabel: "Количество путешественников",
    uploadScanLabel: "Загрузить снимок зубов",
    uploadXrayLabel: "Загрузить панорамный снимок",
    commentsLabel: "Комментарий",
    commentsPlaceholder: "Напишите, что важно: маршрут, снимки зубов, семья, отель, бюджет или темп поездки.",
    submitButton: "Отправить заявку",
    sendingStatus: "Отправляем заявку...",
    successStatus: "Спасибо, заявка отправлена. Мы скоро свяжемся с вами в WhatsApp.",
    integrationMissingStatus: "Интеграция с Google Sheets еще не подключена. Добавьте URL Google Apps Script в script.js.",
    uploadTooLargeStatus: "Файл слишком большой. Максимальный размер одного файла — 8 MB.",
    submitErrorStatus: "Не удалось отправить заявку. Попробуйте еще раз или напишите нам в WhatsApp.",
    contactEyebrow: "Контакты",
    contactTitle: "Напишите перед бронированием",
    contactText: "Можно начать с короткого сообщения: какое направление интересно, сколько человек едет и какие даты рассматриваете.",
    contactPhone: "Телефон",
    contactForm: "Форма заявки",
    socialMedia: "Социальные сети",
    socialAria: "Социальные сети",
    footerText: "Путешествия и стоматологический туризм из Праги",
  },
  en: {
    metaTitle: "AlbaniaCare Travel | Albania from Prague: Road Trips & Dental Tourism",
    metaDescription: "Private Albania road trips and dental tourism from Prague: routes, clinics, transfers, accommodation and support at every step.",
    brandAria: "AlbaniaCare Travel home",
    languageAria: "Language selection",
    menuAria: "Open menu",
    navRoad: "Road Trips",
    navDental: "Dental Tourism",
    navDates: "Dates",
    navContact: "Contact",
    heroEyebrow: "From Prague to Albania",
    heroTitle: "Discover Albania Differently",
    heroText: "Private road trips and dental tourism from Prague with clear planning, practical support and a route that feels easy from the start.",
    heroRoadCta: "Explore Road Trips",
    heroDentalCta: "Explore Dental Tourism",
    introEyebrow: "One site, two clear directions",
    introTitle: "Travel for the experience. Or combine your holiday with treatment.",
    introRoadText: "Small-group routes through scenic roads, beaches, mountains, southern Albania and places most standard tours miss.",
    introDentalText: "Preliminary treatment plan, price estimate, travel dates and logistics support from Prague.",
    roadTitle: "Small-Group Road Trips Through Albania's Most Beautiful Places",
    roadText: "Travel in a small group with comfortable transport, a thoughtful route, local guidance and enough freedom for the trip to feel personal rather than rushed.",
    roadCta: "Plan My Trip",
    roadPreviewAria: "Albanian coast road trip preview",
    roadImageAlt: "Road along the Albanian coast with turquoise sea",
    roadOverlayTitle: "Coastal Road Route",
    roadOverlayText: "Vlora, Saranda, Ksamil and quiet beaches",
    whyTitle: "Why Albania",
    why1: "Clear sea and a dramatic coastline",
    why2: "Prices are gentler than in many popular resort countries",
    why3: "A calm destination for couples, friends or families",
    why4: "Authentic local culture without a staged-tour feeling",
    why5: "Mountains, bays and beautiful roads in one trip",
    why6: "Convenient logistics from Prague",
    transportTitle: "Transport & Support",
    transport1: "Airport pickup",
    transport2: "Comfortable vehicle on the route",
    transport3: "Transfers between towns and beaches",
    transport4: "Support during the trip",
    tripTypesEyebrow: "Trip formats",
    tripTypesTitle: "Choose your route style",
    trip1Title: "South Albania",
    trip1Text: "Vlora • Saranda • Ksamil • Blue Eye",
    trip2Title: "Coast & Beaches",
    trip2Text: "The best bays, views and locations without guesswork",
    trip3Title: "Culture & Nature",
    trip3Text: "UNESCO towns, mountain views and traditional villages",
    trip4Title: "Private Custom Trip",
    trip4Text: "A route built around your dates, pace and interests",
    itineraryEyebrow: "Example itinerary",
    itineraryTitle: "Seven days along the southern coast",
    itineraryText: "A relaxed sample route with sea time, nature stops, comfortable transfers and space to simply enjoy the place. Private trips can be adjusted.",
    day1: "Day 1",
    day1Text: "Arrival, transfer and check-in",
    day2: "Day 2",
    day2Text: "Vlora and the coastal road",
    day3: "Day 3",
    day3Text: "Hidden beaches and viewpoints",
    day4: "Day 4",
    day4Text: "Blue Eye",
    day5: "Day 5",
    day5Text: "Saranda",
    day6: "Day 6",
    day6Text: "Ksamil",
    day7: "Day 7",
    day7Text: "Return",
    accommodationAlt: "Albanian coastal view for the accommodation section",
    accommodationEyebrow: "Accommodation",
    accommodationTitle: "Stay options matched to your trip",
    stay1: "Apartments",
    stay2: "Hotels",
    stay3: "Villas",
    stay4: "Family options",
    galleryAria: "Road trip gallery",
    gallery: "Gallery",
    roadFaqEyebrow: "Road trip FAQ",
    roadFaqTitle: "Good to know before you travel",
    roadFaq1Q: "What is included?",
    roadFaq1A: "The route, transport, accommodation support and on-trip guidance depend on the selected format. Before payment, you receive a clear list of what is included.",
    roadFaq2Q: "How many people travel?",
    roadFaq2A: "The format is designed for small groups, so the trip stays flexible, calm and far from a standard bus tour.",
    roadFaq3Q: "Can families join?",
    roadFaq3A: "Yes. Family-friendly accommodation, a comfortable pace and lighter activities can be planned in advance.",
    roadFaq4Q: "Can I choose my dates?",
    roadFaq4A: "Yes. For a private trip, the route can be built around your preferred departure and return dates.",
    roadFaq5Q: "Which airport do we use?",
    roadFaq5A: "Most routes are planned around flights from Prague to Albania, with local transfer arranged in advance.",
    roadFaq6Q: "Do I need insurance?",
    roadFaq6A: "Yes, travel insurance is recommended before departure. It is a simple step that reduces risk on the road.",
    dentalTitle: "Combine a Seaside Holiday with Professional Dental Treatment",
    dentalText: "Receive a preliminary plan and clear estimate before you travel, then spend your free time on the Albanian coast.",
    dentalCta: "Get Treatment Estimate",
    dentalImageAlt: "Modern dental clinic with a panoramic scan display",
    howEyebrow: "How it works",
    howTitle: "From scan to travel dates",
    step1: "Send a panoramic dental scan",
    step2: "Receive a treatment plan",
    step3: "Review the preliminary price",
    step4: "Choose suitable dates",
    step5: "Travel for treatment and holiday",
    servicesEyebrow: "Dental services",
    servicesTitle: "Popular treatment categories",
    serviceCleaning: "Cleaning",
    serviceFillings: "Fillings",
    serviceRoot: "Root canals",
    serviceCrowns: "Crowns",
    serviceImplants: "Implants",
    serviceRestoration: "Full restoration",
    clinicEyebrow: "Clinic information",
    clinicTitle: "What we check in advance",
    clinic1: "Equipment",
    clinic2: "Certifications",
    clinic3: "Doctors",
    clinic4: "Warranty",
    clinic5: "Materials",
    priceEyebrow: "Price comparison",
    priceTitle: "Prague vs Albania",
    priceText: "Choose a service to see the estimated difference. The final treatment plan and price are confirmed only after scan review and dentist consultation.",
    treatmentLabel: "Treatment",
    priceCleaning: "Cleaning",
    priceFilling: "Filling",
    priceRoot: "Root canal",
    priceCrown: "Crown",
    priceImplant: "Implant",
    priceRestoration: "Full restoration",
    pragueEstimate: "Prague estimate",
    albaniaEstimate: "Albania estimate",
    savingEstimate: "Potential saving",
    journeyEyebrow: "Patient journey",
    journeyTitle: "A clear process from arrival to return home",
    journey1: "Arrival",
    journey2: "Consultation",
    journey3: "Treatment",
    journey4: "Recovery",
    journey5: "Holiday",
    journey6: "Return",
    testimonialVideo: "Video",
    testimonial1Title: "Patient story",
    testimonial1Text: "Short video reviews can be added here once the first cases are approved for publication.",
    testimonialReviews: "Reviews",
    testimonial2Title: "Verified feedback",
    testimonial2Text: "This block can hold Google, WhatsApp or direct client review excerpts.",
    testimonialBefore: "Before/After",
    testimonial3Title: "Treatment results",
    testimonial3Text: "Before/after photos should be published only with written patient consent.",
    dentalFaqEyebrow: "Dental FAQ",
    dentalFaqTitle: "Common questions before treatment",
    dentalFaq1Q: "Is it safe?",
    dentalFaq1A: "Before travelling, it is important to check clinic standards, dentist qualifications, materials and warranty terms. The patient decides on treatment after consultation.",
    dentalFaq2Q: "How long does treatment take?",
    dentalFaq2A: "Simple procedures may take one visit, while implants or full restorations often require stages and separate timing.",
    dentalFaq3Q: "Do I need scans?",
    dentalFaq3A: "A panoramic scan helps the dentist prepare a preliminary plan and understand the real treatment scope.",
    dentalFaq4Q: "Can I travel after treatment?",
    dentalFaq4A: "It depends on the procedure. The safe schedule for flights, rest and recovery is confirmed by the dentist.",
    dentalFaq5Q: "What guarantees exist?",
    dentalFaq5A: "Guarantees depend on treatment type, materials and clinic policy. They should be provided in writing before treatment begins.",
    dentalFaq6Q: "How much can I save?",
    dentalFaq6A: "The difference depends on the procedure. Larger treatment plans usually show the most noticeable savings.",
    requestEyebrow: "Travel request",
    requestTitle: "Choose your preferred travel dates",
    requestText: "Leave your contacts, direction and preferred dates. Later, this form can be connected to a request calendar and booking system.",
    firstName: "First Name",
    lastName: "Last Name",
    whatsappLabel: "WhatsApp",
    serviceLabel: "Service",
    formRoad: "Road Trip",
    formDental: "Dental Tourism",
    departureLabel: "Departure from Prague",
    returnLabel: "Return to Prague",
    travelersLabel: "Number of Travelers",
    uploadScanLabel: "Upload Dental Scan",
    uploadXrayLabel: "Upload Panoramic X-ray",
    commentsLabel: "Comments",
    commentsPlaceholder: "Tell us what matters: route, dental scans, family needs, hotel, budget or travel pace.",
    submitButton: "Submit Request",
    sendingStatus: "Sending request...",
    successStatus: "Thank you, your request has been sent. We will contact you on WhatsApp soon.",
    integrationMissingStatus: "Google Sheets integration is not connected yet. Add the Google Apps Script URL in script.js.",
    uploadTooLargeStatus: "The file is too large. Maximum size per file is 8 MB.",
    submitErrorStatus: "Could not send the request. Please try again or message us on WhatsApp.",
    contactEyebrow: "Contact",
    contactTitle: "Message us before booking",
    contactText: "Start with a short message: which direction interests you, how many people are travelling and what dates you are considering.",
    contactPhone: "Phone",
    contactForm: "Request Form",
    socialMedia: "Social Media",
    socialAria: "Social media links",
    footerText: "Road trips and dental tourism from Prague",
  },
};

let currentLanguage = localStorage.getItem("siteLanguage") || "ru";

function formatEuro(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function translatePage(language) {
  const dictionary = translations[language] || translations.ru;
  currentLanguage = language;
  document.documentElement.lang = language;
  document.title = dictionary.metaTitle;
  metaDescription.setAttribute("content", dictionary.metaDescription);

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    if (dictionary[key]) {
      element.textContent = dictionary[key];
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    const key = element.dataset.i18nPlaceholder;
    if (dictionary[key]) {
      element.setAttribute("placeholder", dictionary[key]);
    }
  });

  document.querySelectorAll("[data-i18n-aria]").forEach((element) => {
    const key = element.dataset.i18nAria;
    if (dictionary[key]) {
      element.setAttribute("aria-label", dictionary[key]);
    }
  });

  document.querySelectorAll("[data-i18n-alt]").forEach((element) => {
    const key = element.dataset.i18nAlt;
    if (dictionary[key]) {
      element.setAttribute("alt", dictionary[key]);
    }
  });

  languageButtons.forEach((button) => {
    const isActive = button.dataset.langSwitch === language;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  formStatus.textContent = "";
  localStorage.setItem("siteLanguage", language);
}

function updateHeader() {
  header.classList.toggle("is-scrolled", window.scrollY > 24);
}

function closeMenu() {
  nav.classList.remove("is-open");
  header.classList.remove("nav-active");
  document.body.classList.remove("nav-open");
  navToggle.setAttribute("aria-expanded", "false");
}

function updatePrices() {
  const selected = priceData[serviceSelect.value];
  const saving = selected.prague - selected.albania;
  document.querySelector("[data-prague]").textContent = formatEuro(selected.prague);
  document.querySelector("[data-albania]").textContent = formatEuro(selected.albania);
  document.querySelector("[data-saving]").textContent = formatEuro(saving);
}

function setFormStatus(message, type = "info") {
  formStatus.textContent = message;
  formStatus.classList.toggle("is-error", type === "error");
  formStatus.classList.toggle("is-success", type === "success");
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
}

async function fileToPayload(file) {
  if (!file || file.size === 0) {
    return null;
  }

  if (file.size > MAX_UPLOAD_SIZE) {
    throw new Error("FILE_TOO_LARGE");
  }

  const buffer = await file.arrayBuffer();

  return {
    name: file.name,
    type: file.type || "application/octet-stream",
    size: file.size,
    data: arrayBufferToBase64(buffer),
  };
}

async function buildRequestPayload(data) {
  const dentalScan = await fileToPayload(data.get("dentalScan"));
  const panoramicXray = await fileToPayload(data.get("panoramicXray"));

  return {
    submittedAt: new Date().toISOString(),
    source: "AlbaniaCare Travel",
    language: currentLanguage,
    firstName: data.get("firstName") || "",
    lastName: data.get("lastName") || "",
    whatsapp: data.get("whatsapp") || "",
    email: data.get("email") || "",
    service: data.get("service") || "",
    departure: data.get("departure") || "",
    returnDate: data.get("returnDate") || "",
    travelers: data.get("travelers") || "",
    comments: data.get("comments") || "",
    files: {
      dentalScan,
      panoramicXray,
    },
  };
}

window.addEventListener("scroll", updateHeader, { passive: true });
updateHeader();

languageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    translatePage(button.dataset.langSwitch);
  });
});

navToggle.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("is-open");
  header.classList.toggle("nav-active", isOpen);
  document.body.classList.toggle("nav-open", isOpen);
  navToggle.setAttribute("aria-expanded", String(isOpen));
});

nav.addEventListener("click", (event) => {
  if (event.target.matches("a")) {
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

serviceSelect.addEventListener("change", updatePrices);
updatePrices();
translatePage(currentLanguage);

requestForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const dictionary = translations[currentLanguage] || translations.ru;

  if (!GOOGLE_SHEETS_ENDPOINT) {
    setFormStatus(dictionary.integrationMissingStatus, "error");
    return;
  }

  submitButton.disabled = true;
  setFormStatus(dictionary.sendingStatus);

  try {
    const data = new FormData(requestForm);
    const payload = await buildRequestPayload(data);
    const response = await fetch(GOOGLE_SHEETS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("REQUEST_FAILED");
    }

    const result = await response.json();

    if (result.status !== "success") {
      throw new Error(result.message || "REQUEST_FAILED");
    }

    setFormStatus(dictionary.successStatus, "success");
    requestForm.reset();
  } catch (error) {
    const message = error.message === "FILE_TOO_LARGE"
      ? dictionary.uploadTooLargeStatus
      : dictionary.submitErrorStatus;
    setFormStatus(message, "error");
  } finally {
    submitButton.disabled = false;
  }
});

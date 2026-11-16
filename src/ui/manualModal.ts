import { type Locale, TRANSLATIONS } from "../i18n/translations.ts";
import { createIcon, type IconName } from "./icons.ts";

export type ManualTabId = "quickstart" | "hardware" | "connection" | "quality" | "pwa";

export interface ManualModalController {
  readonly element: HTMLDialogElement;
  open: (initialTab?: ManualTabId) => void;
  close: () => void;
  setLocale: (locale: Locale) => void;
}

function makeTextEl<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = text;
  return node;
}

function makeStepCard(title: string, body: string): HTMLElement {
  const card = document.createElement("article");
  card.className = "manual-step-card";
  card.append(makeTextEl("h3", "", title), makeTextEl("p", "", body));
  return card;
}

function makeCallout(title: string, body: string, isWarn = false): HTMLElement {
  const box = document.createElement("div");
  box.className = isWarn ? "manual-callout is-warn" : "manual-callout";
  box.append(makeTextEl("h3", "", title), makeTextEl("p", "", body));
  return box;
}

export function createManualModal(
  initialLocale: Locale,
  onSelectLocale: (locale: Locale) => void,
): ManualModalController {
  let currentLocale: Locale = initialLocale;
  let activeTab: ManualTabId = "quickstart";

  const dialog = document.createElement("dialog");
  dialog.id = "manual-dialog";
  dialog.className = "manual-dialog";
  dialog.setAttribute("aria-labelledby", "manual-dialog-title");

  const sheet = document.createElement("div");
  sheet.className = "manual-sheet";

  const titleEl = makeTextEl("h2", "manual-title", "");
  titleEl.id = "manual-dialog-title";
  const subtitleEl = makeTextEl("p", "manual-subtitle", "");

  const headerIcon = document.createElement("div");
  headerIcon.className = "manual-header-icon";
  headerIcon.setAttribute("aria-hidden", "true");
  headerIcon.append(createIcon("book", 19));

  const headerTextBox = document.createElement("div");
  headerTextBox.append(titleEl, subtitleEl);

  const headerLeft = document.createElement("div");
  headerLeft.className = "manual-header-left";
  headerLeft.append(headerIcon, headerTextBox);

  const langGroup = document.createElement("div");
  langGroup.className = "segmented segmented-compact";
  langGroup.setAttribute("role", "radiogroup");

  const localeOptions: ReadonlyArray<{ locale: Locale; code: string }> = [
    { locale: "en", code: "EN" },
    { locale: "pt-BR", code: "PT" },
  ];

  const langButtons = localeOptions.map(({ locale, code }) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("role", "radio");
    btn.className = "seg-btn";
    btn.dataset.manualLocale = locale;
    btn.textContent = code;
    btn.addEventListener("click", () => {
      onSelectLocale(locale);
    });
    return btn;
  });
  langGroup.append(...langButtons);

  const closeBtn = document.createElement("button");
  closeBtn.id = "manual-close-btn";
  closeBtn.type = "button";
  closeBtn.className = "manual-close-btn";
  closeBtn.append(createIcon("close", 16));
  closeBtn.addEventListener("click", () => dialog.close());

  const headerActions = document.createElement("div");
  headerActions.className = "manual-header-actions";
  headerActions.append(langGroup, closeBtn);

  const header = document.createElement("div");
  header.className = "manual-header";
  header.append(headerLeft, headerActions);

  const nav = document.createElement("nav");
  nav.className = "manual-nav";
  nav.setAttribute("role", "tablist");

  const tabsMeta: ReadonlyArray<{
    id: ManualTabId;
    icon: IconName;
  }> = [
    { id: "quickstart", icon: "play" },
    { id: "hardware", icon: "layers" },
    { id: "connection", icon: "bluetooth" },
    { id: "quality", icon: "sliders" },
    { id: "pwa", icon: "downloadApp" },
  ];

  const tabButtons = tabsMeta.map(({ id, icon }) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("role", "tab");
    btn.className = "manual-tab-btn";
    btn.dataset.manualTab = id;
    btn.append(createIcon(icon, 14), document.createElement("span"));
    btn.addEventListener("click", () => {
      activeTab = id;
      renderContent();
    });
    return btn;
  });
  nav.append(...tabButtons);

  const body = document.createElement("div");
  body.className = "manual-body";

  sheet.append(header, nav, body);
  dialog.append(sheet);

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });

  function renderContent(): void {
    const t = TRANSLATIONS[currentLocale];
    titleEl.textContent = t.manualModalTitle;
    subtitleEl.textContent = t.manualModalSubtitle;
    closeBtn.setAttribute("aria-label", t.manualCloseAria);
    langGroup.setAttribute("aria-label", t.langGroupAria);
    nav.setAttribute("aria-label", t.manualModalTitle);

    for (const btn of langButtons) {
      const btnLoc = btn.dataset.manualLocale;
      const isActive = btnLoc === currentLocale;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-checked", String(isActive));
      btn.setAttribute("aria-label", btnLoc === "pt-BR" ? t.langPtAria : t.langEnAria);
    }

    const tabLabels: Record<ManualTabId, string> = {
      quickstart: t.manualTabQuickstart,
      hardware: t.manualTabHardware,
      connection: t.manualTabConnection,
      quality: t.manualTabQuality,
      pwa: t.manualTabPwa,
    };

    for (const btn of tabButtons) {
      const tabId = btn.dataset.manualTab as ManualTabId;
      const isSelected = tabId === activeTab;
      btn.classList.toggle("is-active", isSelected);
      btn.setAttribute("aria-selected", String(isSelected));
      const labelSpan = btn.querySelector("span");
      if (labelSpan) {
        labelSpan.textContent = tabLabels[tabId];
      }
    }

    body.replaceChildren();

    if (activeTab === "quickstart") {
      const grid = document.createElement("div");
      grid.className = "manual-step-grid";
      grid.append(
        makeStepCard(t.manualQuickStep1Title, t.manualQuickStep1Body),
        makeStepCard(t.manualQuickStep2Title, t.manualQuickStep2Body),
        makeStepCard(t.manualQuickStep3Title, t.manualQuickStep3Body),
        makeStepCard(t.manualQuickStep4Title, t.manualQuickStep4Body),
      );
      body.append(makeTextEl("p", "manual-intro", t.manualQuickIntro), grid);
      return;
    }

    if (activeTab === "hardware") {
      const hero = document.createElement("div");
      hero.className = "manual-hero-card";

      const well = document.createElement("div");
      well.className = "manual-hero-well";
      const img = document.createElement("img");
      img.src = "./niimbot-b1.svg";
      img.alt = t.manualHwImgAlt;
      img.className = "manual-hero-img";
      img.loading = "lazy";
      img.decoding = "async";
      well.append(img);

      const copy = document.createElement("div");
      copy.className = "manual-hero-copy";
      copy.append(
        makeTextEl("h3", "", t.manualHwHeroTitle),
        makeTextEl("p", "", t.manualHwHeroBody),
      );
      hero.append(well, copy);

      const partsGrid = document.createElement("div");
      partsGrid.className = "manual-step-grid";
      partsGrid.append(
        makeStepCard(t.manualHwPart1Title, t.manualHwPart1Body),
        makeStepCard(t.manualHwPart2Title, t.manualHwPart2Body),
        makeStepCard(t.manualHwPart3Title, t.manualHwPart3Body),
        makeStepCard(t.manualHwPart4Title, t.manualHwPart4Body),
      );

      body.append(
        hero,
        partsGrid,
        makeCallout(t.manualHwCalloutTitle, t.manualHwCalloutBody, false),
      );
      return;
    }

    if (activeTab === "connection") {
      const grid = document.createElement("div");
      grid.className = "manual-step-grid";
      grid.append(
        makeStepCard(t.manualConnUsbTitle, t.manualConnUsbBody),
        makeStepCard(t.manualConnBleTitle, t.manualConnBleBody),
      );
      body.append(
        makeTextEl("p", "manual-intro", t.manualConnIntro),
        grid,
        makeCallout(t.manualConnWarnTitle, t.manualConnWarnBody, true),
      );
      return;
    }

    if (activeTab === "quality") {
      const grid = document.createElement("div");
      grid.className = "manual-step-grid";
      grid.append(
        makeStepCard(t.manualQualThreshTitle, t.manualQualThreshBody),
        makeStepCard(t.manualQualAtkinsonTitle, t.manualQualAtkinsonBody),
        makeStepCard(t.manualQualDensityTitle, t.manualQualDensityBody),
        makeStepCard(t.manualQualGapTitle, t.manualQualGapBody),
      );
      body.append(makeTextEl("p", "manual-intro", t.manualQualIntro), grid);
      return;
    }

    const pwaGrid = document.createElement("div");
    pwaGrid.className = "manual-step-grid";
    pwaGrid.append(
      makeStepCard(t.manualPwaInstallTitle, t.manualPwaInstallBody),
      makeStepCard(t.manualPwaPrivacyTitle, t.manualPwaPrivacyBody),
    );
    body.append(makeTextEl("p", "manual-intro", t.manualPwaIntro), pwaGrid);
  }

  renderContent();

  return {
    element: dialog,
    open(initialTab?: ManualTabId) {
      if (initialTab) {
        activeTab = initialTab;
        renderContent();
      }
      if (!dialog.open) {
        dialog.showModal();
      }
    },
    close() {
      if (dialog.open) {
        dialog.close();
      }
    },
    setLocale(locale: Locale) {
      currentLocale = locale;
      renderContent();
    },
  };
}

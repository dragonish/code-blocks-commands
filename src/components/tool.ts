export function renderSecondary(title?: string, lang?: string): string {
  return [title, lang].filter(Boolean).join(" · ");
}

export function renderText(language: LanguageCode): string {
  const { markup, lang, title } = language;
  const secondary = renderSecondary(title, lang);
  return markup + (secondary ? ` ${secondary}` : "");
}

export function renderText(language: LanguageCode): string {
  const { markup, lang, title } = language;
  return markup + (title ? ` [${title}]` : "") + (lang ? ` <${lang}>` : "");
}

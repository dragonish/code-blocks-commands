/**
 * Shared render logic for suggestion items.
 *
 * Both the editor popup (`EditorSuggest`) and the language list modal
 * (`FuzzySuggestModal`) display the same candidates, so they share this
 * helper to keep the markup, aliases and match highlights consistent.
 *
 * The fuzzy-search target is the full text of the candidate
 * (`markup title · lang>`), which is still searched by the ranking logic.
 * Here we only split the rendered text into two rows and highlight the
 * matched regions within each row.
 */
import { renderResults, SearchResult, setIcon, setTooltip } from "obsidian";
import { i18n } from "../locales";
import { renderSecondary } from "./tool";

const ALIAS_ICON = "lucide-tag";

/**
 * Render a suggestion item into `el`.
 *
 * @param el The element of the suggestion item (e.g. `suggestion-item-content`).
 * @param item The candidate language/markup.
 * @param match The fuzzy search result of the *full* candidate text.
 * @param allowAliasLabel Whether the alias indicator may be shown. Note that
 * `this.plugin.settings.showAliasLabels` is optional, so `undefined` is
 * interpreted as "not allowed".
 */
export function renderSuggestionItem(
  el: HTMLElement,
  item: LanguageCode,
  match: SearchResult,
  allowAliasLabel: boolean | undefined,
): void {
  const contentEl = getRenderContentEl(el);
  contentEl.empty();

  const container = contentEl.createDiv({
    cls: "code-blocks-commands-suggestion",
  });

  const body = container.createDiv({
    cls: "code-blocks-commands-suggestion-body",
  });

  const primary = body.createDiv({
    cls: "code-blocks-commands-suggestion-primary",
  });
  // The markup itself (the text that will be inserted into the note).
  renderPart(primary, item.markup, match, 0);

  // The optional `title` and `lang` part, rendered as a secondary line.
  const secondary = renderSecondary(item.title, item.lang);
  if (secondary) {
    const secondaryEl = body.createDiv({
      cls: "code-blocks-commands-suggestion-secondary",
    });
    renderPart(secondaryEl, secondary, match, item.markup.length + 1);
  }

  if (allowAliasLabel && item.isAlias) {
    const alias = container.createDiv({
      cls: "code-blocks-commands-suggestion-alias",
    });
    setIcon(alias, ALIAS_ICON);
    setTooltip(alias, i18n.t("suggest.alias"), { delay: 0 });
  }
}

/**
 * Return the element where the suggestion content is rendered. Usually it is
 * the inner `suggestion-item-content` element of the item, but some parts of
 * the core API hand us the item itself instead, so create the wrapper if
 * necessary.
 */
function getRenderContentEl(el: HTMLElement): HTMLElement {
  const contentClass = "suggestion-item-content";
  if (el.className.includes(contentClass)) {
    return el;
  }
  const existing = el.querySelector<HTMLElement>(`.${contentClass}`);
  if (existing) {
    return existing;
  }
  return el.createDiv({ cls: contentClass });
}

/**
 * Render a single section of the candidate text, highlighting only the parts
 * of `match` that fall inside it. `start` is the offset of that section (in
 * the full candidate text) so matches can be converted to the section's
 * coordinate space. Matches that cross the section boundary are clipped.
 */
function renderPart(
  el: HTMLElement,
  text: string,
  match: SearchResult,
  start: number,
): void {
  const end = start + text.length;
  renderResults(el, text, {
    score: match.score,
    matches: match.matches
      .filter(([from, to]) => from < end && to > start)
      .map(([from, to]) => [
        Math.max(from - start, 0),
        Math.min(to - start, text.length),
      ]),
  });
}

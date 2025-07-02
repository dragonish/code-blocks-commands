import { App, FuzzyMatch, FuzzySuggestModal, renderResults } from "obsidian";
import type { CodeBlocksPlugin } from "./plugin";

type SelectCallback = (markup: string) => void;

export class CodeBlocksListModal extends FuzzySuggestModal<LanguageCode> {
  constructor(
    app: App,
    private plugin: CodeBlocksPlugin,
    private selectCallback: SelectCallback
  ) {
    super(app);

    this.emptyStateText = this.plugin.i18n.t("list.empty");
    this.setPlaceholder(this.plugin.i18n.t("list.placeholder"));
  }

  getItems(): LanguageCode[] {
    return this.plugin.languages;
  }

  getItemText(item: LanguageCode): string {
    const text = item.lang ? `${item.markup} <${item.lang}>` : item.markup;
    return text;
  }

  onChooseItem(item: LanguageCode): void {
    this.selectCallback(item.markup);
  }

  renderSuggestion(match: FuzzyMatch<LanguageCode>, el: HTMLElement): void {
    const text = match.item.lang
      ? `${match.item.markup} <${match.item.lang}>`
      : match.item.markup;
    renderResults(el, text, match.match);
  }
}

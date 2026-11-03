import { App, FuzzyMatch, FuzzySuggestModal } from "obsidian";
import type { CodeBlocksPlugin } from "./plugin";
import { renderSuggestionItem } from "./suggest-render";
import { renderText } from "./tool";

type SelectCallback = (markup: string) => void;

export class CodeBlocksListModal extends FuzzySuggestModal<LanguageCode> {
  constructor(
    app: App,
    private plugin: CodeBlocksPlugin,
    private selectCallback: SelectCallback
  ) {
    super(app);
    const { i18n } = this.plugin;

    this.emptyStateText = i18n.t("list.empty");
    this.setPlaceholder(i18n.t("list.placeholder"));
  }

  getItems(): LanguageCode[] {
    return this.plugin.languages;
  }

  getItemText(item: LanguageCode): string {
    const text = renderText(item);
    return text;
  }

  onChooseItem(item: LanguageCode): void {
    this.selectCallback(item.markup);
  }

  renderSuggestion(match: FuzzyMatch<LanguageCode>, el: HTMLElement): void {
    renderSuggestionItem(
      el,
      match.item,
      match.match,
      this.plugin.settings.showAliasLabels && match.item.isAlias,
    );
  }
}

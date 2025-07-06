import { App, FuzzyMatch, FuzzySuggestModal, renderResults } from "obsidian";
import type { CodeBlocksPlugin } from "./plugin";
import { renderText } from "./tool";

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
    const text = renderText(item);
    return text;
  }

  onChooseItem(item: LanguageCode): void {
    this.selectCallback(item.markup);
  }

  renderSuggestion(match: FuzzyMatch<LanguageCode>, el: HTMLElement): void {
    const text = renderText(match.item);
    renderResults(el, text, match.match);
    if (this.plugin.settings.showAliasLabels && match.item.isAlias) {
      const alias = createEl("small", {
        cls: "code-blocks-commands-list-alias-label",
        text: "alias",
      });
      el.appendChild(alias);
    }
  }
}

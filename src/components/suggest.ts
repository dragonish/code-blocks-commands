import {
  App,
  Editor,
  EditorPosition,
  EditorSuggest,
  EditorSuggestContext,
  EditorSuggestTriggerInfo,
  prepareFuzzySearch,
  FuzzyMatch,
  renderResults,
} from "obsidian";
import type { CodeBlocksPlugin } from "./plugin";
import { renderText } from "./tool";

export class CodeBlocksEditorSuggest extends EditorSuggest<
  FuzzyMatch<LanguageItem>
> {
  private isOpen: boolean;

  constructor(public app: App, public plugin: CodeBlocksPlugin) {
    super(app);
    this.isOpen = false;
  }

  open() {
    super.open();
    this.isOpen = true;
  }

  close() {
    super.close();
    this.isOpen = false;
  }

  toggle() {
    this.isOpen ? this.close() : this.open();
  }

  getSuggestions(context: EditorSuggestContext): FuzzyMatch<LanguageItem>[] {
    const query = context.query.toLowerCase();
    const fuzzy = prepareFuzzySearch(query);

    const result = this.plugin.languages
      .map((item) => {
        const text = renderText(item);
        const match = fuzzy(text);
        if (match) {
          return {
            item,
            match,
          };
        }
        return null;
      })
      .filter((v) => v != null)
      .sort((a, b) => {
        if (a.item.count === b.item.count) {
          return b.match.score - a.match.score;
        }
        return 0;
      });
    return result;
  }

  onTrigger(
    cursor: EditorPosition,
    editor: Editor
  ): EditorSuggestTriggerInfo | null {
    const line = cursor.line;
    const lineText = editor.getLine(line);
    const matchArr = lineText.match(/^([> \t]*`{3,}\s*)([^`\s]*)/);
    if (matchArr) {
      const backticksLen = matchArr[1].length;
      const query = matchArr[2];
      const endLen = backticksLen + query.length;
      if (cursor.ch < backticksLen || cursor.ch > endLen) {
        this.close(); //? Handle the case when opened manually.
        return null;
      }

      return {
        start: { line, ch: backticksLen },
        end: { line, ch: endLen },
        query,
      };
    }
    this.close(); //? Handle the case when opened manually.
    return null;
  }

  renderSuggestion(value: FuzzyMatch<LanguageItem>, el: HTMLElement): void {
    const text = renderText(value.item);
    renderResults(el, text, value.match);
    if (this.plugin.settings.showAliasLabels && value.item.isAlias) {
      const alias = createEl("small", {
        cls: "code-blocks-commands-list-alias-label",
        text: "alias",
      });
      el.appendChild(alias);
    }
  }

  selectSuggestion(value: FuzzyMatch<LanguageItem>): void {
    if (this.context) {
      const { editor, start, end } = this.context;
      const markup = value.item.markup;
      if (start.line === end.line && start.ch === end.ch) {
        editor.replaceSelection(markup);
      } else {
        editor.replaceRange(markup, start, end);
        editor.setCursor({
          line: start.line,
          ch: start.ch + markup.length,
        });
      }
      this.close();
      this.plugin.onSelectMarkup(markup);
    }
  }
}

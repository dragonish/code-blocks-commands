import {
  App,
  Editor,
  EditorPosition,
  EditorSuggest,
  EditorSuggestContext,
  EditorSuggestTriggerInfo,
  FuzzyMatch,
  prepareFuzzySearch,
  renderResults,
  SearchResult,
} from "obsidian";
import type { CodeBlocksPlugin } from "./plugin";
import { renderText } from "./tool";

type SuggestionCandidate = {
  item: LanguageItem;
  match: SearchResult;
  isPrefix: boolean;
};

//? Weights of fuzzy relevance vs. usage count. Set `USAGE_WEIGHT` to 0 to rank
//? purely by match quality, or raise it to favor frequently used markups.
const RELEVANCE_WEIGHT = 0.7;
const USAGE_WEIGHT = 0.3;

export class CodeBlocksEditorSuggest extends EditorSuggest<
  FuzzyMatch<LanguageItem>
> {
  private isOpen: boolean;

  constructor(
    public app: App,
    public plugin: CodeBlocksPlugin,
  ) {
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
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  getSuggestions(context: EditorSuggestContext): FuzzyMatch<LanguageItem>[] {
    const queryRaw = context.query.toLowerCase();
    const isSpaceQuery = queryRaw.startsWith(" ");
    const query = isSpaceQuery ? queryRaw.substring(1) : queryRaw;

    const fuzzy = prepareFuzzySearch(query);
    const prioritizePrefix =
      this.plugin.settings.prioritizePrefixMatch ?? false;

    const result = this.plugin.languages
      .map((item): SuggestionCandidate | null => {
        if (isSpaceQuery && !item.afterSpace) {
          return null;
        }

        const text = renderText(item);
        const match = fuzzy(text);
        if (match) {
          return {
            item,
            match,
            isPrefix: prioritizePrefix && text.toLowerCase().startsWith(query),
          };
        }
        return null;
      })
      .filter((value): value is SuggestionCandidate => value !== null);

    //? Normalize both signals to [0, 1]: the raw fuzzy score scale depends on
    //? the candidate text, and usage scores are unbounded.
    const maxScore = Math.max(0, ...result.map(({ match }) => match.score));
    const logMaxUsage = Math.log1p(
      Math.max(0, ...result.map(({ item }) => item.usage)),
    );

    const ranked = result.map((candidate) => {
      const relevance = maxScore > 0 ? candidate.match.score / maxScore : 0;
      const usage =
        logMaxUsage > 0 ? Math.log1p(candidate.item.usage) / logMaxUsage : 0;
      return {
        ...candidate,
        rank: RELEVANCE_WEIGHT * relevance + USAGE_WEIGHT * usage,
      };
    });

    ranked.sort((a, b) => {
      if (a.isPrefix !== b.isPrefix) {
        return a.isPrefix ? -1 : 1;
      }
      if (a.rank !== b.rank) {
        return b.rank - a.rank;
      }
      //? Deterministic order when two candidates rank equally.
      return a.item.markup.localeCompare(b.item.markup);
    });

    return ranked.map(({ item, match }) => ({ item, match }));
  }

  onTrigger(
    cursor: EditorPosition,
    editor: Editor,
  ): EditorSuggestTriggerInfo | null {
    const line = cursor.line;
    const lineText = editor.getLine(line);
    const matchArr = lineText.match(/^([> \t]*`{3,}\s*)([^`:='"\s]*)$/);
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
    } else if (this.plugin.settings.allowAfterSpaceSuggest) {
      const matchArr = lineText.match(/^([> \t]*`{3,}\s*.+\s+)([^`:='"\s]*)$/);
      if (matchArr) {
        const spacesLen = matchArr[1].length;
        const query = matchArr[2];
        const endLen = spacesLen + query.length;
        if (cursor.ch < spacesLen || cursor.ch > endLen) {
          this.close(); //? Handle the case when opened manually.
          return null;
        }

        return {
          start: { line, ch: spacesLen },
          end: { line, ch: endLen },
          query: ` ${query}`, //? Prefixing with spaces to identify it as a special space query
        };
      }
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

import { Plugin, Editor, Notice, debounce } from "obsidian";
import { i18n } from "../locales";
import {
  DEFAULT_SETTINGS,
  sourceLanguages,
  codeblockCustomizerParameters,
} from "./data";
import { CodeBlocksEditorSuggest } from "./suggest";
import { CodeBlocksListModal } from "./list";
import { CodeBlocksPluginSettingsTab } from "./setting-tab";
import { isUsedCountEntry, usageScore } from "./usage";

export class CodeBlocksPlugin extends Plugin {
  settings: CodeBlocksPluginSettings;
  languages: LanguageItem[];
  i18n = i18n;

  private editorSuggest: CodeBlocksEditorSuggest;

  async onload() {
    await this.loadSettings();
    this.loadLanguages();
    this.editorSuggest = new CodeBlocksEditorSuggest(this.app, this);

    this.registerEditorSuggest(this.editorSuggest);

    this.addCommand({
      id: "list-languages",
      name: this.i18n.t("command.list-languages"),
      editorCallback: (editor) => {
        this.showLanguagesModal(editor);
      },
    });
    this.addCommand({
      id: "trigger-suggestions",
      name: this.i18n.t("command.trigger-suggestions"),
      editorCallback: (editor) => {
        if (editor.getSelection().length > 0) {
          return;
        }
        this.editorSuggest.toggle();
        editor.setCursor(editor.getCursor());
      },
    });

    this.addRibbonIcon(
      "square-code",
      this.i18n.t("command.list-languages"),
      () => {
        this.showLanguagesModal();
      },
    );

    this.addSettingTab(new CodeBlocksPluginSettingsTab(this.app, this));
  }

  onunload() {
    //! Flush the pending debounced save, otherwise the last selection made
    //! within the debounce window is lost when Obsidian quits.
    void this.debouncedSaveSettings.run();
  }

  private showLanguagesModal(editor?: Editor) {
    const activeEditor = editor || this.app.workspace.activeEditor?.editor;
    if (activeEditor) {
      const selectedText = activeEditor.getSelection();

      new CodeBlocksListModal(this.app, this, (markup) => {
        activeEditor.replaceSelection("```" + markup + "\n" + selectedText);
        activeEditor.replaceRange("\n```", activeEditor.getCursor());
        this.onSelectMarkup(markup);
      }).open();
    }
  }

  private async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    const migrated = this.migrateUsedCount();
    const pruned = this.pruneUsedCount();
    if (migrated || pruned) {
      //? Persist the upgraded shape right away, otherwise legacy entries would
      //? get their `lastUsed` refreshed on every launch and never decay.
      await this.saveSettings();
    }
  }

  /**
   * Upgrade `usedCount` from the legacy `{ markup: number }` shape to
   * `{ markup: { count, lastUsed } }`. Legacy entries are stamped with the
   * current time so their existing weight is preserved.
   * @returns Whether anything changed.
   */
  private migrateUsedCount(): boolean {
    const now = Date.now();
    const raw = (this.settings.usedCount ?? {}) as Record<string, unknown>;
    const usedCount: UsedCount = {};
    let migrated = false;

    for (const [markup, value] of Object.entries(raw)) {
      if (typeof value === "number") {
        //? Legacy shape.
        migrated = true;
        if (value > 0) {
          usedCount[markup] = { count: value, lastUsed: now };
        }
      } else if (isUsedCountEntry(value)) {
        if (value.count <= 0) {
          migrated = true;
          continue;
        }
        const lastUsed = value.lastUsed > 0 ? value.lastUsed : now;
        if (lastUsed !== value.lastUsed) {
          migrated = true;
        }
        usedCount[markup] = { count: value.count, lastUsed };
      } else {
        //? Unknown shape, drop it.
        migrated = true;
      }
    }

    this.settings.usedCount = usedCount;
    return migrated;
  }

  /**
   * Drop counters whose markup no longer exists in any language list, so
   * `usedCount` cannot grow forever when custom languages are renamed or
   * removed. Both built-in lists are always considered, otherwise toggling the
   * Codeblock Customizer parameters would discard counters.
   * @returns Whether anything was pruned.
   */
  private pruneUsedCount(): boolean {
    const known = new Set(
      sourceLanguages
        .concat(codeblockCustomizerParameters)
        .map((item) => item.markup),
    );
    for (const item of this.settings.customLanguages ?? []) {
      if (item.markup) known.add(item.markup);
    }

    const usedCount: UsedCount = {};
    let pruned = false;
    for (const [markup, entry] of Object.entries(this.settings.usedCount)) {
      if (known.has(markup)) {
        usedCount[markup] = entry;
      } else {
        pruned = true;
      }
    }
    this.settings.usedCount = usedCount;
    return pruned;
  }

  private async saveSettings() {
    await this.saveData(this.settings);
  }

  debouncedSaveSettings = debounce(this.saveSettings.bind(this), 1000, true);

  loadLanguages() {
    const builtinLanguages = this.settings.showCodeblockCustomizerParameters
      ? sourceLanguages.concat(codeblockCustomizerParameters)
      : sourceLanguages;

    const now = Date.now();
    this.languages = this.settings.customLanguages
      .filter((item) => item.markup)
      .concat(builtinLanguages)
      .map((item) => {
        const entry = this.settings.usedCount[item.markup];
        return {
          ...item,
          count: entry?.count ?? 0,
          usage: entry ? usageScore(entry.count, entry.lastUsed, now) : 0,
        };
      })
      .sort((a, b) => b.usage - a.usage);
  }

  onSelectMarkup(markup: string) {
    const usedCount = this.settings.usedCount;
    const entry = usedCount[markup] ?? { count: 0, lastUsed: 0 };
    entry.count += 1;
    entry.lastUsed = Date.now();
    usedCount[markup] = entry;
    this.loadLanguages();
    this.debouncedSaveSettings();
  }

  sendNotification(message: string) {
    new Notice(message);
  }
}

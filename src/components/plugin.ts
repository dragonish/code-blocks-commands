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
    this.pruneUsedCount();
  }

  /**
   * Drop counters whose markup no longer exists in any language list, so
   * `usedCount` cannot grow forever when custom languages are renamed or
   * removed. Both built-in lists are always considered, otherwise toggling the
   * Codeblock Customizer parameters would discard counters.
   */
  private pruneUsedCount() {
    const known = new Set(
      sourceLanguages
        .concat(codeblockCustomizerParameters)
        .map((item) => item.markup),
    );
    for (const item of this.settings.customLanguages ?? []) {
      if (item.markup) known.add(item.markup);
    }

    const usedCount: UsedCount = {};
    const entries = Object.entries(this.settings.usedCount ?? {});
    for (const [markup, count] of entries) {
      if (known.has(markup)) usedCount[markup] = count;
    }
    this.settings.usedCount = usedCount;
  }

  private async saveSettings() {
    await this.saveData(this.settings);
  }

  debouncedSaveSettings = debounce(this.saveSettings.bind(this), 1000, true);

  loadLanguages() {
    const builtinLanguages = this.settings.showCodeblockCustomizerParameters
      ? sourceLanguages.concat(codeblockCustomizerParameters)
      : sourceLanguages;

    this.languages = this.settings.customLanguages
      .filter((item) => item.markup)
      .concat(builtinLanguages)
      .map((item) => ({
        ...item,
        count: this.settings.usedCount[item.markup] || 0,
      }))
      .sort((a, b) => b.count - a.count);
  }

  onSelectMarkup(markup: string) {
    const usedCount = this.settings.usedCount;
    usedCount[markup] = (usedCount[markup] ?? 0) + 1;
    this.loadLanguages();
    this.debouncedSaveSettings();
  }

  sendNotification(message: string) {
    new Notice(message);
  }
}

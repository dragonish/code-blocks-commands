import {
  App,
  ButtonComponent,
  PluginSettingTab,
  Setting,
  TextComponent,
} from "obsidian";
import { CodeBlocksPlugin } from "./plugin";

export class CodeBlocksPluginSettingsTab extends PluginSettingTab {
  private plugin: CodeBlocksPlugin;

  constructor(app: App, plugin: CodeBlocksPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const {
      containerEl,
      plugin: { i18n },
    } = this;

    containerEl.empty();

    //* showAliasLabel
    new Setting(containerEl)
      .setName(i18n.t("setting.show-alias-labels"))
      .setDesc(i18n.t("setting.show-alias-labels-desc"))
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.showAliasLabels || false)
          .onChange((value) => {
            this.plugin.settings.showAliasLabels = value;
            this.plugin.debouncedSaveSettings();
          });
      });

    //* showCodeblockCustomizerParameters
    new Setting(containerEl)
      .setName(i18n.t("setting.show-cbc-parameters"))
      .setDesc(i18n.t("setting.show-cbc-parameters-desc"))
      .addToggle((toggle) => {
        toggle
          .setValue(
            this.plugin.settings.showCodeblockCustomizerParameters || false,
          )
          .onChange((value) => {
            this.plugin.settings.showCodeblockCustomizerParameters = value;
            this.plugin.loadLanguages();
            this.plugin.debouncedSaveSettings();
          });
      });

    //* customLanguages
    new Setting(containerEl)
      .setName(i18n.t("setting.custom-languages"))
      .setDesc(i18n.t("setting.custom-languages-desc"))
      .addButton((button) => {
        button.setButtonText(i18n.t("button.manage")).onClick(() => {
          this.displayManageCustomLanguages();
        });
      });

    //* usedCount
    new Setting(containerEl)
      .setName(i18n.t("setting.used-count"))
      .setDesc(i18n.t("setting.used-count-desc"))
      .addButton((button) => {
        button.setButtonText(i18n.t("button.manage")).onClick(() => {
          this.displayManageUsedCount();
        });
      });

    //* reset
    new Setting(containerEl)
      .setName(i18n.t("setting.reset-used-count"))
      .setDesc(i18n.t("setting.reset-used-count-desc"))
      .addButton((button) => {
        button
          .setButtonText(i18n.t("button.reset"))
          .setDestructive()
          .onClick(() => {
            this.plugin.settings.usedCount = {};
            this.plugin.loadLanguages();
            this.plugin.debouncedSaveSettings();
            this.plugin.sendNotification(i18n.t("notification.reset"));
          });
      });
  }

  displayManageCustomLanguages(): void {
    const {
      containerEl,
      plugin: { i18n },
    } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName(i18n.t("setting.custom-languages"))
      .setHeading()
      .addButton((button) =>
        button.setButtonText(i18n.t("button.back")).onClick(() => {
          this.update();
        }),
      );

    this.plugin.settings.customLanguages.forEach((language, index) => {
      const card = containerEl.createDiv({
        cls: "code-blocks-commands-card",
      });

      const header = card.createDiv({
        cls: "code-blocks-commands-card-header",
      });
      header.createSpan({
        text: i18n.t("language.label", { index: index + 1 }),
      });

      new ButtonComponent(header)
        .setButtonText(i18n.t("button.delete"))
        .setDestructive()
        .onClick(() => {
          this.plugin.settings.customLanguages.splice(index, 1);
          this.plugin.loadLanguages();
          this.plugin.debouncedSaveSettings();
          this.displayManageCustomLanguages(); //! Rerender
        });

      const fields = card.createDiv({
        cls: "code-blocks-commands-language-fields",
      });

      new TextComponent(fields)
        .setPlaceholder(i18n.t("language.markup-placeholder"))
        .setValue(language.markup)
        .onChange((value) => {
          this.plugin.settings.customLanguages[index].markup = value.trim();
          this.plugin.loadLanguages();
          this.plugin.debouncedSaveSettings();
        });

      new TextComponent(fields)
        .setPlaceholder(i18n.t("language.lang-placeholder"))
        .setValue(language.lang)
        .onChange((value) => {
          this.plugin.settings.customLanguages[index].lang = value.trim();
          this.plugin.loadLanguages();
          this.plugin.debouncedSaveSettings();
        });

      new TextComponent(fields)
        .setPlaceholder(i18n.t("language.title-placeholder"))
        .setValue(language.title || "")
        .onChange((value) => {
          this.plugin.settings.customLanguages[index].title = value.trim();
          this.plugin.loadLanguages();
          this.plugin.debouncedSaveSettings();
        });
    });

    new Setting(containerEl).addButton((button) => {
      button
        .setButtonText(i18n.t("button.add"))
        .setCta()
        .setTooltip(i18n.t("language.add-tip"))
        .onClick(() => {
          this.plugin.settings.customLanguages.push({
            markup: "",
            lang: "",
          });
          this.plugin.debouncedSaveSettings();
          this.displayManageCustomLanguages(); //! Rerender
        });
    });
  }

  displayManageUsedCount(): void {
    const {
      containerEl,
      plugin: { i18n },
    } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName(i18n.t("setting.used-count"))
      .setHeading()
      .addButton((button) => {
        button.setButtonText(i18n.t("button.back")).onClick(() => {
          this.update();
        });
      });

    const list = Object.entries(this.plugin.settings.usedCount)
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count);

    list.forEach((item) => {
      const card = containerEl.createDiv({
        cls: "code-blocks-commands-card",
      });

      const header = card.createDiv({
        cls: "code-blocks-commands-card-header",
      });
      header.createSpan({
        text: i18n.t("setting.used-count-item", {
          markup: item.key,
          count: item.count,
        }),
      });

      new ButtonComponent(header)
        .setButtonText(i18n.t("button.reset"))
        .setDestructive()
        .onClick(() => {
          delete this.plugin.settings.usedCount[item.key];
          this.plugin.loadLanguages();
          this.plugin.debouncedSaveSettings();
          this.displayManageUsedCount(); //! Rerender
        });
    });
  }
}

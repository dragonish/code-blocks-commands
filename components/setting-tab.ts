import { App, PluginSettingTab, Setting } from "obsidian";
import { CodeBlocksPlugin } from "./plugin";

export class CodeBlocksPluginSettingsTab extends PluginSettingTab {
  private plugin: CodeBlocksPlugin;

  constructor(app: App, plugin: CodeBlocksPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    //* customLanguages
    new Setting(containerEl)
      .setName(this.plugin.i18n.t("setting.custom-languages"))
      .setDesc(this.plugin.i18n.t("setting.custom-languages-desc"))
      .addButton((button) => {
        button
          .setButtonText(this.plugin.i18n.t("button.manage"))
          .onClick(() => {
            this.displayManageCustomLanguages();
          });
      });

    //* usedCount
    new Setting(containerEl)
      .setName(this.plugin.i18n.t("setting.used-count"))
      .setDesc(this.plugin.i18n.t("setting.used-count-desc"))
      .addButton((button) => {
        button
          .setButtonText(this.plugin.i18n.t("button.manage"))
          .onClick(() => {
            this.displayManageUsedCount();
          });
      });

    //* reset
    new Setting(containerEl)
      .setName(this.plugin.i18n.t("setting.reset-used-count"))
      .setDesc(this.plugin.i18n.t("setting.reset-used-count-desc"))
      .addButton((button) => {
        button
          .setButtonText(this.plugin.i18n.t("button.reset"))
          .setWarning()
          .onClick(() => {
            this.plugin.settings.usedCount = {};
            this.plugin.loadLanguages();
            this.plugin.debouncedSaveSettings();
            this.plugin.sendNotification(
              this.plugin.i18n.t("notification.reset")
            );
          });
      });
  }

  displayManageCustomLanguages(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName(this.plugin.i18n.t("setting.custom-languages"))
      .setHeading()
      .addButton((button) =>
        button.setButtonText(this.plugin.i18n.t("button.back")).onClick(() => {
          this.display();
        })
      );

    this.plugin.settings.customLanguages.forEach((language, index) => {
      new Setting(containerEl)
        .setName(this.plugin.i18n.t("language.label"))
        .addText((text) => {
          text
            .setPlaceholder(this.plugin.i18n.t("language.markup-placeholder"))
            .setValue(language.markup)
            .onChange((value) => {
              this.plugin.settings.customLanguages[index].markup = value.trim();
              this.plugin.loadLanguages();
              this.plugin.debouncedSaveSettings();
            });
        })
        .addText((text) => {
          text
            .setPlaceholder(this.plugin.i18n.t("language.lang-placeholder"))
            .setValue(language.lang)
            .onChange((value) => {
              this.plugin.settings.customLanguages[index].lang = value.trim();
              this.plugin.loadLanguages();
              this.plugin.debouncedSaveSettings();
            });
        })
        .addButton((button) => {
          button
            .setButtonText(this.plugin.i18n.t("button.delete"))
            .setWarning()
            .onClick(() => {
              this.plugin.settings.customLanguages.splice(index, 1);
              this.plugin.loadLanguages();
              this.plugin.debouncedSaveSettings();
              this.displayManageCustomLanguages(); //! Rerender
            });
        });
    });

    new Setting(containerEl).addButton((button) => {
      button
        .setButtonText(this.plugin.i18n.t("button.add"))
        .setCta()
        .setTooltip(this.plugin.i18n.t("language.add-tip"))
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
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName(this.plugin.i18n.t("setting.used-count"))
      .setHeading()
      .addButton((button) => {
        button.setButtonText(this.plugin.i18n.t("button.back")).onClick(() => {
          this.display();
        });
      });

    const list = Object.entries(this.plugin.settings.usedCount)
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count);

    list.forEach((item) => {
      new Setting(containerEl)
        .setName(
          this.plugin.i18n.t("setting.used-count-item", {
            markup: item.key,
            count: item.count,
          })
        )
        .addButton((button) => {
          button
            .setButtonText(this.plugin.i18n.t("button.reset"))
            .setWarning()
            .onClick(() => {
              delete this.plugin.settings.usedCount[item.key];
              this.plugin.loadLanguages();
              this.plugin.debouncedSaveSettings();
              this.displayManageUsedCount(); //! Rerender
            });
        });
    });
  }
}

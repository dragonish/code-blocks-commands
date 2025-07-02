interface LanguageCode {
  markup: string;
  lang: string;
}

interface LanguageItem extends LanguageCode {
  count: number;
}

interface UsedCount {
  [markup: string]: number;
}

interface CodeBlocksPluginSettings {
  customLanguages: LanguageCode[];
  usedCount: UsedCount;
}

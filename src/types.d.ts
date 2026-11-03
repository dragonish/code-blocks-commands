interface LanguageCode {
  markup: string;
  lang: string;
  title?: string;
  isAlias?: boolean;
  afterSpace?: boolean;
}

interface LanguageItem extends LanguageCode {
  count: number;
}

interface UsedCount {
  [markup: string]: number;
}

interface CodeBlocksPluginSettings {
  showAliasLabels?: boolean;
  showCodeblockCustomizerParameters?: boolean;
  allowAfterSpaceSuggest?: boolean;
  prioritizePrefixMatch?: boolean;
  customLanguages: LanguageCode[];
  usedCount: UsedCount;
}

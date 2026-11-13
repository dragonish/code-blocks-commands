interface LanguageCode {
  markup: string;
  lang: string;
  title?: string;
  isAlias?: boolean;
  afterSpace?: boolean;
}

interface LanguageItem extends LanguageCode {
  count: number;
  /** Decayed usage score used for ranking, see `usageScore`. */
  usage: number;
}

interface UsedCountEntry {
  /** How many times the markup has been selected. */
  count: number;
  /** Unix timestamp (ms) of the last selection, 0 when unknown. */
  lastUsed: number;
}

interface UsedCount {
  [markup: string]: UsedCountEntry;
}

interface CodeBlocksPluginSettings {
  showAliasLabels?: boolean;
  showCodeblockCustomizerParameters?: boolean;
  allowAfterSpaceSuggest?: boolean;
  prioritizePrefixMatch?: boolean;
  /** Keep the usage counters in a separate file instead of `data.json`. */
  storeUsageSeparately?: boolean;
  customLanguages: LanguageCode[];
  usedCount: UsedCount;
}

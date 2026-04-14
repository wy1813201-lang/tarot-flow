export interface CardInterpretation {
  position: string;
  card: string;
  meaning: string;
}

export interface ReadingSuggestions {
  actionableSteps: string;
  mindsetShift: string;
  warningSigns: string;
}

export interface ReadingInsights {
  portraitDepthAnalysis?: string;
  symbolResonance?: string;
  hiddenUndercurrent?: string;
  transformationKey?: string;
  portraitAssociation?: string;
  hiddenMessages?: string;
  portraitRevelation?: string;
}

export interface TarotReading {
  summary: string;
  eventPortrait?: string;
  detailedInterpretations: CardInterpretation[];
  overallTrend: string;
  suggestions: ReadingSuggestions;
  insights?: ReadingInsights;
  finalAdvice: string;
}

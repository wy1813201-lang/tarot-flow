/**
 * utils.ts - Pure functions for data extraction/manipulation
 */

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function splitSentences(value: string): string[] {
  return normalizeText(value)
    .split(/(?<=[。；！？.!?])\s*/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

export function splitActionableSteps(value: string): string[] {
  const lines = value
    .replace(/\r/g, '')
    .split(/\n+/)
    .flatMap((line) => {
      const normalized = line.trim();
      if (!normalized) return [];
      const matches = normalized.match(/\d+[.、)]\s*[^0-9]+(?=(?:\d+[.、)])|$)/g);
      return matches ?? [normalized];
    })
    .map((line) => line.replace(/^\d+[.、)]\s*/, '').trim())
    .filter(Boolean);
    
  // Fallback: If only one step was extracted but it's a paragraph, AI might have outputted plain sentences instead of a list.
  if (lines.length === 1 && lines[0].length > 10) {
    const singleBlock = lines[0];
    const sentences = singleBlock.split(/(?<=[。！？.!?])\s*/).filter(Boolean).map(s => s.trim()).filter(s => s.length > 3);
    if (sentences.length > 1) {
      return sentences;
    }
  }

  return lines;
}

export function getExcerpt(value: string, numSentences = 2): string {
  const normalized = normalizeText(value);
  const sentences = splitSentences(normalized);
  
  if (sentences.length <= numSentences) {
    return normalized;
  }
  
  return sentences.slice(0, numSentences).join(' ') + '...';
}

export function getCharacterExcerpt(value: string, maxChars: number): string {
  const normalized = normalizeText(value);
  if (normalized.length <= maxChars) return normalized;
  return normalized
    .slice(0, maxChars)
    .trimEnd()
    .replace(/[，、；：,.!?！？。]+$/g, '') + '...';
}

export function splitMeaningLayers(value: string): { contextualLead: string | null; focusedInterpretation: string } {
  const sentences = splitSentences(value);
  if (sentences.length <= 1) {
    const normalized = normalizeText(value);
    return { contextualLead: null, focusedInterpretation: normalized };
  }

  return {
    contextualLead: sentences[0],
    focusedInterpretation: sentences.slice(1).join(' ').trim() || normalizeText(value),
  };
}

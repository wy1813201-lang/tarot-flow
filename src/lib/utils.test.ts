import { describe, it, expect } from 'vitest';
import { splitActionableSteps, getExcerpt, getCharacterExcerpt, splitMeaningLayers } from './utils';

describe('utils', () => {
  describe('splitActionableSteps', () => {
    it('splits numbered lists correctly', () => {
      const input = "1. 第一步\n2. 第二步\n3. 第三步";
      expect(splitActionableSteps(input)).toEqual(['第一步', '第二步', '第三步']);
    });

    it('handles AI raw text with robust fallback', () => {
      // Very long line without numbers
      const input = "这是一个建议。这是第二个建议。这是第三个建议。";
      const result = splitActionableSteps(input);
      expect(result).length.greaterThan(1);
      expect(result[0]).toContain("这是一个建议");
    });
  });

  describe('getExcerpt', () => {
    it('truncates correctly based on sentence boundaries', () => {
      const text = "这是第一句。这是第二句；这是第三句！这是第四句。";
      const excerpt = getExcerpt(text, 2);
      expect(excerpt).toBe("这是第一句。 这是第二句；...");
    });

    it('returns full text if less than N sentences', () => {
      const text = "只有一句。";
      expect(getExcerpt(text, 2)).toBe("只有一句。");
    });
  });

  describe('getCharacterExcerpt', () => {
    it('truncates long text by character count', () => {
      const text = "这是一段比较长的说明文字，需要在指定字符数之后被截断。";
      expect(getCharacterExcerpt(text, 12)).toBe("这是一段比较长的说明文字...");
    });
  });

  describe('splitMeaningLayers', () => {
    it('splits scene-setting lead from focused interpretation', () => {
      const text = "你正站在门口感受到风压。真正的问题是你还没有厘清边界。现在先谈清责任。";
      expect(splitMeaningLayers(text)).toEqual({
        contextualLead: "你正站在门口感受到风压。",
        focusedInterpretation: "真正的问题是你还没有厘清边界。 现在先谈清责任。",
      });
    });

    it('keeps single-sentence interpretation intact', () => {
      const text = "先明确边界，再决定是否投入。";
      expect(splitMeaningLayers(text)).toEqual({
        contextualLead: null,
        focusedInterpretation: text,
      });
    });
  });
});

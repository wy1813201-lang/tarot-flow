import { TarotCard, TAROT_CARDS } from '../constants/tarot';
import { TarotReading } from '../types/reading';

export interface TarotSession {
  id?: string;
  uid: string;
  question: string;
  spreadType: string;
  isStrictMode: boolean;
  shuffledDeck: number[];
  orientations: ("upright" | "reversed")[];
  hash: string;
  chosenNumbers?: number[];
  reading?: TarotReading;
  createdAt: string;
}

export function shuffleDeck(): { deck: number[]; orientations: ("upright" | "reversed")[] } {
  const deck = TAROT_CARDS.map(c => c.id);
  const orientations: ("upright" | "reversed")[] = [];

  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  for (let i = 0; i < deck.length; i++) {
    orientations.push(Math.random() > 0.5 ? "upright" : "reversed");
  }

  return { deck, orientations };
}

export async function generateHash(deck: number[], orientations: string[], sessionId: string): Promise<string> {
  const data = JSON.stringify({ deck, orientations, sessionId });
  const msgBuffer = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function getCardsFromSelection(deck: number[], orientations: ("upright" | "reversed")[], chosenNumbers: number[]) {
  return chosenNumbers.map(num => {
    const index = num - 1;
    const cardId = deck[index];
    const card = TAROT_CARDS.find(c => c.id === cardId)!;
    return {
      ...card,
      orientation: orientations[index],
      chosenNumber: num
    };
  });
}

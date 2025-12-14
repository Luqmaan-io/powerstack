export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  value: number; // For sorting/logic (A=1 or 14, J=11, etc)
}

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  isBot: boolean;
  avatar: string;
}

export type GamePhase = 'playing' | 'selecting_suit' | 'game_over';

export interface GameState {
  deck: Card[];
  pile: Card[];
  players: Player[];
  currentPlayerIndex: number;
  direction: 1 | -1; // 1 = clockwise, -1 = counter-clockwise
  penaltyStack: number; // For 2s and Black Jacks
  activeSuit: Suit | null; // For Aces
  winner: string | null;
  turnPhase: GamePhase;
  message: string;
}

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export function createDeck(): Card[] {
  const deck: Card[] = [];
  SUITS.forEach(suit => {
    RANKS.forEach((rank, index) => {
      deck.push({
        id: `${rank}-${suit}`,
        suit,
        rank,
        value: index + 1
      });
    });
  });
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  return [...deck].sort(() => Math.random() - 0.5);
}

export function isValidMove(prevCard: Card, nextCard: Card, activeSuit: Suit | null, penaltyStack: number = 0): boolean {
  // Penalty Handling
  if (penaltyStack > 0) {
    // If penalty is active, you MUST play a counter card
    // 2 counters 2
    if (prevCard.rank === '2' && nextCard.rank === '2') return true;
    
    // Red Jack counters Black Jack
    const isBlackJack = prevCard.rank === 'J' && (prevCard.suit === 'spades' || prevCard.suit === 'clubs');
    const isRedJack = nextCard.rank === 'J' && (nextCard.suit === 'hearts' || nextCard.suit === 'diamonds');
    
    if (isBlackJack && isRedJack) return true;

    // Otherwise, you cannot play (must pick up)
    return false;
  }

  // If active suit is set (from Ace), next card must match active suit
  if (activeSuit) {
    return nextCard.suit === activeSuit || nextCard.rank === 'A';
  }

  // Same Suit
  if (prevCard.suit === nextCard.suit) {
    // Standard match
    return true; 
  }

  // Same Rank
  if (prevCard.rank === nextCard.rank) {
    return true;
  }
  
  // Power card rules that override?
  // Ace can be played on anything (usually)
  if (nextCard.rank === 'A') return true;

  return false;
}

export function isValidCombo(cards: Card[], topCard: Card, activeSuit: Suit | null, penaltyStack: number = 0): boolean {
  if (cards.length === 0) return false;

  // First card must be valid on top of pile
  if (!isValidMove(topCard, cards[0], activeSuit, penaltyStack)) return false;

  // Subsequent cards must form a chain
  for (let i = 0; i < cards.length - 1; i++) {
    const current = cards[i];
    const next = cards[i+1];
    
    // If in penalty mode, subsequent cards must ALSO be counters if we are stacking?
    // User says: "Placing a 2 down means the next player has to pick up 2 cards or place another 2 down to stack"
    // This implies you can stack multiple 2s in one turn?
    // "if a player place 2 8's that would mean the next 2 players miss a go"
    // Yes, stacking is allowed in one turn.
    
    if (penaltyStack > 0) {
        // If we started a counter chain, subsequent cards must continue it?
        // Actually, isValidMove already checked the first one.
        // If the first one was a '2', the penaltyStack for the *next* card in the combo is technically irrelevant 
        // because we are the current player adding to it.
        // But we should ensure consistency. 
        // If I play 2H on 2D, I can then play 2S on 2H? Yes.
        // Can I play 3S on 2S? 
        // If I played a 2, I am adding to the penalty. I shouldn't be able to switch to a normal card unless it's a specific rule.
        // Usually, if you play a power card, you can continue a combo.
        // Let's stick to standard combo rules.
    }

    const isSameRank = current.rank === next.rank;
    const isSameSuit = current.suit === next.suit;
    
    // Check for Ascending/Descending Rank in Same Suit
    // We need numeric values for this
    const valCurr = getRankValue(current.rank);
    const valNext = getRankValue(next.rank);
    const diff = Math.abs(valCurr - valNext);
    const isSequence = isSameSuit && (diff === 1 || diff === 12); // 12 allows K-A wrap if desired, usually just 1

    if (!isSameRank && !isSequence) {
      return false;
    }
  }

  return true;
}

function getRankValue(rank: Rank): number {
  const map: Record<Rank, number> = {
    'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
  };
  return map[rank];
}

export function getInitialState(): GameState {
  let deck = shuffleDeck(createDeck());
  const players: Player[] = [
    { id: 'p1', name: 'You', hand: [], isBot: false, avatar: '👤' },
    { id: 'p2', name: 'Bot West', hand: [], isBot: true, avatar: '🤖' },
    { id: 'p3', name: 'Bot North', hand: [], isBot: true, avatar: '👽' },
    { id: 'p4', name: 'Bot East', hand: [], isBot: true, avatar: '👾' },
  ];

  // Deal 7 cards to each
  players.forEach(p => {
    p.hand = deck.splice(0, 7);
  });

  // Flip top card
  const pile = [deck.shift()!];

  return {
    deck,
    pile,
    players,
    currentPlayerIndex: 0,
    direction: 1,
    penaltyStack: 0,
    activeSuit: null,
    winner: null,
    turnPhase: 'playing',
    message: "Game Started! Your Turn."
  };
}

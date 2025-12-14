import React, { useState, useEffect, useReducer } from 'react';
import { Card as CardType, GameState, getInitialState, createDeck, shuffleDeck, isValidMove, isValidCombo, Suit } from '@/lib/game';
import { Hand } from './Hand';
import { Card } from './Card';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Club, Diamond, Heart, Spade } from 'lucide-react';
import tableTexture from '@assets/generated_images/dark_luxury_poker_table_felt_texture.png';

// Simplified Reducer for the Prototype
type Action = 
  | { type: 'START_GAME' }
  | { type: 'DRAW_CARD' }
  | { type: 'PLAY_CARDS', cards: CardType[] }
  | { type: 'CHANGE_SUIT', suit: Suit }
  | { type: 'BOT_TURN' }
  | { type: 'PASS_TURN' };

const gameReducer = (state: GameState, action: Action): GameState => {
  switch (action.type) {
    case 'START_GAME':
      return getInitialState();
    
    case 'DRAW_CARD': {
      if (state.deck.length === 0) return state; // Handle empty deck later (reshuffle pile)
      
      const newDeck = [...state.deck];
      const newPlayers = [...state.players];
      const player = newPlayers[state.currentPlayerIndex];
      
      // Draw Logic (handle penalty stack)
      const drawCount = state.penaltyStack > 0 ? state.penaltyStack : 1;
      
      // Check if deck has enough cards
      if (newDeck.length < drawCount) {
         // Reshuffle pile into deck (simplified: just add pile back excluding top card)
         // For now, just draw what we can
      }

      const drawnCards = newDeck.splice(0, Math.min(drawCount, newDeck.length));
      player.hand = [...player.hand, ...drawnCards];
      
      return {
        ...state,
        deck: newDeck,
        players: newPlayers,
        penaltyStack: 0, // Reset penalty after drawing
        message: `Player ${player.name} drew ${drawnCards.length} cards`,
        currentPlayerIndex: (state.currentPlayerIndex + state.direction + 4) % 4,
      };
    }

    case 'PLAY_CARDS': {
      const cards = action.cards;
      if (cards.length === 0) return state;

      const newPlayers = [...state.players];
      const currentPlayer = newPlayers[state.currentPlayerIndex];
      const newPile = [...state.pile, ...cards];
      
      // Remove played cards from hand
      currentPlayer.hand = currentPlayer.hand.filter(c => !cards.find(played => played.id === c.id));
      
      const lastCard = cards[cards.length - 1];
      let newDirection = state.direction;
      let newPenalty = state.penaltyStack;
      let newPhase = state.turnPhase;
      let newActiveSuit = null; // Reset unless Ace

      // Special Card Logic
      // 8: Skip Logic (Count 8s)
      const eightCount = cards.filter(c => c.rank === '8').length;
      
      // K: Reverse
      const kingCount = cards.filter(c => c.rank === 'K').length;
      if (kingCount % 2 === 1) {
        newDirection = state.direction * -1 as 1 | -1;
      }

      // 2: Pickup 2
      if (lastCard.rank === '2') {
        // Only count consecutive 2s at the end of the combo? 
        // Or all 2s played? User says "stack to penalty".
        // If I play 2-2-2, that's +6.
        const twoCount = cards.filter(c => c.rank === '2').length;
        newPenalty += 2 * twoCount;
      }
      
      // Black Jack (J Spades/Clubs)
      // Check for Black Jacks in the combo
      const blackJackCount = cards.filter(c => c.rank === 'J' && (c.suit === 'spades' || c.suit === 'clubs')).length;
      if (blackJackCount > 0) {
        // Check if countered by Red Jack in the SAME combo?
        // Logic: If the LAST card is Black Jack, penalty is active.
        // If LAST card is Red Jack, penalty is cleared (if it was active).
        // Since we process the combo as a block:
        if (lastCard.rank === 'J' && (lastCard.suit === 'spades' || lastCard.suit === 'clubs')) {
            newPenalty += 7 * blackJackCount;
        } else if (lastCard.rank === 'J' && (lastCard.suit === 'hearts' || lastCard.suit === 'diamonds')) {
            // Cleared? Or just didn't add?
            // "unless they have the red jack to place on top"
            // So Red Jack cancels the penalty.
            // If I play Black Jack -> Red Jack, penalty is 0.
        }
      }

      // Ace: Change Suit
      if (lastCard.rank === 'A') {
        newPhase = 'selecting_suit';
      }

      // Check Win
      if (currentPlayer.hand.length === 0) {
         return { ...state, winner: currentPlayer.name, turnPhase: 'game_over', pile: newPile, players: newPlayers };
      }

      let nextIndex = state.currentPlayerIndex;
      
      // Advance Player logic
      if (newPhase !== 'selecting_suit') {
         // Advance 1 step normally
         let steps = 1;
         
         // If 8s were played, we skip players.
         // "if a player place 2 8's that would mean the next 2 players miss a go"
         // This means we advance 1 (normal) + 2 (skips) = 3 steps?
         // Or does it mean the next player is skipped, AND the one after that?
         // "next 2 players miss a go" -> Player A plays -> Player B (miss) -> Player C (miss) -> Player D (plays).
         // So we advance 1 + 2 = 3 steps.
         if (eightCount > 0) {
             steps += eightCount;
         }
         
         nextIndex = (state.currentPlayerIndex + (steps * newDirection) + 400) % 4; // Add large number to handle negative modulo
      }

      return {
        ...state,
        players: newPlayers,
        pile: newPile,
        direction: newDirection,
        penaltyStack: newPenalty,
        currentPlayerIndex: nextIndex,
        turnPhase: newPhase,
        activeSuit: newActiveSuit,
        message: `${currentPlayer.name} played ${cards.length} cards.`
      };
    }

    case 'CHANGE_SUIT':
      return {
        ...state,
        activeSuit: action.suit,
        turnPhase: 'playing',
        currentPlayerIndex: (state.currentPlayerIndex + state.direction + 4) % 4,
        message: `Suit changed to ${action.suit}`
      };

    case 'PASS_TURN':
        return {
            ...state,
            currentPlayerIndex: (state.currentPlayerIndex + state.direction + 4) % 4,
            message: `${state.players[state.currentPlayerIndex].name} passed.`
        };

    default:
      return state;
  }
};

export const GameArea = () => {
  const [state, dispatch] = useReducer(gameReducer, null, getInitialState);
  const [selectedCards, setSelectedCards] = useState<string[]>([]); // Changed to array to track order

  // Bot Turn Effect
  useEffect(() => {
    if (state.players[state.currentPlayerIndex].isBot && state.turnPhase === 'playing' && !state.winner) {
      const timer = setTimeout(() => {
        // Simple Bot Logic
        const bot = state.players[state.currentPlayerIndex];
        const topCard = state.pile[state.pile.length - 1];
        
        // Find first valid card
        const playableCard = bot.hand.find(c => isValidMove(topCard, c, state.activeSuit, state.penaltyStack));
        
        if (playableCard) {
            // Check if Ace (bot needs to pick suit - random for now)
            if (playableCard.rank === 'A') {
                 dispatch({ type: 'PLAY_CARDS', cards: [playableCard] });
                 // Small delay for suit pick
                 setTimeout(() => dispatch({ type: 'CHANGE_SUIT', suit: 'hearts' }), 500); 
            } else {
                dispatch({ type: 'PLAY_CARDS', cards: [playableCard] });
            }
        } else {
          dispatch({ type: 'DRAW_CARD' });
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [state.currentPlayerIndex, state.turnPhase, state.pile, state.players, state.winner, state.activeSuit, state.penaltyStack]);

  const handleCardClick = (card: CardType) => {
    if (state.players[state.currentPlayerIndex].isBot) return;

    setSelectedCards(prev => {
      const newArray = [...prev];
      if (newArray.includes(card.id)) {
        return newArray.filter(id => id !== card.id);
      } else {
        newArray.push(card.id);
        return newArray;
      }
    });
  };

  const handlePlay = () => {
    const playerHand = state.players[0].hand;
    
    // Get selected cards respecting SELECTION ORDER
    // We map the IDs in selectedCards array to actual card objects
    const cardsToPlay = selectedCards
        .map(id => playerHand.find(c => c.id === id))
        .filter((c): c is CardType => !!c); // Type guard to remove undefined
    
    // VALIDATION 1: Queen Rule
    // "Queen cards have to be covered with another card of the same suit."
    // If last card is Q, prevent play.
    const lastCard = cardsToPlay[cardsToPlay.length - 1];
    const endsOnQueen = lastCard && lastCard.rank === 'Q';

    const topCard = state.pile[state.pile.length - 1];
    
    if (isValidCombo(cardsToPlay, topCard, state.activeSuit, state.penaltyStack)) {
      if (endsOnQueen) {
          toast({
            title: "Must cover Queen",
            description: "You cannot end your turn on a Queen.",
            variant: "destructive"
          });
          return;
      }
      dispatch({ type: 'PLAY_CARDS', cards: cardsToPlay });
      setSelectedCards([]);
    } else {
         toast({
            title: "Invalid Move",
            description: "That combo doesn't match the rules. Check your selection order.",
            variant: "destructive"
          });
    }
  };

  const currentPlayer = state.players[state.currentPlayerIndex];
  const isPlayerTurn = !currentPlayer.isBot;
  const topCard = state.pile[state.pile.length - 1];

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden flex flex-col items-center justify-between p-2 sm:p-4">
      {/* Background Image Layer */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-80"
        style={{
            backgroundImage: `url(${tableTexture})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
        }}
      />
      
      {/* Top Opponent (North) */}
      <div className="z-10 w-full flex justify-center py-2 shrink-0">
        <div className="flex flex-col items-center scale-75 origin-top sm:scale-100">
             <div className="w-12 h-12 bg-zinc-800 rounded-full border-2 border-primary flex items-center justify-center text-2xl mb-2 shadow-lg">
                {state.players[2].avatar}
             </div>
            <Hand cards={state.players[2].hand} isCurrentPlayer={false} position="top" />
             <span className="text-white/50 text-xs mt-1">{state.players[2].name} ({state.players[2].hand.length})</span>
        </div>
      </div>

      {/* Middle Row: West, Table, East */}
      <div className="z-10 flex-1 w-full flex items-center justify-between px-2 sm:px-8 min-h-0">
        {/* West */}
        <div className="flex flex-col items-center -rotate-90 scale-75 sm:scale-100 origin-left">
             <div className="w-12 h-12 bg-zinc-800 rounded-full border-2 border-primary flex items-center justify-center text-2xl mb-2 shadow-lg transform rotate-90">
                {state.players[1].avatar}
             </div>
            <Hand cards={state.players[1].hand} isCurrentPlayer={false} position="left" />
             <span className="text-white/50 text-xs mt-1 transform rotate-90">{state.players[1].name} ({state.players[1].hand.length})</span>
        </div>

        {/* TABLE CENTER */}
        <div className="flex flex-col items-center gap-4 sm:gap-8 scale-90 sm:scale-100">
            {/* Game Message */}
            <div className="h-6 sm:h-8 text-primary font-serif text-lg sm:text-xl animate-pulse text-center whitespace-nowrap">
                {state.message}
            </div>

            <div className="flex items-center gap-8 sm:gap-12">
                {/* Deck */}
                <div 
                    className="relative w-24 h-36 bg-indigo-950 rounded-xl border-2 border-indigo-900 shadow-2xl cursor-pointer hover:scale-105 transition-transform group"
                    onClick={() => isPlayerTurn && dispatch({ type: 'DRAW_CARD' })}
                >
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-indigo-500/30 font-bold text-3xl group-hover:text-indigo-400/50 transition-colors">DECK</span>
                    </div>
                     {/* Deck height visual */}
                     {state.deck.length > 0 && <div className="absolute top-0.5 left-0.5 w-full h-full bg-indigo-950 rounded-xl border-2 border-indigo-900 -z-10" />}
                     {state.deck.length > 1 && <div className="absolute top-1 left-1 w-full h-full bg-indigo-950 rounded-xl border-2 border-indigo-900 -z-20" />}
                </div>

                {/* Play Pile */}
                <div className="relative w-24 h-36">
                    {state.pile.slice(-5).map((card, i) => (
                        <div key={card.id} className="absolute inset-0 transition-transform duration-500" style={{ transform: `rotate(${i * 5 - 10}deg) translate(${i * 2}px, ${i * -2}px)` }}>
                             <Card card={card} />
                        </div>
                    ))}
                    {state.activeSuit && (
                        <div className="absolute -top-12 -right-12 bg-zinc-900/90 p-2 rounded-full border border-primary animate-bounce z-50">
                           <span className="text-xs text-white uppercase block text-center text-[10px] mb-1">Active Suit</span>
                           <div className="flex justify-center">
                            <SuitIcon suit={state.activeSuit} className={`w-6 h-6 ${state.activeSuit === 'hearts' || state.activeSuit === 'diamonds' ? 'text-red-500' : 'text-white'}`} />
                           </div>
                        </div>
                    )}
                     {state.penaltyStack > 0 && (
                        <div className="absolute -bottom-12 -right-12 bg-destructive/90 p-2 rounded-full border border-destructive-foreground animate-pulse z-50 w-12 h-12 flex items-center justify-center">
                           <span className="text-lg font-bold text-white">+{state.penaltyStack}</span>
                        </div>
                    )}
                </div>
            </div>
            
            {state.turnPhase === 'selecting_suit' && isPlayerTurn && (
                <div className="bg-zinc-900/95 p-6 rounded-xl border border-primary/50 backdrop-blur-md shadow-2xl z-50 animate-in fade-in zoom-in duration-300">
                    <p className="text-white mb-4 text-center font-serif text-lg">Choose a Suit</p>
                    <div className="flex gap-4">
                        {(['hearts', 'diamonds', 'clubs', 'spades'] as Suit[]).map(suit => (
                            <Button key={suit} variant="outline" className="w-16 h-16 p-0 rounded-full hover:scale-110 transition-transform border-2 hover:border-primary" onClick={() => dispatch({ type: 'CHANGE_SUIT', suit })}>
                                <SuitIcon suit={suit} className="w-8 h-8" />
                            </Button>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {/* East */}
        <div className="flex flex-col items-center rotate-90 scale-75 sm:scale-100 origin-right">
             <div className="w-12 h-12 bg-zinc-800 rounded-full border-2 border-primary flex items-center justify-center text-2xl mb-2 shadow-lg transform -rotate-90">
                {state.players[3].avatar}
             </div>
            <Hand cards={state.players[3].hand} isCurrentPlayer={false} position="right" />
             <span className="text-white/50 text-xs mt-1 transform -rotate-90">{state.players[3].name} ({state.players[3].hand.length})</span>
        </div>
      </div>

      {/* Player (South) */}
      <div className="z-20 w-full flex flex-col items-center justify-end pb-2 sm:pb-8 gap-2 sm:gap-6 shrink-0">
        {state.winner ? (
             <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-1000">
                <div className="text-center p-12 bg-zinc-900 border border-gold-500 rounded-3xl shadow-2xl">
                    <h1 className="text-7xl font-serif text-primary mb-6">Game Over</h1>
                    <p className="text-4xl text-white mb-12">{state.winner} Wins!</p>
                    <Button size="lg" className="text-xl px-12 py-8 bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => dispatch({ type: 'START_GAME' })}>Play Again</Button>
                </div>
             </div>
        ) : (
            <>
                <div className="flex gap-4 mb-2">
                    <Button 
                        disabled={!isPlayerTurn || selectedCards.length === 0} 
                        onClick={handlePlay}
                        className={cn(
                          "bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-10 py-6 text-lg shadow-lg shadow-primary/20 transition-all",
                          (!isPlayerTurn || selectedCards.length === 0) && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        PLAY SELECTED ({selectedCards.length})
                    </Button>
                     <Button 
                        variant="secondary"
                        disabled={!isPlayerTurn} 
                        onClick={() => dispatch({ type: 'DRAW_CARD' })}
                        className="px-8 py-6 text-lg bg-zinc-800 text-white hover:bg-zinc-700"
                    >
                        {state.penaltyStack > 0 ? `Pick Up ${state.penaltyStack}` : "Draw Card"}
                    </Button>
                </div>
                <Hand 
                    cards={state.players[0].hand} 
                    isCurrentPlayer={true} 
                    onCardClick={handleCardClick}
                    selectedCards={new Set(selectedCards)}
                    position="bottom"
                />
            </>
        )}
      </div>
    </div>
  );
};

const SuitIcon = ({ suit, className }: { suit: Suit, className?: string }) => {
  const icons = {
      hearts: <Heart className={cn("fill-current text-red-500", className)} />,
      diamonds: <Diamond className={cn("fill-current text-red-500", className)} />,
      clubs: <Club className={cn("fill-current text-white", className)} />,
      spades: <Spade className={cn("fill-current text-white", className)} />
  };
  return icons[suit];
};

import { Card as CardType } from '@/lib/game';
import { Card } from './Card';
import { motion, AnimatePresence } from 'framer-motion';

interface HandProps {
  cards: CardType[];
  isCurrentPlayer: boolean;
  onCardClick?: (card: CardType) => void;
  selectedCards?: Set<string>;
  position: 'bottom' | 'top' | 'left' | 'right';
}

export const Hand = ({ cards, isCurrentPlayer, onCardClick, selectedCards, position }: HandProps) => {
  const isHorizontal = position === 'bottom' || position === 'top';
  
  if (!isCurrentPlayer) {
    // Compact View for Opponents
    // Only show card back count
    return (
      <div className={`flex items-center justify-center p-2`}>
        <div className="relative w-16 h-24 bg-indigo-900 rounded-lg border-2 border-indigo-950 shadow-xl overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-repeat flex flex-col items-center justify-center group">
             {/* Stack effect */}
             {cards.length > 1 && <div className="absolute inset-0 bg-indigo-900/50 rounded-lg border-2 border-indigo-950 transform rotate-3 translate-x-1 translate-y-1 -z-10" />}
             {cards.length > 2 && <div className="absolute inset-0 bg-indigo-900/30 rounded-lg border-2 border-indigo-950 transform -rotate-2 -translate-x-1 -translate-y-1 -z-20" />}
             
             <div className="absolute inset-2 border border-indigo-500/30 rounded flex items-center justify-center">
                 <span className="text-white font-bold text-xl">{cards.length}</span>
             </div>
        </div>
      </div>
    );
  }

  // Fanned View for Player (Bottom)
  // We assume player is always at 'bottom' for the complex fan
  if (position === 'bottom') {
      const totalCards = cards.length;
      // Max spread angle: 60 degrees?
      // Center is 0.
      // angle per card depends on total cards.
      // if 1 card: 0
      // if 2 cards: -5, 5
      // if 5 cards: -10, -5, 0, 5, 10 (step 5)
      
      const MAX_ANGLE = 60;
      const angleStep = Math.min(MAX_ANGLE / (totalCards - 1 || 1), 6); // Cap step at 6 degrees
      
      return (
        <div className="h-48 w-full flex items-end justify-center pb-4 overflow-visible">
            <div className="relative w-full max-w-3xl h-32 flex justify-center items-end">
                <AnimatePresence>
                    {cards.map((card, index) => {
                        // Calculate fan
                        // center index
                        const center = (totalCards - 1) / 2;
                        const distFromCenter = index - center;
                        const rotate = distFromCenter * angleStep;
                        
                        // Y offset (arch)
                        // y = x^2 parabola approx
                        const yOffset = Math.abs(distFromCenter) * 4; // pushed down on sides
                        
                        const isSelected = selectedCards?.has(card.id);

                        return (
                            <motion.div
                                key={card.id}
                                className="absolute origin-bottom"
                                initial={{ opacity: 0, y: 100, rotate: 0 }}
                                animate={{ 
                                    opacity: 1, 
                                    y: isSelected ? -30 - yOffset : 0 + yOffset, // Lift up if selected, else sit in arch
                                    rotate: rotate,
                                    x: distFromCenter * 30, // Horizontal spread
                                    zIndex: index
                                }}
                                exit={{ opacity: 0, scale: 0.5, y: 100 }}
                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                style={{ 
                                    bottom: 0,
                                }}
                            >
                                <Card 
                                    card={card} 
                                    isHidden={false} 
                                    onClick={() => onCardClick && onCardClick(card)}
                                    isSelected={isSelected}
                                    className="border-black/20 shadow-xl hover:brightness-110"
                                />
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
      );
  }

  // Fallback for other positions if ever used for player (shouldn't be)
  return (
    <div className={`flex items-center justify-center ${isHorizontal ? 'h-48 w-full' : 'h-full w-48 flex-col'}`}>
      <div className={`relative flex ${isHorizontal ? 'flex-row' : 'flex-col'} items-center justify-center`}>
        <AnimatePresence>
          {cards.map((card, index) => {
            // Calculate overlap
            const overlap = isHorizontal ? -40 : -80;
            const style = isHorizontal 
              ? { marginLeft: index === 0 ? 0 : overlap } 
              : { marginTop: index === 0 ? 0 : overlap };

            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, scale: 0.8, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ delay: index * 0.05 }}
                style={{ zIndex: index }}
              >
                <Card 
                  card={card} 
                  isHidden={!isCurrentPlayer} 
                  onClick={isCurrentPlayer ? () => onCardClick && onCardClick(card) : undefined}
                  isSelected={selectedCards?.has(card.id)}
                  className={`border border-black/10`}
                  style={style}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

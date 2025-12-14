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

import React from 'react';
import { motion } from 'framer-motion';
import { Card as CardType, Suit, Rank } from '@/lib/game';
import { cn } from '@/lib/utils';
import { Club, Diamond, Heart, Spade } from 'lucide-react';

interface CardProps {
  card: CardType;
  isSelected?: boolean;
  onClick?: () => void;
  isHidden?: boolean; // For opponent cards
  isPlayable?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

const SuitIcon = ({ suit, className }: { suit: Suit, className?: string }) => {
  switch (suit) {
    case 'hearts': return <Heart className={cn("fill-current", className)} />;
    case 'diamonds': return <Diamond className={cn("fill-current", className)} />;
    case 'clubs': return <Club className={cn("fill-current", className)} />;
    case 'spades': return <Spade className={cn("fill-current", className)} />;
  }
};

export const Card = ({ card, isSelected, onClick, isHidden, isPlayable, style, className }: CardProps) => {
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  
  if (isHidden) {
    return (
      <motion.div
        layoutId={`card-${card.id}`}
        className={cn(
          "relative w-24 h-36 bg-indigo-900 rounded-xl border-2 border-indigo-950 shadow-xl overflow-hidden",
          "bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-repeat",
          className
        )}
        style={style}
      >
        <div className="absolute inset-2 border border-indigo-500/30 rounded-lg flex items-center justify-center">
            <div className="w-12 h-12 rounded-full border-2 border-indigo-400/20 flex items-center justify-center">
                <span className="text-indigo-400/40 font-serif text-2xl font-bold">R</span>
            </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layoutId={`card-${card.id}`}
      onClick={onClick}
      whileHover={{ y: -10, scale: 1.05 }}
      animate={{ 
        y: isSelected ? -20 : 0,
        boxShadow: isSelected ? "0 0 20px rgba(255, 215, 0, 0.6)" : "0 4px 6px -1px rgba(0, 0, 0, 0.3)"
      }}
      className={cn(
        "relative w-24 h-36 bg-zinc-100 rounded-xl shadow-md cursor-pointer select-none transition-colors duration-200",
        isRed ? "text-red-600" : "text-slate-900",
        isPlayable && !isSelected && "ring-2 ring-emerald-500/50",
        isSelected && "ring-4 ring-amber-400 z-10",
        className
      )}
      style={style}
    >
      {/* Top Left */}
      <div className="absolute top-2 left-2 flex flex-col items-center leading-none">
        <span className="text-xl font-bold font-serif">{card.rank}</span>
        <SuitIcon suit={card.suit} className="w-4 h-4 mt-1" />
      </div>

      {/* Center Big Icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <SuitIcon suit={card.suit} className="w-12 h-12 opacity-20" />
      </div>

      {/* Bottom Right (Rotated) */}
      <div className="absolute bottom-2 right-2 flex flex-col items-center leading-none transform rotate-180">
        <span className="text-xl font-bold font-serif">{card.rank}</span>
        <SuitIcon suit={card.suit} className="w-4 h-4 mt-1" />
      </div>
    </motion.div>
  );
};

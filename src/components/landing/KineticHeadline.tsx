'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface KineticHeadlineProps {
  className?: string;
}

export default function KineticHeadline({ className }: KineticHeadlineProps) {
  // Kinetic 3D text roll-in matching text.mp4
  // Line 1: "The Future of"
  // Line 2: "Rewarding Sustainability" with "Rewarding" in Instrument Serif italic
  const lines = [
    [
      { text: 'The', italic: false },
      { text: 'Future', italic: false },
      { text: 'of', italic: false },
    ],
    [
      { text: 'Rewarding', italic: true },
      { text: 'Sustainability', italic: false },
    ],
  ];

  let totalCharIndex = 0;

  return (
    <h1
      className={`text-center font-display text-5xl md:text-6xl lg:text-[4.8rem] leading-[0.96] tracking-tight text-foreground max-w-2xl perspective-container ${className || ''}`}
      style={{ perspective: 1200 }}
    >
      {lines.map((line, lineIdx) => (
        <span key={lineIdx} className="block overflow-visible">
          {line.map((word, wordIdx) => {
            const chars = word.text.split('');
            return (
              <span
                key={wordIdx}
                className={`inline-block mr-2.5 sm:mr-3.5 whitespace-nowrap ${
                  word.italic ? 'italic font-normal text-emerald-800' : 'font-normal'
                }`}
              >
                {chars.map((char, charIdx) => {
                  const delay = 0.1 + totalCharIndex * 0.03;
                  totalCharIndex++;
                  return (
                    <motion.span
                      key={charIdx}
                      initial={{
                        opacity: 0,
                        rotateY: -70,
                        rotateX: 18,
                        z: -90,
                        filter: 'blur(10px)',
                      }}
                      animate={{
                        opacity: 1,
                        rotateY: 0,
                        rotateX: 0,
                        z: 0,
                        filter: 'blur(0px)',
                      }}
                      transition={{
                        duration: 0.85,
                        delay,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className="inline-block transform-gpu origin-left hover:text-emerald-700 transition-colors duration-300"
                      style={{ transformStyle: 'preserve-3d' }}
                    >
                      {char}
                    </motion.span>
                  );
                })}
              </span>
            );
          })}
        </span>
      ))}
    </h1>
  );
}

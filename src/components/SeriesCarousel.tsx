"use client";

import React, { useRef } from "react";
import Link from "next/link";
export default function SeriesCarousel({ seriesList, bgColor, categorySlug }: { seriesList: string[], bgColor: string, categorySlug?: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const [isDown, setIsDown] = React.useState(false);
  const [startX, setStartX] = React.useState(0);
  const [scrollLeftState, setScrollLeftState] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);

  const onMouseDown = (e: React.MouseEvent) => {
    setIsDown(true);
    setIsDragging(false);
    if (scrollRef.current) {
      setStartX(e.pageX - scrollRef.current.offsetLeft);
      setScrollLeftState(scrollRef.current.scrollLeft);
    }
  };

  const onMouseLeave = () => {
    setIsDown(false);
  };

  const onMouseUp = () => {
    setIsDown(false);
    // Timeout to allow click handler to read isDragging before it resets
    setTimeout(() => setIsDragging(false), 50);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDown || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Scroll multiplier
    if (Math.abs(walk) > 5) {
      setIsDragging(true);
    }
    scrollRef.current.scrollLeft = scrollLeftState - walk;
  };

  if (!seriesList || seriesList.length === 0) return null;
  
  const seeMoreLink = categorySlug ? `/series?category=${categorySlug}` : "/series";

  return (
    <div className="relative group w-full mb-12">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-black text-lg md:text-xl uppercase border-b-4 border-black inline-block px-2 transform -rotate-1 bg-white">
          Series Tersedia
        </h3>
        <Link href={seeMoreLink} className="px-4 py-2 bg-blue-300 font-black border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all uppercase text-sm md:text-base">
          See More →
        </Link>
      </div>

      <div 
        ref={scrollRef}
        onMouseDown={onMouseDown}
        onMouseLeave={onMouseLeave}
        onMouseUp={onMouseUp}
        onMouseMove={onMouseMove}
        className={`flex gap-4 overflow-x-auto ${isDragging ? '' : 'snap-x snap-mandatory'} hide-scrollbar pb-4 cursor-grab active:cursor-grabbing select-none`}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {seriesList.map((series, idx) => {
          // Buat tampilan menyerupai "Logo" dengan box Neo-Brutalism
          return (
            <Link 
              href={`/series/${encodeURIComponent(series.toLowerCase())}`} 
              key={idx} 
              onClick={(e) => {
                if (isDragging) {
                  e.preventDefault();
                }
              }}
              className="snap-center shrink-0 group/card block select-none"
              draggable={false}
            >
              <div 
                className={`w-48 md:w-64 h-24 md:h-32 ${bgColor} border-4 border-black flex items-center justify-center p-4 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-2 transition-all group-active/card:translate-y-0 group-active/card:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`}
              >
                <span className="font-black uppercase text-xl md:text-2xl tracking-tighter leading-none group-hover/card:scale-110 transition-transform mix-blend-color-burn select-none">
                  {series}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
      
      {/* CSS untuk hide scrollbar di Webkit (Chrome/Safari) */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}} />
    </div>
  );
}

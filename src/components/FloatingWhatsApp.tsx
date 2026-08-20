"use client";

import React from "react";
import Link from "next/link";

export default function FloatingWhatsApp() {
  const phoneNumber = "6285161868288"; // Format internasional tanpa tanda +
  const message = encodeURIComponent("Halo Min! Mau tanya-tanya soal produk Funko POP! nya nih.");
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;

  return (
    <Link 
      href={whatsappUrl} 
      target="_blank" 
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-[9999] group"
    >
      <div className="w-14 h-14 md:w-16 md:h-16 bg-green-400 border-4 border-black rounded-full flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-green-300 hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">
        {/* WhatsApp Icon (SVG) */}
        <svg 
          viewBox="0 0 24 24" 
          width="32" 
          height="32" 
          stroke="currentColor" 
          strokeWidth="2" 
          fill="none" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="text-black group-hover:scale-110 transition-transform"
        >
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
        </svg>
      </div>
      
      {/* Tooltip Hover (opsional) */}
      <div className="absolute right-full top-1/2 -translate-y-1/2 mr-4 bg-white border-2 border-black font-black uppercase text-xs px-3 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
        Chat Admin 💬
      </div>
    </Link>
  );
}

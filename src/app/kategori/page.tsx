import React from "react";
import Link from "next/link";

const ALL_CATEGORIES = [
  { name: "Anime", icon: "⚔️", color: "bg-orange-300", desc: "Naruto, One Piece, Demon Slayer..." },
  { name: "Marvel", icon: "🦸‍♂️", color: "bg-red-400", desc: "Avengers, Spider-Man, X-Men..." },
  { name: "DC", icon: "🦇", color: "bg-slate-400", desc: "Batman, Superman, Wonder Woman..." },
  { name: "Disney", icon: "🏰", color: "bg-blue-300", desc: "Mickey, Frozen, Toy Story..." },
  { name: "Movies", icon: "🍿", color: "bg-yellow-300", desc: "Star Wars, Harry Potter, Jurassic..." },
  { name: "Gaming", icon: "🎮", color: "bg-green-400", desc: "Pokemon, Mario, Zelda..." },
  { name: "WW", icon: "🪄", color: "bg-purple-300", desc: "Wizarding World, Fantastic Beasts..." },
  { name: "Music", icon: "🎸", color: "bg-pink-300", desc: "Queen, BTS, Blackpink..." },
  { name: "Sports", icon: "⚽", color: "bg-teal-300", desc: "NBA, Football, WWE..." },
  { name: "Lainnya", icon: "📦", color: "bg-gray-300", desc: "Kategori Lainnya & Exclusives..." }
];

export default function AllCategoriesPage() {
  return (
    <div className="pb-20 max-w-6xl mx-auto px-4 md:px-8 space-y-12">
      {/* Hero Banner */}
      <div className="bg-yellow-300 border-b-4 border-black p-8 md:p-16 shadow-[0px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden mt-8 flex flex-col items-center text-center animate-slide-in">
        <Link href="/">
          <button className="absolute top-4 left-4 md:top-6 md:left-6 px-4 py-2 bg-white font-black border-4 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform z-20">
            ← KEMBALI
          </button>
        </Link>
        <div className="relative z-10 pt-12 md:pt-4">
          <h2 className="text-xl md:text-2xl font-black uppercase mb-4 bg-white px-2 py-1 border-2 border-black inline-block transform -rotate-1">
            JELAJAHI SEMUA
          </h2>
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none bg-black text-white inline-block px-6 py-3 border-4 border-white transform rotate-1 shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
            KATEGORI
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pt-4">
        {ALL_CATEGORIES.map((cat) => (
          <Link href={`/kategori/${cat.name.toLowerCase()}`} key={cat.name} className="block group">
            <div className={`${cat.color} border-4 border-black p-6 md:p-8 flex flex-col items-center justify-center gap-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] group-hover:-translate-y-2 transition-all cursor-pointer h-48`}>
              <span className="text-5xl md:text-6xl group-hover:scale-125 transition-transform drop-shadow-md">{cat.icon}</span>
              <div className="text-center">
                <span className="font-black uppercase tracking-wider text-lg md:text-xl block">{cat.name}</span>
                <span className="text-xs font-bold opacity-80 mt-1 block">{cat.desc}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

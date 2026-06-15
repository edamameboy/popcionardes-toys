"use client";

import React, { useEffect, useState } from 'react';
import { useCartStore } from '@/store/cart';
import Link from 'next/link';

export default function NavbarCart() {
  const [mounted, setMounted] = useState(false);
  
  // Ambil state items secara langsung, agar Next.js re-render tiap ada perubahan!
  const items = useCartStore((state) => state.items);
  // Hitung total quantity
  const totalCount = items.reduce((acc, item) => acc + item.quantity, 0);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return (
     <button className="px-5 py-2 text-sm font-bold uppercase bg-green-400 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
       Keranjang (0)
     </button>
  );

  return (
    <Link href="/checkout" className="block cursor-pointer">
      <button className="px-5 py-2 text-sm font-bold uppercase bg-green-400 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">
        Keranjang ({totalCount})
      </button>
    </Link>
  );
}
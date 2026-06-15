"use client";

import React from 'react';
import { Product } from '@/types';
import { useCartStore } from '@/store/cart';

export default function AddToCartButton({ product }: { product: Product }) {
  const addItem = useCartStore((state) => state.addItem);

  const handleAdd = () => {
    addItem(product);
    alert(`⚡ Mantap! ${product.name} masuk keranjang!`);
  };

  return (
    <button 
      onClick={handleAdd}
      className="w-full py-3 mt-4 font-black uppercase bg-yellow-400 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 hover:bg-black hover:text-white transition-all"
    >
      + Keranjang
    </button>
  );
}
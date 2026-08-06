import { create } from 'zustand';
import { persist } from 'zustand/middleware'; // <-- JURUS RAHASIA: Import middleware persist

export type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  stock: number;
  image_url?: string;
};

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  decreaseQuantity: (id: string) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
}

// Tambahkan kurung kosong () sebelum (persist...) karena ini aturan TypeScript untuk Zustand
export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      
      // TAMBAH BARANG
      addItem: (item) => set((state) => {
        const existingItem = state.items.find((i) => i.id === item.id);
        if (existingItem) {
          // Cegah penambahan jika melebihi stok
          if (existingItem.quantity >= existingItem.stock) return state;
          return {
            items: state.items.map((i) =>
              i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
            ),
          };
        }
        return { items: [...state.items, { ...item, quantity: 1 }] };
      }),

      // KURANGI BARANG
      decreaseQuantity: (id) => set((state) => {
        const existingItem = state.items.find((i) => i.id === id);
        if (!existingItem) return state;

        // Jika jumlahnya 1 lalu dikurangi, maka hapus barang dari keranjang
        if (existingItem.quantity === 1) {
          return { items: state.items.filter((i) => i.id !== id) };
        }

        // Jika lebih dari 1, kurangi jumlahnya saja
        return {
          items: state.items.map((i) =>
            i.id === id ? { ...i, quantity: i.quantity - 1 } : i
          ),
        };
      }),

      // HAPUS BARANG (Tong Sampah)
      removeItem: (id) => set((state) => ({
        items: state.items.filter((i) => i.id !== id)
      })),

      // KOSONGKAN KERANJANG
      clearCart: () => set({ items: [] }),
    }),
    {
      name: 'popcionardes-cart-storage', // <-- NAMA BRANKAS: Semua data disimpan ke kunci ini di localStorage
    }
  )
);
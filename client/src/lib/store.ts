// store.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiRequest } from '@/lib/queryClient';
import { useQueryClient } from '@tanstack/react-query';

interface CartItem {
  id: number;
  productId: number;
  name: string;
  price: string;
  image: string;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  sessionId: string;
  addItem: (item: Omit<CartItem, 'id'>) => Promise<void>;
  removeItem: (id: number) => Promise<void>;
  updateQuantity: (id: number, quantity: number) => Promise<void>;
  setItems: (items: CartItem[]) => void;
  clearCart: () => Promise<void>;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

const getQueryClient = () => {
  try {
    return useQueryClient();
  } catch (e) {
    return null;
  }
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      sessionId: Math.random().toString(36).substring(2, 15),

      addItem: async (newItem) => {
        try {
          const queryClient = getQueryClient();
          if (!queryClient) return;

          await apiRequest("POST", "/api/cart/add", {
            productId: newItem.productId,
            quantity: newItem.quantity || 1,
          });

          queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
        } catch (error) {
          console.error("Failed to add item via API:", error);
        }
      },

      removeItem: async (id) => {
        try {
          const queryClient = getQueryClient();
          if (!queryClient) return;
          
          await apiRequest("DELETE", `/api/cart/${id}`);
          queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
        } catch (error) {
          console.error("Failed to remove item via API:", error);
        }
      },

      updateQuantity: async (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id);
          return;
        }

        try {
          const queryClient = getQueryClient();
          if (!queryClient) return;
          
          await apiRequest("PUT", `/api/cart/${id}`, { quantity });
          queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
        } catch (error) {
          console.error("Failed to update quantity via API:", error);
        }
      },

      setItems: (newItems) => {
        set({ items: newItems });
      },

      clearCart: async () => {
        try {
          const queryClient = getQueryClient();
          if (!queryClient) return;

          await apiRequest("DELETE", "/api/cart/clear");
          queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
        } catch (error) {
          console.error("Failed to clear cart via API:", error);
        }
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce((total, item) => total + (parseFloat(item.price) * item.quantity), 0);
      },
    }),
    {
      name: 'cart-storage',
    }
  )
);

// ✅ Seller Registration Store को वापस जोड़ा गया है
interface SellerRegistrationStore {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const useSellerRegistrationStore = create<SellerRegistrationStore>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));

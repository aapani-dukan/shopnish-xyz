// Store.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiRequest } from '@/lib/queryClient';
import { useQueryClient } from '@tanstack/react-query'; // `useQueryClient` को इंपोर्ट करें

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

// `useQueryClient` हुक को सीधे कॉल नहीं कर सकते,
// इसलिए हम इसे फ़ंक्शन के अंदर लेंगे।
const getQueryClient = () => {
  try {
    // यह हुक केवल कंपोनेंट के अंदर काम करता है,
    // इसलिए हम इसे एक फ़ंक्शन में रैप कर रहे हैं
    return useQueryClient();
  } catch (e) {
    return null; // यदि कंपोनेंट के बाहर उपयोग हो तो null लौटाएँ
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
            quantity: newItem.quantity || 1, // `quantity` को सुनिश्चित करें
          });

          // TanStack Query को बताएं कि डेटा पुराना हो गया है
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

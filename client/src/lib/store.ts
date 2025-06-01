import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: number) => void;
  updateQuantity: (id: number, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      sessionId: Math.random().toString(36).substring(2, 15),
      
      addItem: (newItem) => {
        const items = get().items;
        const existingItem = items.find(item => item.productId === newItem.productId);
        
        if (existingItem) {
          set({
            items: items.map(item =>
              item.productId === newItem.productId
                ? { ...item, quantity: item.quantity + newItem.quantity }
                : item
            )
          });
        } else {
          set({
            items: [...items, { ...newItem, id: Date.now() }]
          });
        }
      },
      
      removeItem: (id) => {
        set({ items: get().items.filter(item => item.id !== id) });
      },
      
      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id);
          return;
        }
        
        set({
          items: get().items.map(item =>
            item.id === id ? { ...item, quantity } : item
          )
        });
      },
      
      clearCart: () => {
        set({ items: [] });
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

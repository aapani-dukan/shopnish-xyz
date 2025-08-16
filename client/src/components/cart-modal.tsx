// client/src/components/cart-modal.tsx

import { X, Plus, Minus, Trash2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query"; // ✅ useQuery और useQueryClient जोड़ा गया
import { apiRequest } from "@/lib/queryClient"; // ✅ apiRequest जोड़ा गया
import { useAuth } from "@/hooks/useAuth"; // ✅ useAuth जोड़ा गया
import { useToast } from "@/hooks/use-toast"; // ✅ useToast जोड़ा गया

// ✅ CartItem Interface
interface CartItem {
  id: number;
  quantity: number;
  product: {
    id: number;
    name: string;
    price: string;
    image: string;
  };
}

interface CartResponse {
  message: string;
  items: CartItem[];
}

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartModal({ isOpen, onClose }: CartModalProps) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ✅ डेटाबेस से कार्ट आइटम प्राप्त करने के लिए useQuery का उपयोग करें
  const { data, isLoading, error } = useQuery<CartResponse>({
    queryKey: ["/api/cart"],
    queryFn: () => apiRequest("GET", "/api/cart"),
    enabled: isAuthenticated, // ✅ केवल तभी क्वेरी चलाएं जब उपयोगकर्ता प्रमाणित हो
  });

  // ✅ अब आइटम्स डेटाबेस से आ रहे हैं
  const items = data?.items || [];
  const total = items.reduce((sum, item) => sum + (parseFloat(item.product.price) * item.quantity), 0);

  // ✅ कार्ट आइटम की मात्रा अपडेट करने के लिए mutation
  const handleUpdateQuantity = async (itemId: number, newQuantity: number) => {
    try {
      if (newQuantity <= 0) {
        // अगर मात्रा 0 या उससे कम है, तो आइटम हटा दें
        await apiRequest("DELETE", `/api/cart/${itemId}`);
      } else {
        await apiRequest("PUT", `/api/cart/${itemId}`, { quantity: newQuantity });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
    } catch (error) {
      console.error("Failed to update cart item:", error);
      toast({
        title: "Error updating cart",
        description: "Failed to update item quantity. Please try again.",
        variant: "destructive",
      });
    }
  };

  // ✅ कार्ट आइटम हटाने के लिए mutation
  const handleRemoveItem = async (itemId: number) => {
    try {
      await apiRequest("DELETE", `/api/cart/${itemId}`);
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({
        title: "Item removed",
        description: "The item has been successfully removed from your cart.",
      });
    } catch (error) {
      console.error("Failed to remove item:", error);
      toast({
        title: "Error removing item",
        description: "Failed to remove item. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="w-full max-w-md">
          <SheetHeader>
            <SheetTitle>Shopping Cart</SheetTitle>
          </SheetHeader>
          <div className="flex justify-center items-center h-96">
            Loading cart...
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (error) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="w-full max-w-md">
          <SheetHeader>
            <SheetTitle>Shopping Cart</SheetTitle>
          </SheetHeader>
          <div className="flex justify-center items-center h-96 text-red-500">
            Error loading cart.
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (items.length === 0) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="w-full max-w-md">
          <SheetHeader>
            <SheetTitle>Shopping Cart</SheetTitle>
          </SheetHeader>
          
          <div className="flex flex-col items-center justify-center h-96 space-y-4">
            <ShoppingBag className="h-16 w-16 text-gray-300" />
            <p className="text-gray-500 text-center">Your cart is empty</p>
            <Button onClick={onClose} className="bg-primary hover:bg-primary/90">
              Continue Shopping
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>Shopping Cart</SheetTitle>
        </SheetHeader>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex items-center space-x-4 p-4 border rounded-lg">
              <img
                src={item.product.image}
                alt={item.product.name}
                className="w-16 h-16 object-cover rounded-lg"
              />
              
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">
                  {item.product.name}
                </h4>
                <p className="text-gray-500 text-sm">
                  ${item.product.price}
                </p>
                
                <div className="flex items-center mt-2 space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                    className="h-6 w-6 p-0"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  
                  <span className="text-sm font-medium min-w-[20px] text-center">
                    {item.quantity}
                  </span>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                    className="h-6 w-6 p-0"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleRemoveItem(item.id)}
                className="text-red-500 hover:text-red-700 p-1"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Cart Footer */}
        <div className="border-t pt-4 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold">Total:</span>
            <span className="text-xl font-bold text-primary">
              ${total.toFixed(2)}
            </span>
          </div>
          
          <div className="space-y-2">
            <Link to="/checkout" onClick={onClose}>
              <Button 
                className="w-full bg-primary hover:bg-primary/90 text-white"
              >
                Proceed to Checkout
              </Button>
            </Link>
            
            <Link to="/cart" onClick={onClose}>
              <Button 
                variant="outline" 
                className="w-full"
              >
                View Cart
              </Button>
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

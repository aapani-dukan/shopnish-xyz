import { X, Plus, Minus, Trash2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCartStore } from "@/lib/store";
import { Link } from "wouter";

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartModal({ isOpen, onClose }: CartModalProps) {
  const { items, updateQuantity, removeItem, getTotalPrice, clearCart } = useCartStore();

  const total = getTotalPrice();

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
                src={item.image}
                alt={item.name}
                className="w-16 h-16 object-cover rounded-lg"
              />
              
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">
                  {item.name}
                </h4>
                <p className="text-gray-500 text-sm">
                  ${item.price}
                </p>
                
                <div className="flex items-center mt-2 space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
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
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="h-6 w-6 p-0"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removeItem(item.id)}
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
            <Link href="/checkout">
              <Button 
                className="w-full bg-primary hover:bg-primary/90 text-white"
                onClick={onClose}
              >
                Proceed to Checkout
              </Button>
            </Link>
            
            <Link href="/cart">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={onClose}
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

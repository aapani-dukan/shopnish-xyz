import { useState } from "react";
import { Link } from "wouter";
import { Star, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCartStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: number;
  name: string;
  description: string | null;
  price: string;
  originalPrice: string | null;
  image: string;
  brand: string | null;
  rating: string | null;
  reviewCount: number | null;
}

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const addItem = useCartStore(state => state.addItem);
  const { toast } = useToast();

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsAdding(true);
    
    try {
      addItem({
        productId: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: 1,
      });

      toast({
        title: "Added to cart",
        description: `${product.name} has been added to your cart.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add item to cart.",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => setIsAdding(false), 1000);
    }
  };

  const renderStars = (rating: string | null) => {
    if (!rating) return null;
    
    const numRating = parseFloat(rating);
    const fullStars = Math.floor(numRating);
    const hasHalfStar = numRating % 1 !== 0;
    
    return (
      <div className="flex items-center">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < fullStars
                ? "text-yellow-400 fill-current"
                : i === fullStars && hasHalfStar
                ? "text-yellow-400 fill-current opacity-50"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <Card className="group cursor-pointer hover:shadow-md transition-shadow duration-200">
      <Link href={`/product/${product.id}`}>
        <div className="relative overflow-hidden rounded-t-lg">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {product.originalPrice && (
            <Badge className="absolute top-2 left-2 bg-red-500 text-white">
              Sale
            </Badge>
          )}
        </div>
      </Link>
      
      <CardContent className="p-4">
        <Link href={`/product/${product.id}`}>
          <h4 className="font-semibold text-lg mb-2 line-clamp-2 hover:text-primary transition-colors">
            {product.name}
          </h4>
        </Link>
        
        {(product.rating || product.reviewCount) && (
          <div className="flex items-center mb-2 space-x-2">
            {renderStars(product.rating)}
            {product.reviewCount && (
              <span className="text-gray-500 text-sm">
                ({product.reviewCount})
              </span>
            )}
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-primary">
              ${product.price}
            </span>
            {product.originalPrice && (
              <span className="text-gray-400 line-through text-sm">
                ${product.originalPrice}
              </span>
            )}
          </div>
          
          <Button
            size="sm"
            onClick={handleAddToCart}
            disabled={isAdding}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            {isAdding ? (
              <span className="text-green-500">✓</span>
            ) : (
              <ShoppingCart className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

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
  nameHindi: string;
  description: string | null;
  price: string;
  originalPrice: string | null;
  image: string;
  brand: string | null;
  unit: string;
  stock: number;
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

  // Calculate discount percentage
  const discountPercentage = product.originalPrice 
    ? Math.round(((parseFloat(product.originalPrice) - parseFloat(product.price)) / parseFloat(product.originalPrice)) * 100)
    : 0;

  // Stock level indicators
  const getStockStatus = () => {
    if (product.stock === 0) return { text: "Out of Stock", color: "text-red-600", bgColor: "bg-red-50" };
    if (product.stock <= 5) return { text: `Only ${product.stock} left`, color: "text-orange-600", bgColor: "bg-orange-50" };
    if (product.stock <= 10) return { text: `${product.stock} units left`, color: "text-yellow-600", bgColor: "bg-yellow-50" };
    return { text: "In Stock", color: "text-green-600", bgColor: "bg-green-50" };
  };

  const stockStatus = getStockStatus();

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (product.stock === 0) {
      toast({
        title: "Out of Stock",
        description: "This product is currently unavailable.",
        variant: "destructive",
      });
      return;
    }
    
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
    <Card className="group cursor-pointer hover:shadow-md transition-shadow duration-200 relative">
      <Link href={`/product/${product.id}`}>
        <div className="relative overflow-hidden rounded-t-lg">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
          />
          
          {/* Discount Badge */}
          {discountPercentage > 0 && (
            <Badge className="absolute top-2 left-2 bg-red-500 text-white font-bold">
              {discountPercentage}% OFF
            </Badge>
          )}
          
          {/* Stock Status Badge */}
          <Badge 
            variant="outline" 
            className={`absolute top-2 right-2 ${stockStatus.color} ${stockStatus.bgColor} border-0 text-xs`}
          >
            {stockStatus.text}
          </Badge>
        </div>
      </Link>
      
      <CardContent className="p-4">
        <Link href={`/product/${product.id}`}>
          <div className="mb-2">
            <h4 className="font-semibold text-lg line-clamp-2 hover:text-primary transition-colors">
              {product.name}
            </h4>
            <p className="text-sm text-gray-600 line-clamp-1">{product.nameHindi}</p>
          </div>
        </Link>
        
        <div className="flex items-center justify-between mb-2">
          {product.brand && (
            <Badge variant="secondary" className="text-xs">
              {product.brand}
            </Badge>
          )}
          <span className="text-xs text-gray-500">{product.unit}</span>
        </div>
        
        {(product.rating || product.reviewCount) && (
          <div className="flex items-center mb-3 space-x-2">
            {renderStars(product.rating)}
            {product.reviewCount && (
              <span className="text-gray-500 text-sm">
                ({product.reviewCount})
              </span>
            )}
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold text-green-600">
                ₹{product.price}
              </span>
              {product.originalPrice && parseFloat(product.originalPrice) > parseFloat(product.price) && (
                <span className="text-gray-400 line-through text-sm">
                  ₹{product.originalPrice}
                </span>
              )}
            </div>
            {discountPercentage > 0 && (
              <span className="text-xs text-green-600 font-medium">
                You save ₹{(parseFloat(product.originalPrice!) - parseFloat(product.price)).toFixed(2)}
              </span>
            )}
          </div>
          
          <Button
            size="sm"
            onClick={handleAddToCart}
            disabled={isAdding || product.stock === 0}
            className={`${
              product.stock === 0 
                ? "bg-gray-400 cursor-not-allowed" 
                : "bg-primary hover:bg-primary/90"
            } text-white`}
          >
            {isAdding ? (
              <span className="text-green-500">✓</span>
            ) : product.stock === 0 ? (
              "Out of Stock"
            ) : (
              <ShoppingCart className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

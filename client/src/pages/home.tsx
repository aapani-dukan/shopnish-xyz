import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Filter, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import Header from "@/components/header";
import ProductCard from "@/components/product-card";
import Footer from "@/components/footer";

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
}

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

export default function Home() {
  const [location] = useLocation();
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const categoryParam = urlParams.get('category');
  const searchParam = urlParams.get('search');

  const [selectedCategory, setSelectedCategory] = useState<number | null>(
    categoryParam ? parseInt(categoryParam) : null
  );
  const [searchQuery, setSearchQuery] = useState(searchParam || "");
  const [priceFilter, setPriceFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("best-match");

  // Update filters when URL changes
  useEffect(() => {
    const newCategoryParam = urlParams.get('category');
    const newSearchParam = urlParams.get('search');
    
    setSelectedCategory(newCategoryParam ? parseInt(newCategoryParam) : null);
    setSearchQuery(newSearchParam || "");
  }, [location]);

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['/api/products', selectedCategory, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory) params.append('categoryId', selectedCategory.toString());
      if (searchQuery) params.append('search', searchQuery);
      
      const response = await fetch(`/api/products?${params}`);
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
  });

  const { data: featuredProducts = [] } = useQuery<Product[]>({
    queryKey: ['/api/products', 'featured'],
    queryFn: async () => {
      const response = await fetch('/api/products?featured=true');
      if (!response.ok) throw new Error('Failed to fetch featured products');
      return response.json();
    },
  });

  const filteredProducts = products.filter(product => {
    if (priceFilter.length === 0) return true;
    
    const price = parseFloat(product.price);
    return priceFilter.some(range => {
      switch (range) {
        case 'under-25': return price < 25;
        case '25-50': return price >= 25 && price < 50;
        case '50-100': return price >= 50 && price < 100;
        case 'over-100': return price >= 100;
        default: return true;
      }
    });
  });

  const handlePriceFilterChange = (range: string, checked: boolean) => {
    if (checked) {
      setPriceFilter(prev => [...prev, range]);
    } else {
      setPriceFilter(prev => prev.filter(r => r !== range));
    }
  };

  const scrollToProducts = () => {
    document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  if (categoriesLoading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Skeleton className="h-16 w-full mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-80 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header categories={categories} />

      {/* Hero Section - Only show on home page without filters */}
      {!selectedCategory && !searchQuery && (
        <section className="bg-gradient-to-r from-primary to-orange-500 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-4xl lg:text-6xl font-bold mb-6">
                  Shop Everything You Need
                </h2>
                <p className="text-xl mb-8 text-orange-100">
                  Discover millions of products from trusted sellers with fast delivery and great prices.
                </p>
                <Button 
                  onClick={scrollToProducts}
                  size="lg"
                  className="bg-white text-primary hover:bg-gray-100 font-semibold"
                >
                  Start Shopping <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
              <div className="relative">
                <img
                  src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d"
                  alt="Online shopping experience"
                  className="rounded-xl shadow-2xl w-full h-auto"
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Featured Categories - Only show on home page */}
      {!selectedCategory && !searchQuery && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h3 className="text-3xl font-bold text-neutral-900 mb-12 text-center">
              Shop by Category
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {categories.slice(0, 4).map((category) => (
                <div 
                  key={category.id} 
                  className="text-center group cursor-pointer"
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <img
                    src={category.image || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8'}
                    alt={category.name}
                    className="w-full h-48 object-cover rounded-lg group-hover:shadow-lg transition-shadow"
                  />
                  <h4 className="text-lg font-semibold mt-4">
                    {category.name}
                  </h4>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Product Catalog */}
      <main id="products-section" className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Filters Sidebar */}
            <aside className="lg:w-64 flex-shrink-0">
              <Card className="sticky top-24">
                <CardContent className="p-6">
                  <h4 className="text-lg font-semibold mb-4 flex items-center">
                    <Filter className="mr-2 h-5 w-5" />
                    Filters
                  </h4>
                  
                  {/* Price Range */}
                  <div className="mb-6">
                    <h5 className="font-medium mb-3">Price Range</h5>
                    <div className="space-y-2">
                      {[
                        { id: 'under-25', label: 'Under $25' },
                        { id: '25-50', label: '$25 - $50' },
                        { id: '50-100', label: '$50 - $100' },
                        { id: 'over-100', label: 'Over $100' },
                      ].map((range) => (
                        <div key={range.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={range.id}
                            checked={priceFilter.includes(range.id)}
                            onCheckedChange={(checked) => 
                              handlePriceFilterChange(range.id, checked as boolean)
                            }
                          />
                          <label htmlFor={range.id} className="text-sm cursor-pointer">
                            {range.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Categories */}
                  <div className="mb-6">
                    <h5 className="font-medium mb-3">Categories</h5>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="all-categories"
                          checked={!selectedCategory}
                          onCheckedChange={() => setSelectedCategory(null)}
                        />
                        <label htmlFor="all-categories" className="text-sm cursor-pointer">
                          All Categories
                        </label>
                      </div>
                      {categories.map((category) => (
                        <div key={category.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`category-${category.id}`}
                            checked={selectedCategory === category.id}
                            onCheckedChange={() => 
                              setSelectedCategory(selectedCategory === category.id ? null : category.id)
                            }
                          />
                          <label htmlFor={`category-${category.id}`} className="text-sm cursor-pointer">
                            {category.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </aside>

            {/* Product Grid */}
            <div className="flex-1">
              {/* Sort and View Options */}
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-neutral-900">
                  {searchQuery ? `Search results for "${searchQuery}"` : 
                   selectedCategory ? categories.find(c => c.id === selectedCategory)?.name : 
                   'Featured Products'}
                </h3>
                <div className="flex items-center space-x-4">
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="best-match">Best Match</SelectItem>
                      <SelectItem value="price-low">Price: Low to High</SelectItem>
                      <SelectItem value="price-high">Price: High to Low</SelectItem>
                      <SelectItem value="rating">Customer Rating</SelectItem>
                      <SelectItem value="newest">Newest First</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Product Grid */}
              {productsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {[...Array(8)].map((_, i) => (
                    <Skeleton key={i} className="h-80 w-full" />
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">No products found matching your criteria.</p>
                  <Button 
                    onClick={() => {
                      setSelectedCategory(null);
                      setSearchQuery("");
                      setPriceFilter([]);
                    }}
                    className="mt-4"
                    variant="outline"
                  >
                    Clear Filters
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

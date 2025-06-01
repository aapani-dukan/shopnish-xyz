import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ArrowLeft, CreditCard, Truck, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { useCartStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/header";
import Footer from "@/components/footer";

interface Category {
  id: number;
  name: string;
  slug: string;
}

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { items, clearCart, getTotalPrice } = useCartStore();
  const { toast } = useToast();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    nameOnCard: '',
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const subtotal = getTotalPrice();
  const shipping = subtotal > 50 ? 0 : 5.99;
  const tax = subtotal * 0.08; // 8% tax
  const total = subtotal + shipping + tax;

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock order creation
      const orderData = {
        userId: null, // Guest checkout
        total: total.toFixed(2),
        status: 'confirmed',
        shippingAddress: `${formData.address}, ${formData.city}, ${formData.state} ${formData.zipCode}`,
      };

      const orderItems = items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
      }));

      // In a real app, you would make an API call here
      console.log('Order:', orderData);
      console.log('Items:', orderItems);

      clearCart();
      
      toast({
        title: "Order confirmed!",
        description: "Thank you for your purchase. You'll receive a confirmation email shortly.",
      });

      setLocation('/');
    } catch (error) {
      toast({
        title: "Error",
        description: "There was a problem processing your order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Header categories={categories} />
        <main className="max-w-4xl mx-auto px-4 py-16">
          <Card className="text-center py-16">
            <CardContent>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                No items in cart
              </h2>
              <p className="text-gray-600 mb-8">
                Add some items to your cart before checking out.
              </p>
              <Link href="/">
                <Button size="lg" className="bg-primary hover:bg-primary/90">
                  Continue Shopping
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header categories={categories} />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <Link href="/cart">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Cart
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Checkout Form */}
            <div className="space-y-6">
              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="john@example.com"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Shipping Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Truck className="mr-2 h-5 w-5" />
                    Shipping Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        required
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        placeholder="John"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        required
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        placeholder="Doe"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      required
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      placeholder="123 Main St"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        required
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        placeholder="New York"
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State</Label>
                      <Select onValueChange={(value) => handleInputChange('state', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ny">New York</SelectItem>
                          <SelectItem value="ca">California</SelectItem>
                          <SelectItem value="tx">Texas</SelectItem>
                          <SelectItem value="fl">Florida</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="zipCode">ZIP Code</Label>
                      <Input
                        id="zipCode"
                        required
                        value={formData.zipCode}
                        onChange={(e) => handleInputChange('zipCode', e.target.value)}
                        placeholder="10001"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CreditCard className="mr-2 h-5 w-5" />
                    Payment Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="cardNumber">Card Number</Label>
                    <Input
                      id="cardNumber"
                      required
                      value={formData.cardNumber}
                      onChange={(e) => handleInputChange('cardNumber', e.target.value)}
                      placeholder="1234 5678 9012 3456"
                    />
                  </div>

                  <div>
                    <Label htmlFor="nameOnCard">Name on Card</Label>
                    <Input
                      id="nameOnCard"
                      required
                      value={formData.nameOnCard}
                      onChange={(e) => handleInputChange('nameOnCard', e.target.value)}
                      placeholder="John Doe"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="expiryDate">Expiry Date</Label>
                      <Input
                        id="expiryDate"
                        required
                        value={formData.expiryDate}
                        onChange={(e) => handleInputChange('expiryDate', e.target.value)}
                        placeholder="MM/YY"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cvv">CVV</Label>
                      <Input
                        id="cvv"
                        required
                        value={formData.cvv}
                        onChange={(e) => handleInputChange('cvv', e.target.value)}
                        placeholder="123"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-gray-600">
                      Your payment information is secure and encrypted
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div>
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Order Items */}
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center space-x-3">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {item.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            Qty: {item.quantity}
                          </p>
                        </div>
                        <span className="text-sm font-medium">
                          ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* Pricing Breakdown */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span>Shipping</span>
                      <span>
                        {shipping === 0 ? (
                          <span className="text-green-600">Free</span>
                        ) : (
                          `$${shipping.toFixed(2)}`
                        )}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span>Tax</span>
                      <span>${tax.toFixed(2)}</span>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Total</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full bg-primary hover:bg-primary/90 text-white"
                    size="lg"
                  >
                    {isProcessing ? "Processing..." : `Pay $${total.toFixed(2)}`}
                  </Button>

                  <p className="text-xs text-gray-500 text-center">
                    By placing your order, you agree to our Terms of Service and Privacy Policy.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </main>

      <Footer />
    </div>
  );
}

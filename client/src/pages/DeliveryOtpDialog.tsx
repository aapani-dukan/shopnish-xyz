import React from "react";
import { Loader2 } from "lucide-react";

// -----------------------------------------------------------------------------
// ## मॉक UI कंपोनेंट
// -----------------------------------------------------------------------------
const Button = ({ children, onClick, variant, disabled, ...props }) => (
  <button onClick={onClick} disabled={disabled} className={`p-2 rounded-md ${variant === 'outline' ? 'border' : 'bg-blue-500 text-white'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} {...props}>
    {children}
  </button>
);
const Input = ({ ...props }) => <input className="border p-2 rounded-md w-full" {...props} />;
const Label = ({ children, htmlFor }) => <label htmlFor={htmlFor} className="block mb-1 font-medium">{children}</label>;
const Dialog = ({ open, onOpenChange, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
        {children}
      </div>
    </div>
  );
};
const DialogContent = ({ children }) => <div>{children}</div>;
const DialogHeader = ({ children }) => <div className="mb-4">{children}</div>;
const DialogTitle = ({ children }) => <h3 className="text-lg font-bold">{children}</h3>;

// -----------------------------------------------------------------------------
// ## मुख्य React कंपोनेंट: DeliveryOtpDialog
// -----------------------------------------------------------------------------
export default function DeliveryOtpDialog({
  selectedOrder,
  otp,
  setOtp,
  otpDialogOpen,
  setOtpDialogOpen,
  handleOtpConfirmation,
  isSubmitting
}) {
  return (
    <Dialog open={otpDialogOpen} onOpenChange={setOtpDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>डिलीवरी पूरी करें</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-gray-600 mb-4">
          डिलीवरी की पुष्टि करने के लिए ग्राहक से 4-अंकों का OTP माँगें।
        </div>
        {selectedOrder && (
          <div className="p-4 bg-blue-50 rounded-lg mb-4">
            <p className="font-medium">ऑर्डर #{selectedOrder.orderNumber}</p>
            <p className="text-sm text-gray-600">{selectedOrder.deliveryAddress.fullName}</p>
            <p className="text-sm text-gray-600">कुल: ₹{selectedOrder.total}</p>
          </div>
        )}
        <div className="mb-4">
          <Label htmlFor="otp">OTP दर्ज करें</Label>
          <Input
            id="otp"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="0000"
            maxLength={4}
            className="text-center text-lg tracking-widest"
          />
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={handleOtpConfirmation}
            disabled={isSubmitting || otp.trim().length !== 4}
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> सत्यापित हो रहा है...
              </>
            ) : (
              "पुष्टि करें"
            )}
          </Button>
          <Button variant="outline" onClick={() => setOtpDialogOpen(false)}>
            रद्द करें
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


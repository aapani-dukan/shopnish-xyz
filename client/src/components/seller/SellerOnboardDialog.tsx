// components/seller-onboarding-dialog.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SellerOnboardingDialogProps {
  open: boolean;
  onClose: () => void;
  onRegister: () => void;
  onLogin: () => void;
}

export default function SellerOnboardingDialog({
  open,
  onClose,
  onRegister,
  onLogin,
}: SellerOnboardingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="space-y-4">
        <DialogHeader>
          <DialogTitle>Become a Seller</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Button className="w-full" onClick={onRegister}>
            Register as a Seller
          </Button>
          <Button variant="outline" className="w-full" onClick={onLogin}>
            Login as a Seller
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

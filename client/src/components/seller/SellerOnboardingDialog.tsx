// components/seller-onboarding-dialog.tsx

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import SellerRegistrationForm from "./SellerRegistrationForm";
import SellerLogin from "./SellerLogin";

interface SellerOnboardingDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function SellerOnboardingDialog({
  open,
  onClose,
}: SellerOnboardingDialogProps) {
  const [tab, setTab] = useState("register");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="space-y-4">
        <DialogHeader>
          <DialogTitle>Become a Seller</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="register">Register</TabsTrigger>
            <TabsTrigger value="login">Login</TabsTrigger>
          </TabsList>

          <TabsContent value="register">
            <SellerRegistrationForm />
          </TabsContent>

          <TabsContent value="login">
            <SellerLogin />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

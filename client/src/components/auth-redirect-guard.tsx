const fetchUserAndRole = async (firebaseUser: FirebaseUser) => {
  try {
    const idToken = await firebaseUser.getIdToken();

    // 1. Get user data from backend
    const responseUser = await fetch("/api/auth/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!responseUser.ok) throw new Error("Failed to fetch user data");

    const dataUser = await responseUser.json();

    // 2. Get the role tag user brought after login (from sessionStorage or elsewhere)
    const loginRole = sessionStorage.getItem("loginRole"); // "seller", "admin", "delivery-boy", "user"

    let finalRole: User["role"] = "customer"; // default

    if (loginRole === "admin") {
      finalRole = "admin";
    } else if (loginRole === "user") {
      finalRole = "customer";
    } else if (loginRole === "seller") {
      // fetch seller data and check approvalStatus
      const responseSeller = await fetch("/api/sellers/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
      });
      if (!responseSeller.ok) throw new Error("Failed to fetch seller data");

      const sellerData = await responseSeller.json();

      if (sellerData.approvalStatus === "approved") {
        finalRole = "seller";
      } else {
        finalRole = "seller-not-approved"; // custom role for your logic, or just keep seller with approvalStatus in user.seller
      }

      // You can store sellerData in user.seller for later use
    } else if (loginRole === "delivery-boy") {
      // fetch delivery boy data and check verification status
      const responseDelivery = await fetch("/api/delivery/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
      });
      if (!responseDelivery.ok) throw new Error("Failed to fetch delivery boy data");

      const deliveryData = await responseDelivery.json();

      if (deliveryData.isVerified) {
        finalRole = "delivery";
      } else {
        finalRole = "delivery-not-approved"; // custom flag
      }
      // Store deliveryData in user.delivery if needed
    }

    // Create final user object with role and any extra info
    const finalUser: User = {
      uid: dataUser.uid,
      name: dataUser.name,
      email: dataUser.email,
      phone: dataUser.phone,
      photoURL: dataUser.photoURL,
      provider: dataUser.provider,
      role: finalRole,
      seller: loginRole === "seller" ? sellerData : null,
      // similarly for delivery data if needed
    };

    setUser(finalUser);
  } catch (err) {
    console.error("Auth error:", err);
    setUser(null);
  } finally {
    setLoading(false);
  }
};

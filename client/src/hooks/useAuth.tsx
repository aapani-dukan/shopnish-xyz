console.log("🔁 Auth: useEffect triggered");

const fetchUserAndSeller = async (firebaseUser: FirebaseUser) => {
  console.log("👤 Firebase user found:", firebaseUser);

  try {
    const idToken = await firebaseUser.getIdToken();
    console.log("🪪 Token:", idToken);

    const loginRole = sessionStorage.getItem("loginRole");
    console.log("📦 session loginRole:", loginRole);

    const responseUser = await fetch("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });
    const userData = await responseUser.json();
    console.log("🧠 Auth User Data:", userData);

    if (loginRole === "seller") {
      const resSeller = await fetch("/api/sellers/me", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      const sellerData = await resSeller.json();
      console.log("🏪 Seller Data:", sellerData);

      if (sellerData?.approvalStatus === "approved") {
        console.log("✅ Redirecting to /seller-dashboard");
        window.location.replace("/seller-dashboard");
      } else {
        console.log("📝 Redirecting to /register-seller");
        window.location.replace("/register-seller");
      }
    } else {
      console.log("👥 General user, redirecting to home");
      window.location.replace("/");
    }
  } catch (err) {
    console.error("❌ Error in fetchUserAndSeller:", err);
  }
};

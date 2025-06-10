    const fetchUserAndSeller = async (firebaseUser: FirebaseUser) => {
      try {
        console.log("✅ Firebase user detected:", firebaseUser);

        const idToken = await firebaseUser.getIdToken();

        // Fetch general user data
        const responseUser = await fetch("/api/auth/me", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${idToken}`,
            "Content-Type": "application/json",
          },
        });

        if (!responseUser.ok) throw new Error("❌ Failed to fetch user data");

        const dataUser = await responseUser.json();
        console.log("✅ /api/auth/me response:", dataUser);

        // --- यह पूरा loginRole ब्लॉक हटा दें (या कमेंट कर दें) ---
        // const loginRole = sessionStorage.getItem("loginRole");
        // if (loginRole !== "seller") {
        //   console.warn("⚠️ User is not seller via loginRole, ignoring user.");
        //   setUser(null);
        //   return false;
        // }
        // --------------------------------------------------------

        // Seller flow: fetch seller data to determine approval status
        let sellerData: Seller | null = null;
        let role: User["role"] = null;

        const responseSeller = await fetch("/api/sellers/me", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${idToken}`,
            "Content-Type": "application/json",
          },
        });

        if (responseSeller.ok) {
          sellerData = await responseSeller.json();
          console.log("✅ /api/sellers/me response:", sellerData);

          // Set role based on approvalStatus
          if (sellerData.approvalStatus === "approved") {
            role = "approved-seller";
          } else {
            role = "not-approved-seller";
          }
        } else {
          console.warn("⚠️ Failed to fetch seller data, assuming not a seller or not registered yet.");
          // यदि /api/sellers/me 404 या अन्य त्रुटि देता है, तो इसका मतलब है कि यह यूजर सेलर नहीं है।
          // इस मामले में, role null या default non-seller होना चाहिए।
          // role = "not-approved-seller"; // <--- यह सिर्फ तब सेट करें जब यूजर ने सेलर के रूप में रजिस्टर करने की कोशिश की हो
          role = null; // यदि विक्रेता डेटा नहीं मिला, तो यह एक सामान्य उपयोगकर्ता है
        }

        const finalUser: User = {
          uid: dataUser.uid,
          name: dataUser.name,
          email: dataUser.email,
          phone: dataUser.phone,
          photoURL: dataUser.photoURL,
          provider: dataUser.provider,
          role, // यह role अब null भी हो सकता है अगर विक्रेता डेटा नहीं मिला
          seller: sellerData,
        };

        console.log("✅ Final user set to:", finalUser);
        setUser(finalUser);
        return true;
      } catch (err) {
        console.error("❌ Auth Error:", err);
        setUser(null);
        return false;
      } finally {
        setLoading(false);
      }
    };

    // ... (getRedirectResult and onAuthStateChanged remain same) ...
  }, []);
  // ... (return user, loading) ...


useEffect(() => {
  const auth = getAuth(app);

  const processUser = async (firebaseUser: FirebaseUser | null) => {
    if (!firebaseUser) {
      setUser(null);
      setIsLoadingAuth(false);
      return;
    }

    try {
      const idToken = await firebaseUser.getIdToken();
      const decodedToken = await getIdTokenResult(firebaseUser);

      const role = decodedToken.claims.role || "customer";
      const firebaseUid = firebaseUser.uid;
      const email = firebaseUser.email;
      const name = firebaseUser.displayName;

      let seller: SellerInfo | undefined = undefined;
      if (role === "seller") {
        try {
          const res = await apiRequest("GET", "/api/sellers/me", undefined, idToken);
          seller = res.data;
        } catch (_) {}
      }

      setUser({ uid: firebaseUser.uid, firebaseUid, email, name, role, seller, idToken });
    } catch (error) {
      console.error("Auth Error:", error);
      setUser(null);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const checkRedirect = async () => {
    try {
      console.log("⏳ Checking redirect result...");
      const result = await getRedirectResult(auth);

      if (result?.user) {
        console.log("✅ Redirect result user found:", result.user);
        await processUser(result.user);
        return;
      } else {
        console.log("ℹ️ No redirect result user.");
      }
    } catch (error) {
      console.error("getRedirectResult Error:", error);
    }

    // ⏳ अब fallback के तौर पर onAuthStateChanged लगाएं
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("👂 onAuthStateChanged triggered:", firebaseUser);
      await processUser(firebaseUser);
    });

    return () => unsubscribe();
  };

  checkRedirect();
}, []);

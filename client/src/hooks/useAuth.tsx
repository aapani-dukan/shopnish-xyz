// client/src/hooks/useAuth.tsx
useEffect(() => {
  const processRedirectAndListen = async () => {
    try {
      const result = await handleGoogleRedirectResult();
      if (result) {
        setFirebaseUser(result.user);
        console.log("✅ useAuth: Google Redirect result processed!");
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      }
    } catch (error) {
      console.error("❌ useAuth: Error processing Google Redirect result:", error);
      firebaseSignOut();
    }

    // ✅ Important: Always run onAuthStateChanged regardless of redirect result
    const unsubscribe = firebaseOnAuthStateChanged((user) => {
      console.log("🔥 Firebase onAuthStateChanged:", user?.uid || "null");
      setFirebaseUser(user);
      setIsFirebaseLoading(false);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    });

    // ✅ return unsubscribe from inside the async function
    return unsubscribe;
  };

  let unsubscribe: () => void;

  processRedirectAndListen().then((fn) => {
    unsubscribe = fn;
  });

  return () => {
    if (unsubscribe) unsubscribe();
  };
}, [queryClient]);

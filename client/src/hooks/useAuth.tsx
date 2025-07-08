import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User as FirebaseUser, onAuthStateChanged } from "firebase/auth";
import { auth, handleGoogleRedirectResult } from "@/lib/firebase";
import { apiRequest } from "@/lib/queryClient";
import { User } from "@/shared/types/user";

interface AuthContextType {
  user: User | null;
  isLoadingAuth: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const signOut = useCallback(async () => {
    try {
      await auth.signOut();
      setUser(null);
      setFirebaseUser(null);
      localStorage.removeItem("redirectIntent");
      console.log("✅ User signed out.");
    } catch (error) {
      console.error("❌ Error signing out:", error);
    }
  }, []);

  // Handle Google redirect result (once, on mount)
  useEffect(() => {
    const processRedirectResult = async () => {
      try {
        const result = await handleGoogleRedirectResult();
        if (result) {
          console.log("✅ Google redirect result processed. Firebase User:", result.user?.uid);
        } else {
          console.log("ℹ️ No Google redirect result found.");
        }
      } catch (error) {
        console.error("❌ Error processing Google redirect result:", error);
      }
    };
    processRedirectResult();
  }, []);

  // Firebase Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      console.log("📣 onAuthStateChanged fired. User:", fbUser?.uid || "null");
      setFirebaseUser(fbUser);

      if (fbUser) {
        try {
          const idToken = await fbUser.getIdToken();
          console.log("🔐 ID Token obtained:", idToken.length);

          const userDataForLogin = {
            firebaseUid: fbUser.uid,
            email: fbUser.email!,
            name: fbUser.displayName || fbUser.email!,
          };

          const response = await apiRequest("POST", "/api/auth/login", userDataForLogin, {
            Authorization: `Bearer ${idToken}`,
          });

          const backendUser: User = response.user;

          if (
            !backendUser ||
            typeof backendUser.uuid !== "string" ||
            !backendUser.role
          ) {
            console.error("❌ Invalid user object received:", backendUser);
            await signOut();
            return;
          }

          const fullUser: User = {
            ...backendUser,
            firebaseUid: fbUser.uid,
            idToken,
          };

          setUser(fullUser);
          console.log("✅ User context set:", fullUser);
        } catch (error) {
          console.error("❌ Error fetching/creating user:", error);
          await signOut();
        }
      } else {
        setUser(null);
      }

      setIsLoadingAuth(false);
    });

    return unsubscribe;
  }, [signOut]);

  const isAuthenticated =
    !!user && typeof user.uuid === "string" && !!user.idToken;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoadingAuth,
        isAuthenticated,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

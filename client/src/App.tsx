// client/src/App.tsx (संशोधित भाग)

// ... आपके मौजूदा imports

function RoleBasedRedirector() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (loading) return;

    // **यहां बदलाव किया गया है:** sessionStorage से loginRole पढ़ें
    const loginRole = sessionStorage.getItem("loginRole");

    if (!user) {
      // अगर यूजर लॉग इन नहीं है और seller रजिस्ट्रेशन के लिए आया था,
      // तो उसे `login` पेज पर भेजें जहाँ सेलर फ्लो हैंडल हो सके.
      if (loginRole === "seller" && window.location.pathname !== "/login") {
         navigate("/login"); // या /login?from=seller
      } else {
         // सामान्य लॉग इन की आवश्यकता
         navigate("/login");
      }
      return;
    }

    // अगर यूजर लॉग इन है
    switch (user.role) {
      case "approved-seller":
        navigate("/seller-dashboard");
        break;
      case "seller": // या 'pending-seller' या 'not-approved-seller'
        // अगर यूजर 'seller' रोल में है लेकिन 'approved-seller' नहीं है,
        // और वह `/register-seller` या `/seller-status` पर नहीं है,
        // तो उसे सही पेज पर भेजें।
        if (window.location.pathname !== "/register-seller" && window.location.pathname !== "/seller-status") {
          navigate("/seller-status"); // मान लें कि 'seller' रोल का मतलब pending है
        }
        break;
      case "admin":
        navigate("/admin-dashboard");
        break;
      case "delivery":
        navigate("/delivery-dashboard");
        break;
      default:
        // अगर यूजर का कोई खास रोल नहीं है (freshly logged in)
        // और वह `loginRole` "seller" के साथ आया था,
        // तो उसे `register-seller` पेज पर भेजें।
        if (loginRole === "seller") {
          navigate("/register-seller");
          sessionStorage.removeItem("loginRole"); // उपयोग के बाद फ्लैग हटा दें
        } else if (window.location.pathname !== "/") { // अगर वे होम पर नहीं हैं और कोई खास रोल या फ्लो नहीं है
          navigate("/"); // होम पेज पर भेजें
        }
        break;
    }
  }, [user, loading, navigate]); // loginRole को dependencies में जोड़ने की ज़रूरत नहीं क्योंकि वह read-only है

  return null;
}

// ... बाकी Router और App कॉम्पोनेंट unchanged हैं

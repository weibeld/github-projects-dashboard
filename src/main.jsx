// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  RedirectToSignIn,
} from "@clerk/clerk-react";
import App from "./App";

const clerkPublishableKey = "pk_test_ZGlyZWN0LWJvbmVmaXNoLTkyLmNsZXJrLmFjY291bnRzLmRldiQ";

ReactDOM.createRoot(document.getElementById("root")).render(
  <ClerkProvider
    publishableKey={clerkPublishableKey}
    afterSignInUrl="/github-projects-dashboard"
    afterSignUpUrl="/github-projects-dashboard"
  >
    <SignedIn>
      <App />
    </SignedIn>
    <SignedOut>
      <RedirectToSignIn />
    </SignedOut>
  </ClerkProvider>
);


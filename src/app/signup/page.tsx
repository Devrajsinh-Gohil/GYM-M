"use client";

import LoginPage from "../login/page";

// For Google Auth, the flow is identical. We can reuse the Login Page component
// or redirect. Reusing the component is smoother.
export default function SignupPage() {
    return <LoginPage />;
}

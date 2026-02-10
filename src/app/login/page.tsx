"use client";

import { useState } from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function LoginPage() {
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleGoogleLogin = async () => {
        setError("");
        setLoading(true);

        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // Check if user exists in Firestore
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);

            if (!userDoc.exists()) {
                // Check for Admin Invite
                const invitesRef = collection(db, "admin_invites");
                const q = query(invitesRef, where("email", "==", user.email?.toLowerCase()));
                const inviteSnap = await getDocs(q);

                let newRole = "USER";
                let newStatus = "PENDING";
                let newGymId = "DEFAULT_GYM";

                if (!inviteSnap.empty) {
                    const inviteData = inviteSnap.docs[0].data();
                    newRole = inviteData.role;
                    newStatus = "ACTIVE"; // Admins are auto-active
                    newGymId = inviteData.gymId;
                }

                if (newRole === "USER") {
                    // Create placeholder doc for new users
                    await setDoc(userDocRef, {
                        name: user.displayName,
                        email: user.email,
                        role: "USER",
                        status: "ONBOARDING",
                        createdAt: serverTimestamp(),
                        photoURL: user.photoURL,
                        gymId: "",
                        phoneNumber: "",
                        age: null,
                        gender: ""
                    });
                    router.push("/onboarding");
                    return;
                }

                // Create Admin/Pre-approved User Document instantly
                await setDoc(userDocRef, {
                    name: user.displayName,
                    email: user.email,
                    role: newRole,
                    status: newStatus,
                    createdAt: serverTimestamp(),
                    photoURL: user.photoURL,
                    gymId: newGymId
                });

                // Continue to redirect logic below...
                // Force a quick refresh of our local variables for the next block
                // OR just manually set them
                // Better: Just proceed and let the next block handle it
            }

            // Fetch latest data (or use what we just created)
            const finalUserDoc = await getDoc(userDocRef);
            const userData = finalUserDoc.data();
            const role = userData?.role || "USER";
            const status = userData?.status || "PENDING";

            if (status === "ONBOARDING") {
                router.push("/onboarding");
            } else if (status === "PENDING") {
                router.push("/pending");
            } else if (status === "ACTIVE") {
                // Role-Based Redirect for Active Users
                if (role === "SUPER_ADMIN") {
                    router.push("/super-admin/dashboard");
                } else if (role === "GYM_ADMIN") {
                    router.push("/admin/dashboard");
                } else {
                    router.push("/dashboard");
                }
            } else {
                // Rejected or other status
                setError("Your account is not active. Please contact support.");
            }
        } catch (err: any) {
            console.error(err);
            setError("Failed to sign in with Google. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8 text-center">
                <div>
                    <h2 className="mt-6 text-3xl font-bold tracking-tight text-primary">
                        Welcome Back
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Sign in to access your dashboard
                    </p>
                </div>

                {error && (
                    <div className="text-sm text-destructive font-medium">
                        {error}
                    </div>
                )}

                <button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className={cn(
                        "flex w-full items-center justify-center gap-3 rounded-md bg-white px-3 py-3 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-primary transition-all",
                        loading && "opacity-70 cursor-not-allowed"
                    )}
                >
                    {/* Google Icon SVG */}
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            fill="#4285F4"
                        />
                        <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                        />
                        <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            fill="#FBBC05"
                        />
                        <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            fill="#EA4335"
                        />
                    </svg>
                    {loading ? "Connecting..." : "Continue with Google"}
                </button>
            </div>
        </div>
    );
}

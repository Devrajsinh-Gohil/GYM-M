"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: string[]; // "SUPER_ADMIN", "GYM_ADMIN", "USER"
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
    const { user, role, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading) {
            // 1. Not authenticated
            if (!user) {
                router.push("/login?redirect=" + pathname);
                return;
            }

            // 2. Role check (if specified)
            if (allowedRoles && role && !allowedRoles.includes(role)) {
                router.push("/unauthorized"); // Need to create this page
            }
        }
    }, [user, role, loading, router, allowedRoles, pathname]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
        );
    }

    // Prevent flash of unauthorized content
    if (!user || (allowedRoles && role && !allowedRoles.includes(role))) {
        return null;
    }

    return <>{children}</>;
}

"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function UnauthorizedPage() {
    const { logout } = useAuth();

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
            <div className="space-y-4">
                <h1 className="text-4xl font-bold text-destructive">403</h1>
                <h2 className="text-2xl font-semibold text-foreground">Access Denied</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                    You do not have permission to view this page. Please contact your administrator if you believe this is an error.
                </p>

                <div className="flex gap-4 justify-center pt-4">
                    <Link
                        href="/"
                        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90"
                    >
                        Go Home
                    </Link>
                    <button
                        onClick={() => logout()}
                        className="px-4 py-2 rounded-lg border border-input bg-background hover:bg-accent text-foreground font-medium"
                    >
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
}

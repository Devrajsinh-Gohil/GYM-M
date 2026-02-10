"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { LogOut, RefreshCcw, Clock } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function PendingPage() {
    const { user, logout } = useAuth();
    const router = useRouter();

    const checkStatus = async () => {
        if (!user) return;

        // Force direct DB check instead of waiting for context update
        // because role might not update in context immediately without refresh
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            const status = userDoc.data()?.status;

            if (status === "ACTIVE") {
                router.push("/dashboard"); // Or appropriate dashboard
                window.location.reload(); // Reload to update Context
            } else if (status === "REJECTED") {
                alert("Your application was declined. Please contact the gym.");
            } else {
                alert("Still pending approval. Please check back later.");
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
            <div className="max-w-md w-full space-y-8 bg-card p-8 rounded-xl border border-border shadow-sm">

                <div className="flex flex-col items-center space-y-4">
                    <div className="bg-yellow-100 p-4 rounded-full">
                        <Clock className="w-12 h-12 text-yellow-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">Approval Pending</h1>
                    <p className="text-muted-foreground">
                        Thanks for joining! Your account is currently waiting for approval from the Gym Administrator.
                    </p>
                </div>

                <div className="space-y-3 pt-4">
                    <button
                        onClick={checkStatus}
                        className="flex w-full items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition"
                    >
                        <RefreshCcw className="w-4 h-4" />
                        Check Status
                    </button>

                    <button
                        onClick={() => logout()}
                        className="flex w-full items-center justify-center gap-2 px-4 py-2 rounded-lg border border-input bg-background text-foreground hover:bg-accent transition"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
}

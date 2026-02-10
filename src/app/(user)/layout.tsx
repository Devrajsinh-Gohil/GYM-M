"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, QrCode, User } from "lucide-react";
import { cn } from "@/lib/utils";

export default function UserLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    const navItems = [
        { href: "/dashboard", label: "Home", icon: Home },
        { href: "/scan", label: "Scan", icon: QrCode },
        { href: "/profile", label: "Profile", icon: User },
    ];

    return (
        <ProtectedRoute allowedRoles={["USER"]}>
            <div className="flex flex-col min-h-screen bg-muted/20 pb-20">
                {/* Main Content Area */}
                <main className="flex-1 p-4 max-w-md mx-auto w-full">
                    {children}
                </main>

                {/* Bottom Navigation */}
                <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
                    <div className="max-w-md mx-auto flex justify-around items-center h-16">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
                                        isActive
                                            ? "text-primary font-medium"
                                            : "text-muted-foreground hover:text-primary/70"
                                    )}
                                >
                                    <Icon className="h-6 w-6" strokeWidth={isActive ? 2.5 : 2} />
                                    <span className="text-[10px]">{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </nav>
            </div>
        </ProtectedRoute>
    );
}

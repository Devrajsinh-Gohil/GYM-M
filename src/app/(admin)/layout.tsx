"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    CreditCard,
    QrCode,
    Settings,
    LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { logout } = useAuth();

    const navItems = [
        { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/admin/members", label: "Members", icon: Users },
        { href: "/admin/plans", label: "Plans", icon: CreditCard },
        { href: "/admin/qr", label: "Gym QR", icon: QrCode },
        { href: "/admin/settings", label: "Settings", icon: Settings },
    ];

    return (
        <ProtectedRoute allowedRoles={["GYM_ADMIN"]}>
            <div className="flex min-h-screen bg-muted/20">
                {/* Sidebar */}
                <aside className="hidden md:flex w-64 flex-col bg-card border-r border-border fixed inset-y-0 left-0 z-50">
                    <div className="h-16 flex items-center px-6 border-b border-border">
                        <h1 className="text-xl font-bold text-primary tracking-tight">Gym Admin</h1>
                    </div>

                    <nav className="flex-1 flex flex-col p-4 space-y-1 overflow-y-auto">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname.startsWith(item.href);

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                        isActive
                                            ? "bg-primary/10 text-primary"
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="p-4 border-t border-border">
                        <button
                            onClick={() => logout()}
                            className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                        >
                            <LogOut className="h-4 w-4" />
                            Sign Out
                        </button>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 md:ml-64 p-8">
                    {children}
                </main>
            </div>
        </ProtectedRoute>
    );
}

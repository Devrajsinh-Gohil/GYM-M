"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Globe,
    Building2,
    ShieldCheck,
    LogOut,
    Menu,
    X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { logout } = useAuth();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const navItems = [
        { href: "/super-admin/dashboard", label: "Overview", icon: Globe },
        { href: "/super-admin/gyms", label: "Gyms", icon: Building2 },
        { href: "/super-admin/admins", label: "Admins", icon: ShieldCheck },
    ];

    return (
        <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
            <div className="flex min-h-screen bg-muted/20">
                {/* Mobile Header */}
                <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-50">
                    <h1 className="text-xl font-bold text-gray-900">Platform Admin</h1>
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        {mobileMenuOpen ? (
                            <X className="w-6 h-6 text-gray-700" />
                        ) : (
                            <Menu className="w-6 h-6 text-gray-700" />
                        )}
                    </button>
                </div>

                {/* Mobile Menu Overlay */}
                {mobileMenuOpen && (
                    <div
                        className="md:hidden fixed inset-0 bg-black/50 z-40"
                        onClick={() => setMobileMenuOpen(false)}
                    />
                )}

                {/* Mobile Slide-out Menu */}
                <aside
                    className={cn(
                        "md:hidden fixed top-16 right-0 bottom-0 w-64 bg-white border-l border-gray-200 z-40 transform transition-transform duration-300 ease-in-out",
                        mobileMenuOpen ? "translate-x-0" : "translate-x-full"
                    )}
                >
                    <nav className="flex-1 flex flex-col p-4 space-y-1 overflow-y-auto">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname.startsWith(item.href);

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                        isActive
                                            ? "bg-emerald-100 text-emerald-700"
                                            : "text-gray-700 hover:bg-gray-100"
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="p-4 border-t border-gray-200">
                        <button
                            onClick={() => logout()}
                            className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                        >
                            <LogOut className="h-4 w-4" />
                            Sign Out
                        </button>
                    </div>
                </aside>

                {/* Desktop Sidebar - Consistent Theme */}
                <aside className="hidden md:flex w-64 flex-col bg-card border-r border-border fixed inset-y-0 left-0 z-50">
                    <div className="h-16 flex items-center px-6 border-b border-border">
                        <h1 className="text-xl font-bold text-primary tracking-tight">Platform Admin</h1>
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
                <main className="flex-1 md:ml-64 pt-16 md:pt-0 p-4 md:p-8">
                    {children}
                </main>
            </div>
        </ProtectedRoute>
    );
}

"use client";

import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, limit, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Building2, Users, DollarSign, Activity, TrendingUp, Calendar, ArrowRight, Sparkles, BarChart3 } from "lucide-react";
import { RevenueChart, MemberGrowthChart, AttendanceChart } from "@/components/AnalyticsCharts";
import Link from "next/link";

interface SuperAdminStats {
    totalGyms: number;
    activeGyms: number;
    totalUsers: number;
    revenue: number;
    revenueData: any[];
    growthData: any[];
    attendanceData: any[];
    recentGyms: any[];
}

export default function SuperAdminDashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState<SuperAdminStats>({
        totalGyms: 0,
        activeGyms: 0,
        totalUsers: 0,
        revenue: 0,
        revenueData: [],
        growthData: [],
        attendanceData: [],
        recentGyms: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            if (!user) return;

            try {
                // Fetch Gyms
                const gymsSnap = await getDocs(collection(db, "gyms"));
                const totalGyms = gymsSnap.size;
                const activeGyms = gymsSnap.docs.filter(d => d.data().active !== false).length;

                // Fetch All Users
                const usersSnap = await getDocs(query(collection(db, "users"), where("role", "==", "USER")));
                const totalUsers = usersSnap.size;

                // Calculate Revenue
                let totalRevenue = 0;
                usersSnap.docs.forEach(doc => {
                    const data = doc.data();
                    if (data.plan?.price) {
                        totalRevenue += data.plan.price;
                    }
                });

                // Revenue & Growth Data (Last 6 Months)
                const months: string[] = [];
                const memberGrowth: Record<string, number> = {};
                const revenueByMonth: Record<string, number> = {};

                for (let i = 5; i >= 0; i--) {
                    const d = new Date();
                    d.setMonth(d.getMonth() - i);
                    const label = d.toLocaleString('default', { month: 'short' });
                    months.push(label);
                    memberGrowth[label] = 0;
                    revenueByMonth[label] = 0;
                }

                usersSnap.docs.forEach(doc => {
                    const data = doc.data();
                    let joinedMonth = "Unknown";
                    if (data.createdAt) {
                        joinedMonth = new Date(data.createdAt.seconds * 1000).toLocaleString('default', { month: 'short' });
                    } else if (data.joinedAt) {
                        joinedMonth = new Date(data.joinedAt.seconds * 1000).toLocaleString('default', { month: 'short' });
                    } else {
                        joinedMonth = new Date().toLocaleString('default', { month: 'short' });
                    }

                    if (memberGrowth[joinedMonth] !== undefined) {
                        memberGrowth[joinedMonth]++;
                    }

                    if (data.plan?.price && data.plan?.expiry) {
                        const planMonth = new Date(data.plan.expiry.seconds * 1000).toLocaleString('default', { month: 'short' });
                        if (revenueByMonth[planMonth] !== undefined) {
                            revenueByMonth[planMonth] += data.plan.price;
                        }
                    }
                });

                const growthData = months.map(month => ({
                    month,
                    count: memberGrowth[month]
                }));

                const revenueData = months.map(month => ({
                    month,
                    revenue: revenueByMonth[month]
                }));

                // Attendance Data (Last 7 Days)
                const last7Days = [...Array(7)].map((_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    return d.toISOString().split('T')[0];
                }).reverse();

                const attendanceSnap = await getDocs(query(collection(db, "attendance"), orderBy("checkInTime", "desc"), limit(500)));
                const attendanceData = last7Days.map(date => ({
                    day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
                    visits: attendanceSnap.docs.filter(d => d.data().date === date).length
                }));

                // Recent Gyms
                const recentGymsQuery = query(collection(db, "gyms"), orderBy("createdAt", "desc"), limit(5));
                const recentGymsSnap = await getDocs(recentGymsQuery);
                const recentGyms = recentGymsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

                setStats({
                    totalGyms,
                    activeGyms,
                    totalUsers,
                    revenue: totalRevenue,
                    revenueData,
                    growthData,
                    attendanceData,
                    recentGyms
                });

            } catch (error) {
                console.error("Error fetching super admin stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [user]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500 font-medium">Loading platform stats...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20 fade-in">
            {/* Header */}
            <div className="relative overflow-hidden rounded-3xl gradient-emerald p-8 text-white shadow-xl">
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-white/10 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 rounded-full bg-black/10 blur-3xl"></div>

                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <BarChart3 className="w-6 h-6 text-emerald-200" />
                            <p className="text-emerald-100 text-sm font-medium uppercase tracking-wider">Super Admin Dashboard</p>
                        </div>
                        <h1 className="text-3xl font-bold mb-1">Platform Overview</h1>
                        <p className="text-emerald-100">Global analytics and system management</p>
                    </div>
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                        <Sparkles className="w-8 h-8" />
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="Total Gyms"
                    value={stats.totalGyms}
                    icon={<Building2 className="w-6 h-6" />}
                    gradient="from-blue-500 to-blue-600"
                    iconBg="bg-blue-100"
                    iconColor="text-blue-600"
                />
                <StatsCard
                    title="Active Gyms"
                    value={stats.activeGyms}
                    icon={<Activity className="w-6 h-6" />}
                    gradient="from-emerald-500 to-emerald-600"
                    iconBg="bg-emerald-100"
                    iconColor="text-emerald-600"
                />
                <StatsCard
                    title="Total Users"
                    value={stats.totalUsers}
                    icon={<Users className="w-6 h-6" />}
                    gradient="from-orange-500 to-orange-600"
                    iconBg="bg-orange-100"
                    iconColor="text-orange-600"
                />
                <StatsCard
                    title="Monthly Revenue"
                    value={`₹${stats.revenue.toLocaleString()}`}
                    icon={<DollarSign className="w-6 h-6" />}
                    gradient="from-purple-500 to-purple-600"
                    iconBg="bg-purple-100"
                    iconColor="text-purple-600"
                    subtitle="Estimated"
                />
            </div>

            {/* Global Analytics Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover-lift transition-smooth">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">Revenue Growth</h3>
                            <p className="text-xs text-gray-500">Last 6 months</p>
                        </div>
                    </div>
                    <RevenueChart data={stats.revenueData} />
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover-lift transition-smooth">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                            <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">Platform Growth</h3>
                            <p className="text-xs text-gray-500">Last 6 months</p>
                        </div>
                    </div>
                    <MemberGrowthChart data={stats.growthData} />
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 lg:col-span-2 hover-lift transition-smooth">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                            <Activity className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">Global Check-in Traffic</h3>
                            <p className="text-xs text-gray-500">Last 7 days</p>
                        </div>
                    </div>
                    <AttendanceChart data={stats.attendanceData} />
                </div>
            </div>

            {/* Recent Gyms & Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-gray-900 text-lg">Recently Added Gyms</h3>
                            <p className="text-sm text-gray-500 mt-0.5">Latest gym registrations</p>
                        </div>
                        <Link href="/super-admin/gyms" className="text-sm text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1 transition-colors">
                            View All <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {stats.recentGyms.length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Building2 className="w-8 h-8 text-gray-400" />
                                </div>
                                <p className="text-gray-900 font-medium mb-1">No gyms yet</p>
                                <p className="text-sm text-gray-500">Gyms will appear here</p>
                            </div>
                        ) : (
                            stats.recentGyms.map((gym: any) => (
                                <div key={gym.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white">
                                            <Building2 className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">{gym.name}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">{gym.location}</p>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${gym.active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                        {gym.active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 h-fit">
                    <h3 className="font-bold text-gray-900 mb-4 text-lg">Quick Management</h3>
                    <div className="space-y-3">
                        <Link
                            href="/super-admin/gyms"
                            className="block w-full px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all text-sm font-semibold text-center shadow-sm hover-lift"
                        >
                            Manage All Gyms
                        </Link>
                        <Link
                            href="/super-admin/admins"
                            className="block w-full px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all text-sm font-semibold text-center shadow-sm hover-lift"
                        >
                            Manage Admins
                        </Link>
                        <button
                            disabled
                            className="block w-full px-4 py-3 bg-gray-100 text-gray-400 rounded-xl text-sm font-semibold text-center cursor-not-allowed"
                        >
                            Platform Settings (Soon)
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
}

function StatsCard({
    title,
    value,
    icon,
    gradient,
    iconBg,
    iconColor,
    subtitle
}: {
    title: string;
    value: string | number;
    icon: any;
    gradient: string;
    iconBg: string;
    iconColor: string;
    subtitle?: string;
}) {
    return (
        <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-200 p-6 shadow-sm hover-lift transition-smooth">
            <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center ${iconColor}`}>
                    {icon}
                </div>
            </div>
            <div>
                <p className="text-sm font-semibold text-gray-600 mb-1">{title}</p>
                <p className="text-3xl font-bold text-gray-900">{value}</p>
                {subtitle && (
                    <p className="text-xs text-gray-500 mt-2">{subtitle}</p>
                )}
            </div>
            <div className={`absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-br ${gradient} opacity-5 rounded-tl-full`}></div>
        </div>
    );
}

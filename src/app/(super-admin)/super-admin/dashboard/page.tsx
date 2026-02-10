"use client";

import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, limit, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Building2, Users, DollarSign, Activity, TrendingUp, Calendar, ArrowRight } from "lucide-react";
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
            try {
                // 1. Fetch Gyms
                const gymsCol = collection(db, "gyms");
                const gymsSnap = await getDocs(gymsCol);
                const totalGyms = gymsSnap.size;
                const activeGyms = gymsSnap.docs.filter(d => d.data().active).length;

                const gymMap: Record<string, string> = {};
                gymsSnap.docs.forEach(doc => {
                    gymMap[doc.id] = doc.data().name;
                });

                // 2. Fetch Users (for Global Revenue & Growth)
                // In production, this should be done via aggregation queries or Cloud Functions
                const usersCol = collection(db, "users");
                const usersQuery = query(usersCol, where("role", "==", "USER"));
                const usersSnap = await getDocs(usersQuery);
                const totalUsers = usersSnap.size;

                let globalRevenue = 0;
                const memberGrowth: Record<string, number> = {};
                const revenueByMonth: Record<string, number> = {};

                // Initialize months
                const months: string[] = [];
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

                    // Month Aggregation
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

                    // Revenue Aggregation
                    const price = data.plan?.price ? Number(data.plan.price) : 0;
                    if (price > 0) {
                        globalRevenue += price;
                        if (revenueByMonth[joinedMonth] !== undefined) {
                            revenueByMonth[joinedMonth] += price;
                        }
                    }
                });

                // 3. Fetch Attendance (Global Traffic)
                const attendanceQuery = query(collection(db, "attendance"), orderBy("checkInTime", "desc"), limit(500));
                const attendanceSnap = await getDocs(attendanceQuery);

                // Process Attendance Trend (Last 7 Days)
                const last7Days = [...Array(7)].map((_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    return d.toISOString().split('T')[0];
                }).reverse();

                const attendanceData = last7Days.map(date => ({
                    day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
                    visits: attendanceSnap.docs.filter(d => d.data().date === date).length
                }));

                // Prepare Chart Data
                const growthData = months.map(m => ({
                    name: m,
                    members: memberGrowth[m] || 0
                }));

                const revenueData = months.map(m => ({
                    name: m,
                    revenue: revenueByMonth[m] || 0
                }));

                // Recent Gyms
                const sortedGyms = gymsSnap.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .sort((a: any, b: any) => b.createdAt?.seconds - a.createdAt?.seconds) // Sort by newest
                    .slice(0, 5);

                setStats({
                    totalGyms,
                    activeGyms,
                    totalUsers,
                    revenue: globalRevenue,
                    revenueData,
                    growthData,
                    attendanceData,
                    recentGyms: sortedGyms
                });

            } catch (error) {
                console.error("Error fetching super admin stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [user]);

    if (loading) return <div className="p-8">Loading platform stats...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Platform Overview</h1>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="Total Gyms"
                    value={stats.totalGyms}
                    icon={<Building2 className="w-6 h-6 text-blue-600" />}
                    bg="bg-blue-50"
                />
                <StatsCard
                    title="Active Gyms"
                    value={stats.activeGyms}
                    icon={<Activity className="w-6 h-6 text-emerald-600" />}
                    bg="bg-emerald-50"
                />
                <StatsCard
                    title="Total Users"
                    value={stats.totalUsers}
                    icon={<Users className="w-6 h-6 text-orange-600" />}
                    bg="bg-orange-50"
                />
                <StatsCard
                    title="Total Est. Monthly Revenue"
                    value={`₹${stats.revenue.toLocaleString()}`}
                    icon={<DollarSign className="w-6 h-6 text-purple-600" />}
                    bg="bg-purple-50"
                />
            </div>

            {/* Global Analytics Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-4">Total Revenue Growth</h3>
                    <RevenueChart data={stats.revenueData} />
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-4">Platform Member Growth</h3>
                    <MemberGrowthChart data={stats.growthData} />
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 lg:col-span-2">
                    <h3 className="font-semibold text-gray-900 mb-4">Global Check-in Traffic (Last 7 Days)</h3>
                    <AttendanceChart data={stats.attendanceData} />
                </div>
            </div>

            {/* Recent Gyms & Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-semibold text-gray-900">Recently Added Gyms</h3>
                        <Link href="/super-admin/gyms" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                            View All <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {stats.recentGyms.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">No gyms available.</div>
                        ) : (
                            stats.recentGyms.map((gym: any) => (
                                <div key={gym.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                                            <Building2 className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">{gym.name}</p>
                                            <p className="text-xs text-gray-500">{gym.location}</p>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${gym.active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                        {gym.active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-fit">
                    <h3 className="font-semibold text-gray-900 mb-4">Quick Management</h3>
                    <div className="space-y-3">
                        <Link href="/super-admin/gyms" className="block w-full px-4 py-3 bg-slate-50 text-slate-700 rounded-lg hover:bg-slate-100 transition text-sm font-medium text-center border border-slate-100">
                            Manage All Gyms
                        </Link>
                        <button disabled className="block w-full px-4 py-3 bg-gray-50 text-gray-400 rounded-lg text-sm font-medium text-center border border-gray-100 cursor-not-allowed">
                            Platform Settings (Coming Soon)
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
}

function StatsCard({ title, value, icon, bg }: { title: string, value: string | number, icon: any, bg: string }) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500">{title}</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
                </div>
                <div className={`rounded-lg p-3 ${bg}`}>
                    {icon}
                </div>
            </div>
        </div>
    );
}

"use client";

import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from "firebase/firestore";
import { useEffect, useState, use } from "react";
import { Users, Activity, TrendingUp, Calendar, CheckSquare, ArrowLeft, Sparkles, DollarSign, BarChart3 } from "lucide-react";
import { RevenueChart, MemberGrowthChart, AttendanceChart } from "@/components/AnalyticsCharts";
import Link from "next/link";

interface DashboardStats {
    totalMembers: number;
    activeMembers: number;
    todaysCheckins: number;
    recentActivity: any[];
    revenueData: any[];
    growthData: any[];
    attendanceData: any[];
}

export default function GymDrillDownDashboard({ params }: { params: Promise<{ gymId: string }> }) {
    const { user } = useAuth();
    const { gymId } = use(params);

    const [stats, setStats] = useState<DashboardStats>({
        totalMembers: 0,
        activeMembers: 0,
        todaysCheckins: 0,
        recentActivity: [],
        revenueData: [],
        growthData: [],
        attendanceData: []
    });
    const [loading, setLoading] = useState(true);
    const [gymName, setGymName] = useState("");
    const [gymLocation, setGymLocation] = useState("");

    useEffect(() => {
        const fetchStats = async () => {
            if (!gymId) return;

            try {
                // Get Gym Details
                const gymDoc = await getDoc(doc(db, "gyms", gymId));
                if (gymDoc.exists()) {
                    setGymName(gymDoc.data().name);
                    setGymLocation(gymDoc.data().location || "");
                }

                // Fetch Members
                const membersQuery = query(collection(db, "users"), where("gymId", "==", gymId), where("role", "==", "USER"));
                const membersSnap = await getDocs(membersQuery);
                const totalMembers = membersSnap.size;

                let activeCount = 0;
                let expiredCount = 0;
                let expiringSoonCount = 0;

                const now = new Date();
                const sevenDaysFromNow = new Date();
                sevenDaysFromNow.setDate(now.getDate() + 7);

                const memberGrowth: Record<string, number> = {};
                const revenueByMonth: Record<string, number> = {};

                const months: string[] = [];
                for (let i = 5; i >= 0; i--) {
                    const d = new Date();
                    d.setMonth(d.getMonth() - i);
                    const label = d.toLocaleString('default', { month: 'short' });
                    months.push(label);
                    memberGrowth[label] = 0;
                    revenueByMonth[label] = 0;
                }

                membersSnap.docs.forEach(doc => {
                    const data = doc.data();
                    if (data.status === 'ACTIVE') activeCount++;

                    if (data.plan?.expiry) {
                        const expiry = new Date(data.plan.expiry.seconds * 1000);
                        if (expiry < now) {
                            expiredCount++;
                        } else if (expiry <= sevenDaysFromNow) {
                            expiringSoonCount++;
                        }
                    }

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

                    const price = data.plan?.price ? Number(data.plan.price) : 0;
                    if (price > 0 && memberGrowth[joinedMonth] !== undefined) {
                        revenueByMonth[joinedMonth] += price;
                    }
                });

                const growthData = months.map(m => ({
                    month: m,
                    count: memberGrowth[m] || 0
                }));

                const revenueData = months.map(m => ({
                    month: m,
                    revenue: revenueByMonth[m] || 0
                }));

                // Attendance
                const today = new Date();
                const todayStr = today.toISOString().split('T')[0];

                const attendanceQuery = query(
                    collection(db, "attendance"),
                    where("gymId", "==", gymId),
                    orderBy("checkInTime", "desc"),
                    limit(100)
                );
                const attendanceSnap = await getDocs(attendanceQuery);

                const todaysCheckins = attendanceSnap.docs.filter(d => d.data().date === todayStr).length;

                const last7Days = [...Array(7)].map((_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    return d.toISOString().split('T')[0];
                }).reverse();

                const attendanceData = last7Days.map(date => ({
                    day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
                    visits: attendanceSnap.docs.filter(d => d.data().date === date).length
                }));

                // Recent Activity
                const recentSessionsRaw = attendanceSnap.docs.slice(0, 10);
                const recentSessions = await Promise.all(recentSessionsRaw.map(async (docSnap) => {
                    const data = docSnap.data();
                    let userName = "Unknown User";
                    if (data.userId) {
                        const uDoc = await getDoc(doc(db, "users", data.userId));
                        if (uDoc.exists()) userName = uDoc.data().name;
                    }
                    return { id: docSnap.id, ...data, userName };
                }));

                setStats({
                    totalMembers,
                    activeMembers: activeCount,
                    todaysCheckins,
                    recentActivity: recentSessions,
                    expiredCount,
                    expiringSoonCount,
                    revenueData,
                    growthData,
                    attendanceData
                } as any);

            } catch (error) {
                console.error("Error fetching gym stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [user, gymId]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500 font-medium">Loading gym dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20 fade-in">
            {/* Back Button + Header */}
            <div className="flex items-center gap-4">
                <Link
                    href="/super-admin/gyms"
                    className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 hover:text-gray-900 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold text-gray-900">{gymName}</h1>
                    {gymLocation && <p className="text-gray-600 mt-1">{gymLocation}</p>}
                </div>
            </div>

            {/* Gradient Info Banner */}
            <div className="relative overflow-hidden rounded-2xl gradient-emerald p-6 text-white shadow-lg">
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-white/10 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-black/10 blur-3xl"></div>

                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <BarChart3 className="w-5 h-5 text-emerald-200" />
                            <p className="text-emerald-100 text-sm font-medium uppercase tracking-wider">Gym Analytics</p>
                        </div>
                        <p className="text-lg">Detailed performance metrics and member activity</p>
                    </div>
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                        <Sparkles className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="Total Members"
                    value={stats.totalMembers}
                    icon={<Users className="w-6 h-6" />}
                    gradient="from-blue-500 to-blue-600"
                    iconBg="bg-blue-100"
                    iconColor="text-blue-600"
                />
                <StatsCard
                    title="Active Members"
                    value={stats.activeMembers}
                    icon={<Activity className="w-6 h-6" />}
                    gradient="from-emerald-500 to-emerald-600"
                    iconBg="bg-emerald-100"
                    iconColor="text-emerald-600"
                />
                <StatsCard
                    title="Expiring Soon"
                    value={(stats as any).expiringSoonCount || 0}
                    icon={<Calendar className="w-6 h-6" />}
                    gradient="from-orange-500 to-orange-600"
                    iconBg="bg-orange-100"
                    iconColor="text-orange-600"
                    subtitle="Next 7 days"
                />
                <StatsCard
                    title="Expired Plans"
                    value={(stats as any).expiredCount || 0}
                    icon={<TrendingUp className="w-6 h-6" />}
                    gradient="from-red-500 to-red-600"
                    iconBg="bg-red-100"
                    iconColor="text-red-600"
                />
            </div>

            {/* Analytics Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover-lift transition-smooth">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">Revenue Trends</h3>
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
                            <h3 className="font-bold text-gray-900">Member Growth</h3>
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
                            <h3 className="font-bold text-gray-900">Check-in Traffic</h3>
                            <p className="text-xs text-gray-500">Last 7 days</p>
                        </div>
                    </div>
                    <AttendanceChart data={stats.attendanceData} />
                </div>
            </div>

            {/* Recent Activity Feed */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-gray-900 text-lg">Live Activity Feed</h3>
                        <p className="text-sm text-gray-500 mt-0.5">Recent member check-ins</p>
                    </div>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                        Today: {stats.todaysCheckins}
                    </span>
                </div>
                <div className="divide-y divide-gray-100">
                    {stats.recentActivity.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Activity className="w-8 h-8 text-gray-400" />
                            </div>
                            <p className="text-gray-900 font-medium mb-1">No activity yet</p>
                            <p className="text-sm text-gray-500">Check-ins will appear here</p>
                        </div>
                    ) : (
                        stats.recentActivity.map((session: any) => (
                            <div key={session.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${session.checkOutTime ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'
                                        }`}>
                                        {session.checkOutTime ? <CheckSquare className="w-6 h-6" /> : <Activity className="w-6 h-6" />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">{session.userName}</p>
                                        <div className="flex items-center gap-2 text-xs mt-1">
                                            <span className={`px-2 py-0.5 rounded-full font-medium ${session.checkOutTime ? 'bg-gray-100 text-gray-600' : 'bg-emerald-50 text-emerald-700'
                                                }`}>
                                                {session.checkOutTime ? 'Completed' : 'Active Session'}
                                            </span>
                                            {session.duration && (
                                                <span className="text-gray-500">• {Math.floor(session.duration / 60)}h {session.duration % 60}m</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium text-gray-900 tabular-nums">
                                        {session.checkInTime ? new Date(session.checkInTime.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                        <span className="text-gray-300 mx-1">→</span>
                                        {session.checkOutTime ? new Date(session.checkOutTime.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        {new Date(session.checkInTime.seconds * 1000).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
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

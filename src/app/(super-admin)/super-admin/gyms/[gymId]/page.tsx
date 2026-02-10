"use client";

import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from "firebase/firestore";
import { useEffect, useState, use } from "react";
import { Users, Activity, TrendingUp, Calendar, CheckSquare, ArrowLeft } from "lucide-react";
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
    // Unwrap params using React.use() or await in async component (Next.js 15+)
    // Since this is a client component, we should ideally unwrap it.
    // However, simplest way in Next 15 client components is often creating a wrapper or just awaiting it if supported.
    // Let's use `use` hook relative to React 19/Next 15 if applicable, or just assume resolved for now if older.
    // Given the version 16.1.6, we should use `use(params)`.

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

    useEffect(() => {
        const fetchStats = async () => {
            if (!gymId) return;

            try {
                // Get Gym Name
                const gymDoc = await getDoc(doc(db, "gyms", gymId));
                if (gymDoc.exists()) setGymName(gymDoc.data().name);

                // 2. Counts: Members & Expiry
                const membersQuery = query(collection(db, "users"), where("gymId", "==", gymId), where("role", "==", "USER"));
                const membersSnap = await getDocs(membersQuery);
                const totalMembers = membersSnap.size;

                let activeCount = 0;
                let expiredCount = 0;
                let expiringSoonCount = 0;

                const now = new Date();
                const sevenDaysFromNow = new Date();
                sevenDaysFromNow.setDate(now.getDate() + 7);

                // For Charts: Member Growth & Revenue
                const memberGrowth: Record<string, number> = {};
                const revenueByMonth: Record<string, number> = {};

                // Initialize last 6 months
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

                    // Aggregate Member Growth (createdAt)
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

                    // Aggregate Revenue
                    const price = data.plan?.price ? Number(data.plan.price) : 0;
                    if (price > 0 && memberGrowth[joinedMonth] !== undefined) {
                        revenueByMonth[joinedMonth] += price;
                    }
                });

                // Prepare Chart Data
                const growthData = months.map(m => ({
                    name: m,
                    members: memberGrowth[m] || 0
                }));

                const revenueData = months.map(m => ({
                    name: m,
                    revenue: revenueByMonth[m] || 0
                }));

                // 3. Counts: Today's Checkins & Attendance Trend
                const today = new Date();
                const todayStr = today.toISOString().split('T')[0];

                const attendanceQuery = query(
                    collection(db, "attendance"),
                    where("gymId", "==", gymId),
                    orderBy("checkInTime", "desc"),
                    limit(100)
                );
                const attendanceSnap = await getDocs(attendanceQuery);

                // Calculate Today's Checkins
                const todaysCheckins = attendanceSnap.docs.filter(d => d.data().date === todayStr).length;

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

                // 4. Recent Activity
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
                console.error("Error fetching admin stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [user, gymId]);

    if (loading) return <div className="p-8">Loading stats...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/super-admin/gyms" className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-900 transition">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">Gym Dashboard: {gymName}</h1>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="Total Members"
                    value={stats.totalMembers}
                    icon={<Users className="w-6 h-6 text-blue-600" />}
                    bg="bg-blue-50"
                />
                <StatsCard
                    title="Active Members"
                    value={stats.activeMembers}
                    icon={<Activity className="w-6 h-6 text-emerald-600" />}
                    bg="bg-emerald-50"
                />
                <StatsCard
                    title="Expiring Soon (7d)"
                    value={(stats as any).expiringSoonCount || 0}
                    icon={<Calendar className="w-6 h-6 text-orange-600" />}
                    bg="bg-orange-50"
                />
                <StatsCard
                    title="Expired / Due"
                    value={(stats as any).expiredCount || 0}
                    icon={<TrendingUp className="w-6 h-6 text-red-600" />}
                    bg="bg-red-50"
                />
            </div>

            {/* Analytics Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-4">Revenue Trends</h3>
                    <RevenueChart data={stats.revenueData} />
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-4">Member Growth</h3>
                    <MemberGrowthChart data={stats.growthData} />
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 lg:col-span-2">
                    <h3 className="font-semibold text-gray-900 mb-4">Check-in Traffic (Last 7 Days)</h3>
                    <AttendanceChart data={stats.attendanceData} />
                </div>
            </div>

            {/* Recent Activity Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">Live Activity Feed</h3>
                </div>
                <div className="divide-y divide-gray-100">
                    {stats.recentActivity.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">No activity today.</div>
                    ) : (
                        stats.recentActivity.map((session: any) => (
                            <div key={session.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${session.checkOutTime ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                        {session.checkOutTime ? <CheckSquare className="w-5 h-5" /> : <Activity className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">{session.userName}</p>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <span className={`px-2 py-0.5 rounded-full ${session.checkOutTime ? 'bg-gray-100 text-gray-600' : 'bg-emerald-50 text-emerald-700 font-medium'}`}>
                                                {session.checkOutTime ? 'Completed' : 'Active Session'}
                                            </span>
                                            {session.duration && (
                                                <span>• {Math.floor(session.duration / 60)}h {session.duration % 60}m</span>
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

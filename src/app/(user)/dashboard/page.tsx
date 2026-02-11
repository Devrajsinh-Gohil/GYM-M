"use client";

import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";
import { MapPin, Calendar, Activity, CreditCard, Settings, TrendingUp, Clock, CheckCircle2, Sparkles } from "lucide-react";
import Link from "next/link";

interface UserProfile {
    name: string;
    email: string;
    gymId: string;
    status: string;
    plan?: {
        name: string;
        expiry: any;
        price?: number;
    }
}

interface GymDetails {
    name: string;
    location: string;
}

export default function UserDashboard() {
    const { user } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [gym, setGym] = useState<GymDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [attendance, setAttendance] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;

            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data() as UserProfile;
                    setProfile(userData);

                    if (userData.gymId) {
                        const gymDoc = await getDoc(doc(db, "gyms", userData.gymId));
                        if (gymDoc.exists()) {
                            setGym(gymDoc.data() as GymDetails);
                        }
                    }
                }

                const attQuery = query(
                    collection(db, "attendance"),
                    where("userId", "==", user.uid),
                    orderBy("checkInTime", "desc"),
                    limit(5)
                );
                const attSnap = await getDocs(attQuery);
                const attList = attSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAttendance(attList);

            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500 font-medium">Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    const getDaysLeft = () => {
        if (!profile?.plan?.expiry) return null;
        const expiry = new Date(profile.plan.expiry.seconds * 1000);
        const now = new Date();
        return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    };

    const daysLeft = getDaysLeft();
    const completedSessions = attendance.filter((a: any) => a.status === 'COMPLETED').length;

    return (
        <div className="space-y-6 pb-24 fade-in">

            {/* Header with Settings */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        Hey, {profile?.name?.split(' ')[0]}! 👋
                    </h1>
                    <p className="text-gray-600 mt-1">Ready to crush your goals today?</p>
                </div>
                <Link
                    href="/profile"
                    className="p-3 hover:bg-gray-100 rounded-full transition-all hover-lift"
                    aria-label="Settings"
                >
                    <Settings className="w-6 h-6 text-gray-700" />
                </Link>
            </div>

            {/* Status Alert */}
            {daysLeft !== null && (
                <div className={`rounded-2xl p-5 border-2 ${daysLeft < 0
                        ? 'bg-red-50 border-red-200'
                        : daysLeft <= 7
                            ? 'bg-amber-50 border-amber-200'
                            : 'bg-emerald-50 border-emerald-200'
                    }`}>
                    <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl ${daysLeft < 0
                                ? 'bg-red-100'
                                : daysLeft <= 7
                                    ? 'bg-amber-100'
                                    : 'bg-emerald-100'
                            }`}>
                            <Calendar className={`w-6 h-6 ${daysLeft < 0
                                    ? 'text-red-600'
                                    : daysLeft <= 7
                                        ? 'text-amber-600'
                                        : 'text-emerald-600'
                                }`} />
                        </div>
                        <div className="flex-1">
                            <h3 className={`font-bold text-lg ${daysLeft < 0
                                    ? 'text-red-900'
                                    : daysLeft <= 7
                                        ? 'text-amber-900'
                                        : 'text-emerald-900'
                                }`}>
                                {daysLeft < 0 ? 'Membership Expired' : daysLeft <= 7 ? 'Expiring Soon' : 'Active Membership'}
                            </h3>
                            <p className={`text-sm mt-1 ${daysLeft < 0
                                    ? 'text-red-700'
                                    : daysLeft <= 7
                                        ? 'text-amber-700'
                                        : 'text-emerald-700'
                                }`}>
                                {daysLeft < 0
                                    ? `Your plan expired ${Math.abs(daysLeft)} days ago. Please renew at the desk.`
                                    : daysLeft <= 7
                                        ? `Your plan expires in ${daysLeft} days. Renew soon!`
                                        : `Your membership is active for ${daysLeft} more days.`
                                }
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Hero Membership Card */}
            <div className="relative overflow-hidden rounded-3xl gradient-emerald p-8 text-white shadow-xl">
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-white/10 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 rounded-full bg-black/10 blur-3xl"></div>

                <div className="relative z-10">
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <p className="text-emerald-100 text-sm font-medium uppercase tracking-wider mb-1">Member Card</p>
                            <h2 className="text-2xl font-bold">{gym?.name || "No Gym Selected"}</h2>
                            <div className="flex items-center gap-2 text-emerald-100 mt-2">
                                <MapPin className="w-4 h-4" />
                                <span className="text-sm">{gym?.location || "Unknown Location"}</span>
                            </div>
                        </div>
                        <div className={`px-4 py-2 rounded-full text-sm font-bold ${profile?.status === 'ACTIVE'
                                ? 'bg-white/20 backdrop-blur-sm text-white'
                                : 'bg-amber-400 text-amber-900'
                            }`}>
                            {profile?.status || "UNKNOWN"}
                        </div>
                    </div>

                    <div className="flex items-end justify-between">
                        <div>
                            <p className="text-emerald-100 text-xs uppercase tracking-wider mb-1">Member Name</p>
                            <p className="text-xl font-bold">{profile?.name}</p>
                        </div>
                        <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <Sparkles className="w-8 h-8" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm hover-lift transition-smooth">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-3 bg-emerald-100 rounded-xl">
                            <CreditCard className="w-5 h-5 text-emerald-600" />
                        </div>
                    </div>
                    <p className="text-sm text-gray-600 font-medium mb-1">Current Plan</p>
                    <p className="text-xl font-bold text-gray-900">{profile?.plan?.name || "No Plan"}</p>
                    {profile?.plan?.expiry && (
                        <p className="text-xs text-gray-500 mt-2">
                            Until {new Date(profile.plan.expiry.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                    )}
                </div>

                <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm hover-lift transition-smooth">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-3 bg-blue-100 rounded-xl">
                            <TrendingUp className="w-5 h-5 text-blue-600" />
                        </div>
                    </div>
                    <p className="text-sm text-gray-600 font-medium mb-1">Sessions</p>
                    <p className="text-xl font-bold text-gray-900">{completedSessions}</p>
                    <p className="text-xs text-gray-500 mt-2">Completed</p>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-gray-900 text-lg">Recent Activity</h3>
                        <p className="text-sm text-gray-500 mt-0.5">Your latest check-ins</p>
                    </div>
                    <Link href="/history" className="text-sm text-emerald-600 font-semibold hover:text-emerald-700 transition-colors">
                        View All
                    </Link>
                </div>

                <div className="divide-y divide-gray-100">
                    {attendance.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Activity className="w-8 h-8 text-gray-400" />
                            </div>
                            <p className="text-gray-900 font-medium mb-1">No recent check-ins</p>
                            <p className="text-sm text-gray-500">Start your fitness journey today!</p>
                        </div>
                    ) : (
                        attendance.map((session: any) => (
                            <div key={session.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                                <div className="flex items-start gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${session.checkOutTime
                                            ? 'bg-blue-100'
                                            : 'bg-emerald-100'
                                        }`}>
                                        {session.checkOutTime ? (
                                            <CheckCircle2 className="w-6 h-6 text-blue-600" />
                                        ) : (
                                            <Activity className="w-6 h-6 text-emerald-600" />
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="font-semibold text-gray-900">
                                                {session.checkOutTime ? 'Workout Completed' : 'Active Session'}
                                            </p>
                                            <span className={`text-xs font-bold px-3 py-1 rounded-full ${session.checkOutTime
                                                    ? 'bg-gray-100 text-gray-700'
                                                    : 'bg-emerald-100 text-emerald-700'
                                                }`}>
                                                {session.checkOutTime ? 'Done' : 'Active'}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-4 text-sm">
                                            <div className="flex items-center gap-1.5 text-gray-600">
                                                <Clock className="w-4 h-4" />
                                                <span className="font-medium">
                                                    {session.checkInTime ? new Date(session.checkInTime.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                </span>
                                                {session.checkOutTime && (
                                                    <>
                                                        <span className="text-gray-400">→</span>
                                                        <span className="font-medium">
                                                            {new Date(session.checkOutTime.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </>
                                                )}
                                            </div>

                                            {session.duration && (
                                                <div className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold">
                                                    {Math.floor(session.duration / 60)}h {session.duration % 60}m
                                                </div>
                                            )}
                                        </div>

                                        <p className="text-xs text-gray-500 mt-1.5">
                                            {session.checkInTime && new Date(session.checkInTime.seconds * 1000).toLocaleDateString('en-US', {
                                                weekday: 'long',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

"use client";

import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";
import { User, MapPin, Calendar, Activity, CreditCard } from "lucide-react";
import Link from "next/link";

interface UserProfile {
    name: string;
    email: string;
    gymId: string;
    status: string;
    plan?: {
        name: string;
        expiry: any; // Timestamp
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
                // 1. Fetch User Profile
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data() as UserProfile;
                    setProfile(userData);

                    // 2. Fetch Gym Details
                    if (userData.gymId) {
                        const gymDoc = await getDoc(doc(db, "gyms", userData.gymId));
                        if (gymDoc.exists()) {
                            setGym(gymDoc.data() as GymDetails);
                        }
                    }
                }

                // 2. Fetch Recent Attendance
                const attQuery = query(
                    collection(db, "attendance"),
                    where("userId", "==", user.uid),
                    orderBy("checkInTime", "desc"), // checkInTime
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
        return <div className="p-8 text-center text-muted-foreground">Loading dashboard...</div>;
    }

    return (
        <div className="space-y-6 pb-20"> {/* pb-20 for bottom nav clearance */}

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Welcome, {profile?.name?.split(' ')[0]}!</h1>
                <p className="text-gray-500">Let's get moving today.</p>
            </div>

            {/* Status Alerts */}
            {profile?.plan?.expiry && (
                (() => {
                    const expiry = new Date(profile.plan.expiry.seconds * 1000);
                    const now = new Date();
                    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                    if (daysLeft < 0) {
                        return (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 text-red-800">
                                <div className="p-2 bg-red-100 rounded-full">
                                    <Activity className="w-5 h-5 text-red-600" />
                                </div>
                                <div>
                                    <p className="font-bold">Membership Expired</p>
                                    <p className="text-sm">Your plan expired {Math.abs(daysLeft)} days ago. Please pay at the desk to renew.</p>
                                </div>
                            </div>
                        );
                    } else if (daysLeft <= 7) {
                        return (
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center gap-3 text-orange-800">
                                <div className="p-2 bg-orange-100 rounded-full">
                                    <Calendar className="w-5 h-5 text-orange-600" />
                                </div>
                                <div>
                                    <p className="font-bold">Expiring Soon</p>
                                    <p className="text-sm">Your plan expires in {daysLeft} days. Renew soon to avoid interruption.</p>
                                </div>
                            </div>
                        );
                    }
                    return null;
                })()
            )}

            {/* Digital Member Card */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white shadow-xl">
                <div className="absolute top-0 right-0 -mr-16 -mt-16 h-48 w-48 rounded-full bg-white/5 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl"></div>

                <div className="relative z-10">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-lg font-bold tracking-wide">{gym?.name || "No Gym Selected"}</h2>
                            <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                                <MapPin className="w-3 h-3" />
                                {gym?.location || "Unknown Location"}
                            </div>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-bold ${profile?.status === 'ACTIVE' ? 'bg-emerald-500 text-white' : 'bg-yellow-500 text-black'}`}>
                            {profile?.status || "UNKNOWN"}
                        </div>
                    </div>

                    <div className="mt-8 flex items-end justify-between">
                        <div>
                            <p className="text-xs text-slate-400 uppercase tracking-wider">Member Name</p>
                            <p className="text-lg font-medium">{profile?.name}</p>
                        </div>
                        <div>
                            <User className="w-8 h-8 text-slate-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Stats / Membership */}
            <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                        <CreditCard className="w-4 h-4 text-emerald-600" />
                        <h3 className="text-sm font-semibold text-gray-700">Current Plan</h3>
                    </div>
                    <p className="text-lg font-bold text-gray-900">{profile?.plan?.name || "No Plan"}</p>
                    <p className="text-xs text-gray-500">
                        {profile?.plan?.expiry ? `Expires: ${new Date(profile.plan.expiry.seconds * 1000).toLocaleDateString()}` : "Contact Admin"}
                    </p>
                </div>
                <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-4 h-4 text-emerald-600" />
                        <h3 className="text-sm font-semibold text-gray-700">Attendance</h3>
                    </div>
                    <p className="text-lg font-bold text-gray-900">{attendance.filter((a: any) => a.status === 'COMPLETED').length}</p>
                    <p className="text-xs text-gray-500">Sessions (recent)</p>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900">Recent Activity</h3>
                    <Link href="/history" className="text-xs text-emerald-600 font-medium hover:text-emerald-700">View All</Link>
                </div>

                <div className="space-y-4">
                    {attendance.length === 0 ? (
                        <div className="flex items-center gap-3 py-2 opacity-50">
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                <Calendar className="w-4 h-4 text-gray-400" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-900">No recent check-ins</p>
                                <p className="text-xs text-gray-500">Start working out!</p>
                            </div>
                        </div>
                    ) : (
                        attendance.map((session: any) => (
                            <div key={session.id} className="flex items-start gap-4 py-3 border-b last:border-0 border-gray-50">
                                <div className={`w-10 h-10 rounded-full flex shrink-0 items-center justify-center ${session.checkOutTime ? 'bg-blue-100' : 'bg-emerald-100'}`}>
                                    <Activity className={`w-4 h-4 ${session.checkOutTime ? 'text-blue-600' : 'text-emerald-600'}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-sm font-bold text-gray-900 truncate">
                                            {session.checkOutTime ? 'Workout Completed' : 'Current Session'}
                                        </p>
                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${session.checkOutTime ? 'bg-gray-100 text-gray-600' : 'bg-emerald-100 text-emerald-700'}`}>
                                            {session.checkOutTime ? 'Done' : 'Active'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div className="text-xs text-gray-500">
                                            <div className="flex items-center gap-1">
                                                <span>In:</span>
                                                <span className="font-medium text-gray-900">
                                                    {session.checkInTime ? new Date(session.checkInTime.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                </span>
                                            </div>
                                            {session.checkOutTime && (
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    <span>Out:</span>
                                                    <span className="font-medium text-gray-900">
                                                        {new Date(session.checkOutTime.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        {session.duration && (
                                            <div className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                                {Math.floor(session.duration / 60)}h {session.duration % 60}m
                                            </div>
                                        )}
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

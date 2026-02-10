"use client";

import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ArrowLeft, Calendar, Clock, Activity } from "lucide-react";
import Link from "next/link";

interface AttendanceSession {
    id: string;
    gymId: string;
    checkInTime: any;
    checkOutTime?: any;
    status: string; // PRESENT, COMPLETED
    date?: string;
}

interface GymMap {
    [key: string]: string; // id -> name
}

export default function HistoryPage() {
    const { user } = useAuth();
    const [sessions, setSessions] = useState<AttendanceSession[]>([]);
    const [gyms, setGyms] = useState<GymMap>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;

            try {
                // 1. Fetch User's Attendance (Latest 50)
                // New Schema: Single doc per session
                const q = query(
                    collection(db, "attendance"),
                    where("userId", "==", user.uid),
                    orderBy("checkInTime", "desc"),
                    limit(50)
                );

                const snap = await getDocs(q);
                const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceSession));
                setSessions(data);

                // 2. Fetch Gym Names for these sessions
                const uniqueGymIds = Array.from(new Set(data.map(s => s.gymId)));
                if (uniqueGymIds.length > 0) {
                    const gymMap: GymMap = {};
                    // In a real app, use `where('id', 'in', ids)` (chunked) or valueChanges on gyms
                    // For MVP, we'll just fetch all gyms or one by one. 
                    // Let's fetch all gyms for simplicity as there aren't many.
                    const gymsSnap = await getDocs(collection(db, "gyms"));
                    gymsSnap.forEach(doc => {
                        gymMap[doc.id] = doc.data().name;
                    });
                    setGyms(gymMap);
                }

            } catch (err) {
                console.error("Failed to load history", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    const formatDuration = (start: any, end: any) => {
        if (!start || !end) return "--";
        const diffMs = (end.seconds - start.seconds) * 1000;
        const minutes = Math.floor(diffMs / 60000);
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white px-4 py-4 shadow-sm sticky top-0 z-10 flex items-center gap-3">
                <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-full transition">
                    <ArrowLeft className="w-5 h-5 text-gray-700" />
                </Link>
                <h1 className="text-lg font-bold text-gray-900">Attendance History</h1>
            </div>

            <div className="p-4 space-y-4">
                {loading ? (
                    <div className="text-center py-10 text-gray-500">Loading history...</div>
                ) : sessions.length === 0 ? (
                    <div className="text-center py-10">
                        <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Activity className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-gray-900 font-medium">No workouts yet</h3>
                        <p className="text-gray-500 text-sm mt-1">Scan a QR code to start tracking!</p>
                    </div>
                ) : (
                    sessions.map(session => {
                        const date = session.checkInTime ? new Date(session.checkInTime.seconds * 1000) : new Date();
                        const isCompleted = session.status === 'COMPLETED';

                        return (
                            <div key={session.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="font-bold text-gray-900">{gyms[session.gymId] || "Unknown Gym"}</h3>
                                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                            <Calendar className="w-3 h-3" />
                                            {date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                        </div>
                                    </div>
                                    <div className={`px-2 py-1 rounded text-xs font-bold ${isCompleted ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {isCompleted ? 'Completed' : 'In Progress'}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 border-t border-gray-50 pt-3">
                                    <div>
                                        <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> Check In
                                        </p>
                                        <p className="font-medium text-gray-900 text-sm">
                                            {session.checkInTime ? new Date(session.checkInTime.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> Duration
                                        </p>
                                        <p className="font-medium text-gray-900 text-sm">
                                            {isCompleted ? formatDuration(session.checkInTime, session.checkOutTime) : 'Ongoing'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

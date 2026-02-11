"use client";

import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Mail, MapPin, CreditCard, Calendar, LogOut, ArrowLeft, Save, Edit2, User2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
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

export default function ProfilePage() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [gym, setGym] = useState<GymDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editedName, setEditedName] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;

            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data() as UserProfile;
                    setProfile(userData);
                    setEditedName(userData.name);

                    if (userData.gymId) {
                        const gymDoc = await getDoc(doc(db, "gyms", userData.gymId));
                        if (gymDoc.exists()) {
                            setGym(gymDoc.data() as GymDetails);
                        }
                    }
                }
            } catch (error) {
                console.error("Error fetching profile data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    const handleSave = async () => {
        if (!user || !editedName.trim()) return;

        setSaving(true);
        try {
            await updateDoc(doc(db, "users", user.uid), {
                name: editedName.trim()
            });
            setProfile(prev => prev ? { ...prev, name: editedName.trim() } : null);
            setEditing(false);
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("Failed to update profile. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
            router.push("/login");
        } catch (error) {
            console.error("Error logging out:", error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500 font-medium">Loading profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-24 fade-in">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link href="/dashboard" className="p-2.5 hover:bg-gray-100 rounded-xl transition-all">
                    <ArrowLeft className="w-5 h-5 text-gray-700" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                    <p className="text-gray-600 text-sm">Manage your profile & preferences</p>
                </div>
            </div>

            {/* Profile Hero Card */}
            <div className="relative overflow-hidden rounded-3xl gradient-emerald p-8 text-white shadow-xl">
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-white/10 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-black/10 blur-3xl"></div>

                <div className="relative z-10 flex items-center gap-5">
                    <div className="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-4xl font-bold border-4 border-white/30">
                        {profile?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold mb-1">{profile?.name}</h2>
                        <p className="text-emerald-100 text-sm mb-3">{profile?.email}</p>
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${profile?.status === 'ACTIVE'
                                ? 'bg-white/20 backdrop-blur-sm text-white'
                                : 'bg-amber-400 text-amber-900'
                            }`}>
                            <Sparkles className="w-3 h-3" />
                            {profile?.status || "UNKNOWN"}
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Profile Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900 text-lg">Profile Information</h3>
                    <p className="text-sm text-gray-500 mt-0.5">Update your personal details</p>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                        {editing ? (
                            <input
                                type="text"
                                value={editedName}
                                onChange={(e) => setEditedName(e.target.value)}
                                className="w-full px-4 py-3 border-2 border-emerald-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium text-gray-900"
                                autoFocus
                                placeholder="Enter your name"
                            />
                        ) : (
                            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                                <User2 className="w-5 h-5 text-gray-500" />
                                <span className="font-medium text-gray-900">{profile?.name}</span>
                            </div>
                        )}
                    </div>

                    {/* Edit/Save Buttons */}
                    <div className="flex gap-3 pt-2">
                        {editing ? (
                            <>
                                <button
                                    onClick={handleSave}
                                    disabled={saving || !editedName.trim()}
                                    className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover-lift"
                                >
                                    <Save className="w-4 h-4" />
                                    {saving ? "Saving..." : "Save Changes"}
                                </button>
                                <button
                                    onClick={() => {
                                        setEditing(false);
                                        setEditedName(profile?.name || "");
                                    }}
                                    className="px-6 py-3 rounded-xl font-semibold border-2 border-gray-200 text-gray-700 hover:bg-gray-50 transition-all"
                                >
                                    Cancel
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => setEditing(true)}
                                className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                            >
                                <Edit2 className="w-4 h-4" />
                                Edit Profile
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Account Details */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900 text-lg">Account Details</h3>
                    <p className="text-sm text-gray-500 mt-0.5">Your membership information</p>
                </div>

                <div className="p-6 space-y-3">
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Mail className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-0.5">Email Address</p>
                            <p className="text-sm font-medium text-gray-900 truncate">{profile?.email}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-0.5">Gym Location</p>
                            <p className="text-sm font-medium text-gray-900">{gym?.name || "No Gym Selected"}</p>
                            {gym?.location && (
                                <p className="text-xs text-gray-500 mt-0.5">{gym.location}</p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <CreditCard className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-0.5">Membership Plan</p>
                            <p className="text-sm font-medium text-gray-900">{profile?.plan?.name || "No Active Plan"}</p>
                        </div>
                    </div>

                    {profile?.plan?.expiry && (
                        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                <Calendar className="w-5 h-5 text-amber-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-0.5">Plan Expires</p>
                                <p className="text-sm font-medium text-gray-900">
                                    {new Date(profile.plan.expiry.seconds * 1000).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Logout Button */}
            <button
                onClick={handleLogout}
                className="w-full bg-red-50 text-red-600 py-4 rounded-2xl font-bold hover:bg-red-100 transition-all flex items-center justify-center gap-2 border-2 border-red-200 hover-lift"
            >
                <LogOut className="w-5 h-5" />
                Logout
            </button>
        </div>
    );
}

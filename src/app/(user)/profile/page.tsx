"use client";

import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Mail, MapPin, CreditCard, Calendar, LogOut, ArrowLeft, Save } from "lucide-react";
import { useRouter } from "next/navigation";
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
                // Fetch User Profile
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data() as UserProfile;
                    setProfile(userData);
                    setEditedName(userData.name);

                    // Fetch Gym Details
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
        return <div className="p-8 text-center text-muted-foreground">Loading profile...</div>;
    }

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5 text-gray-700" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                        <p className="text-gray-500 text-sm">Manage your profile</p>
                    </div>
                </div>
            </div>

            {/* Profile Card */}
            <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-2xl font-bold">
                        {profile?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                        {editing ? (
                            <input
                                type="text"
                                value={editedName}
                                onChange={(e) => setEditedName(e.target.value)}
                                className="text-xl font-bold text-gray-900 border-b-2 border-emerald-500 focus:outline-none w-full"
                                autoFocus
                            />
                        ) : (
                            <h2 className="text-xl font-bold text-gray-900">{profile?.name}</h2>
                        )}
                        <div className={`inline-block px-2 py-1 rounded-full text-xs font-bold mt-1 ${profile?.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {profile?.status || "UNKNOWN"}
                        </div>
                    </div>
                </div>

                {/* Edit/Save Button */}
                <div className="flex gap-2">
                    {editing ? (
                        <>
                            <button
                                onClick={handleSave}
                                disabled={saving || !editedName.trim()}
                                className="flex-1 bg-emerald-600 text-white py-2.5 rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <Save className="w-4 h-4" />
                                {saving ? "Saving..." : "Save Changes"}
                            </button>
                            <button
                                onClick={() => {
                                    setEditing(false);
                                    setEditedName(profile?.name || "");
                                }}
                                className="px-4 py-2.5 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setEditing(true)}
                            className="w-full bg-gray-100 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                        >
                            Edit Profile
                        </button>
                    )}
                </div>
            </div>

            {/* Account Information */}
            <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4">Account Information</h3>
                <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Mail className="w-5 h-5 text-gray-500" />
                        <div className="flex-1">
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Email</p>
                            <p className="text-sm font-medium text-gray-900">{profile?.email}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <MapPin className="w-5 h-5 text-gray-500" />
                        <div className="flex-1">
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Gym</p>
                            <p className="text-sm font-medium text-gray-900">{gym?.name || "No Gym Selected"}</p>
                            {gym?.location && (
                                <p className="text-xs text-gray-500">{gym.location}</p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <CreditCard className="w-5 h-5 text-gray-500" />
                        <div className="flex-1">
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Current Plan</p>
                            <p className="text-sm font-medium text-gray-900">{profile?.plan?.name || "No Plan"}</p>
                        </div>
                    </div>

                    {profile?.plan?.expiry && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <Calendar className="w-5 h-5 text-gray-500" />
                            <div className="flex-1">
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Plan Expiry</p>
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
                className="w-full bg-red-50 text-red-600 py-3 rounded-lg font-medium hover:bg-red-100 transition-colors flex items-center justify-center gap-2 border border-red-200"
            >
                <LogOut className="w-5 h-5" />
                Logout
            </button>
        </div>
    );
}

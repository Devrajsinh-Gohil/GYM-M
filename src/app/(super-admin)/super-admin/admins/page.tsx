"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { ShieldCheck, UserPlus, X, Trash2, Building2, Search } from "lucide-react";

interface AdminUser {
    id: string;
    name: string;
    email: string;
    gymId: string;
    gymName?: string;
}

interface Gym {
    id: string;
    name: string;
}

export default function AdminsPage() {
    const [admins, setAdmins] = useState<AdminUser[]>([]);
    const [gyms, setGyms] = useState<Gym[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [email, setEmail] = useState("");
    const [selectedGym, setSelectedGym] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    const fetchData = async () => {
        setLoading(true);
        try {
            const gymsSnap = await getDocs(collection(db, "gyms"));
            const gymList = gymsSnap.docs.map(g => ({ id: g.id, ...g.data() } as Gym));
            setGyms(gymList);

            const gymMap = new Map(gymList.map(g => [g.id, g.name]));

            const q = query(collection(db, "users"), where("role", "==", "GYM_ADMIN"));
            const adminsSnap = await getDocs(q);

            const adminsList = adminsSnap.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    gymName: gymMap.get(data.gymId) || "Unknown Gym"
                } as AdminUser;
            });

            setAdmins(adminsList);

        } catch (err) {
            console.error("Error fetching data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handlePromote = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSubmitting(true);

        try {
            const q = query(collection(db, "users"), where("email", "==", email));
            const snap = await getDocs(q);

            if (snap.empty) {
                setError("User with this email not found. Please ask them to sign up first.");
                setSubmitting(false);
                return;
            }

            const userDoc = snap.docs[0];

            await updateDoc(doc(db, "users", userDoc.id), {
                role: "GYM_ADMIN",
                gymId: selectedGym
            });

            setIsModalOpen(false);
            setEmail("");
            setSelectedGym("");
            fetchData();
            alert(`Successfully promoted ${userDoc.data().name} to Admin!`);

        } catch (err) {
            console.error(err);
            setError("Failed to promote user.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDemote = async (adminId: string) => {
        if (!confirm("Are you sure? This user will lose Admin access.")) return;
        try {
            await updateDoc(doc(db, "users", adminId), {
                role: "USER",
                gymId: ""
            });
            fetchData();
        } catch (err) {
            console.error(err);
            alert("Failed to remove admin.");
        }
    };

    const filteredAdmins = admins.filter(admin =>
        admin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        admin.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (admin.gymName && admin.gymName.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="space-y-6 pb-20 fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Manage Admins</h1>
                    <p className="text-gray-600 mt-1">Assign and manage gym administrators</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-semibold shadow-sm hover-lift"
                >
                    <UserPlus className="w-5 h-5" />
                    Assign Admin
                </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search admins by name, email, or gym..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors"
                />
            </div>

            {/* Admins List */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-500 font-medium">Loading admins...</p>
                    </div>
                ) : filteredAdmins.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ShieldCheck className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-900 font-medium mb-1">
                            {searchQuery ? "No admins found" : "No gym admins yet"}
                        </p>
                        <p className="text-sm text-gray-500">
                            {searchQuery ? "Try adjusting your search" : "Assign admin access to get started"}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {filteredAdmins.map((admin) => (
                            <div key={admin.id} className="p-6 hover:bg-gray-50 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4 flex-1">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                                            {admin.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-gray-900 mb-1">{admin.name}</h3>
                                            <p className="text-sm text-gray-600 mb-2">{admin.email}</p>
                                            <div className="flex items-center gap-1.5 text-sm text-gray-700">
                                                <Building2 className="w-4 h-4 text-gray-400" />
                                                <span>{admin.gymName}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleDemote(admin.id)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-4"
                                        title="Remove Admin Access"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Assign Admin Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-xl text-gray-900">Assign New Admin</h3>
                                <p className="text-sm text-gray-500 mt-0.5">Grant admin access to a user</p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <form onSubmit={handlePromote} className="p-6 space-y-4">
                            {error && (
                                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">User Email</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="user@example.com"
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors"
                                />
                                <p className="mt-2 text-xs text-gray-500">User must already be signed up in the app.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Assign to Gym</label>
                                <select
                                    required
                                    value={selectedGym}
                                    onChange={(e) => setSelectedGym(e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors bg-white"
                                >
                                    <option value="">Select a Gym...</option>
                                    {gyms.map(g => (
                                        <option key={g.id} value={g.id}>{g.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-semibold disabled:opacity-50"
                                >
                                    {submitting ? "Assigning..." : "Assign Access"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

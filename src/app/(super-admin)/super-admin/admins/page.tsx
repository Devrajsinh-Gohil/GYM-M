"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, updateDoc, doc, getDoc } from "firebase/firestore";
import { ShieldCheck, UserPlus, XCircle, Trash2, Building2 } from "lucide-react";

interface AdminUser {
    id: string;
    name: string;
    email: string;
    gymId: string;
    gymName?: string; // Enriched
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

    // Form State
    const [email, setEmail] = useState("");
    const [selectedGym, setSelectedGym] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch All Gyms (for mapping and dropdown)
            const gymsSnap = await getDocs(collection(db, "gyms"));
            const gymList = gymsSnap.docs.map(g => ({ id: g.id, ...g.data() } as Gym));
            setGyms(gymList);

            const gymMap = new Map(gymList.map(g => [g.id, g.name]));

            // 2. Fetch All Admins (users where role == 'GX_ADMIN')
            // Note: This requires an index in Firestore usually, or client-side filtering if small.
            // Let's try query.
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
            // 1. Find User by Email
            const q = query(collection(db, "users"), where("email", "==", email));
            const snap = await getDocs(q);

            if (snap.empty) {
                setError("User with this email not found. Please ask them to sign up first.");
                setSubmitting(false);
                return;
            }

            const userDoc = snap.docs[0];

            // 2. Update User Doc
            await updateDoc(doc(db, "users", userDoc.id), {
                role: "GYM_ADMIN",
                gymId: selectedGym
            });

            // 3. Refresh
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
                gymId: "" // Optional: Keep gymId if they are just a member of that gym now?
                // For simplicity, let's clear it or keep it. 
                // If we clear it, they become a 'New User' essentially. 
                // Best to maybe keep it if they were a member, but let's clear to be safe and they can re-onboard.
                // Actually, if they demote, they likely shouldn't have no gym. 
                // Let's just change role.
            });
            fetchData();
        } catch (err) {
            console.error(err);
            alert("Failed to  remove admin.");
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Manage Admins</h1>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition shadow-sm"
                >
                    <UserPlus className="w-4 h-4" />
                    Assign Admin
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading admins...</div>
                ) : admins.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center text-gray-500">
                        <ShieldCheck className="w-12 h-12 mb-3 opacity-20" />
                        <p>No Gym Admins found.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                                <tr>
                                    <th className="px-6 py-3">Name</th>
                                    <th className="px-6 py-3">Email</th>
                                    <th className="px-6 py-3">Assigned Gym</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {admins.map((admin) => (
                                    <tr key={admin.id} className="border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {admin.name}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">{admin.email}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-gray-700">
                                                <Building2 className="w-4 h-4 text-gray-400" />
                                                {admin.gymName}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDemote(admin.id)}
                                                className="text-red-600 hover:text-red-900 hover:bg-red-50 p-2 rounded transition"
                                                title="Remove Admin Access"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Assign Admin Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg">Assign New Admin</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handlePromote} className="p-6 space-y-4">
                            {error && (
                                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">User Email</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="user@example.com"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                                />
                                <p className="mt-1 text-xs text-gray-500">User must already be signed up in the app.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Gym</label>
                                <select
                                    required
                                    value={selectedGym}
                                    onChange={(e) => setSelectedGym(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
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
                                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition font-medium"
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

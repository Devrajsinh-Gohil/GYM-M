"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { Plus, MapPin, MoreVertical, Building2, CheckCircle, XCircle } from "lucide-react";

interface Gym {
    id: string;
    name: string;
    location: string;
    active: boolean;
    createdAt?: any;
}

export default function GymsPage() {
    const { user } = useAuth();
    const [gyms, setGyms] = useState<Gym[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newGym, setNewGym] = useState({ name: "", location: "" });
    const [submitting, setSubmitting] = useState(false);

    // Fetch Gyms
    const fetchGyms = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "gyms"), orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            const gymList = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Gym[];
            setGyms(gymList);
        } catch (error) {
            console.error("Error fetching gyms:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGyms();
    }, [user]);

    // Add Gym
    const handleAddGym = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGym.name || !newGym.location) return;

        setSubmitting(true);
        try {
            await addDoc(collection(db, "gyms"), {
                name: newGym.name,
                location: newGym.location,
                active: true,
                createdAt: serverTimestamp(),
            });
            setNewGym({ name: "", location: "" });
            setIsModalOpen(false);
            fetchGyms(); // Refresh list
        } catch (error) {
            console.error("Error adding gym:", error);
            alert("Failed to add gym");
        } finally {
            setSubmitting(false);
        }
    };

    // Toggle Active Status
    const toggleStatus = async (gym: Gym) => {
        try {
            const gymRef = doc(db, "gyms", gym.id);
            await updateDoc(gymRef, {
                active: !gym.active,
            });
            // Optimistic update
            setGyms(gyms.map((g) => (g.id === gym.id ? { ...g, active: !g.active } : g)));
        } catch (error) {
            console.error("Error updating gym:", error);
            alert("Failed to update status");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Gym Management</h1>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Add Gym
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading gyms...</div>
                ) : gyms.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center text-gray-500">
                        <Building2 className="w-12 h-12 mb-3 opacity-20" />
                        <p>No gyms found. Add your first one!</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                                <tr>
                                    <th className="px-6 py-3">Name</th>
                                    <th className="px-6 py-3">Location</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {gyms.map((gym) => (
                                    <tr key={gym.id} className="border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-500">
                                                <Building2 className="w-4 h-4" />
                                            </div>
                                            {gym.name}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">
                                            <div className="flex items-center gap-1">
                                                <MapPin className="w-3 h-3" />
                                                {gym.location}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {gym.active ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                    Inactive
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <a
                                                    href={`/super-admin/gyms/${gym.id}`}
                                                    className="text-xs font-medium px-3 py-1 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition"
                                                >
                                                    Dashboard
                                                </a>
                                                <button
                                                    onClick={() => toggleStatus(gym)}
                                                    className={`text-xs font-medium px-3 py-1 rounded transition ${gym.active ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                                                >
                                                    {gym.active ? 'Disable' : 'Enable'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add Gym Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg">Add New Gym</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAddGym} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Gym Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newGym.name}
                                    onChange={(e) => setNewGym({ ...newGym, name: e.target.value })}
                                    placeholder="e.g. Iron Fitness Downtown"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                                <input
                                    type="text"
                                    required
                                    value={newGym.location}
                                    onChange={(e) => setNewGym({ ...newGym, location: e.target.value })}
                                    placeholder="e.g. 123 Main St, New York"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                                />
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
                                    {submitting ? "Creating..." : "Create Gym"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

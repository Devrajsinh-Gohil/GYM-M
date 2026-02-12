"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { Plus, MapPin, Building2, X, Search, Power, PowerOff, ArrowLeft } from "lucide-react";
import Link from "next/link";

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
    const [searchQuery, setSearchQuery] = useState("");

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
            fetchGyms();
        } catch (error) {
            console.error("Error adding gym:", error);
            alert("Failed to add gym");
        } finally {
            setSubmitting(false);
        }
    };

    const toggleStatus = async (gym: Gym) => {
        try {
            const gymRef = doc(db, "gyms", gym.id);
            await updateDoc(gymRef, {
                active: !gym.active,
            });
            setGyms(gyms.map((g) => (g.id === gym.id ? { ...g, active: !g.active } : g)));
        } catch (error) {
            console.error("Error updating gym:", error);
            alert("Failed to update status");
        }
    };

    const filteredGyms = gyms.filter(gym =>
        gym.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        gym.location.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 pb-20 fade-in">
            {/* Header */}
            <div className="flex items-start gap-3">
                <Link
                    href="/super-admin/dashboard"
                    className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 hover:text-gray-900 transition-colors flex-shrink-0 mt-1"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex-1 min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Gym Management</h1>
                    <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage all registered gyms</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-semibold shadow-sm hover-lift flex-shrink-0 text-sm sm:text-base"
                >
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="hidden sm:inline">Add Gym</span>
                    <span className="sm:hidden">Add</span>
                </button>
            </div>


            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search gyms by name or location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors"
                />
            </div>

            {/* Gyms Grid */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-500 font-medium">Loading gyms...</p>
                    </div>
                ) : filteredGyms.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Building2 className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-900 font-medium mb-1">
                            {searchQuery ? "No gyms found" : "No gyms yet"}
                        </p>
                        <p className="text-sm text-gray-500">
                            {searchQuery ? "Try adjusting your search" : "Add your first gym to get started"}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {filteredGyms.map((gym) => (
                            <div key={gym.id} className="p-6 hover:bg-gray-50 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4 flex-1">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white flex-shrink-0">
                                            <Building2 className="w-6 h-6" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-bold text-gray-900">{gym.name}</h3>
                                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${gym.active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700"
                                                    }`}>
                                                    {gym.active ? "Active" : "Inactive"}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                                <MapPin className="w-4 h-4 text-gray-400" />
                                                <span>{gym.location}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 ml-4">
                                        <a
                                            href={`/super-admin/gyms/${gym.id}`}
                                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                                        >
                                            View Details
                                        </a>
                                        <button
                                            onClick={() => toggleStatus(gym)}
                                            className={`p-2 rounded-lg transition-colors ${gym.active
                                                ? "text-red-600 hover:bg-red-50"
                                                : "text-emerald-600 hover:bg-emerald-50"
                                                }`}
                                            title={gym.active ? "Disable gym" : "Enable gym"}
                                        >
                                            {gym.active ? (
                                                <PowerOff className="w-5 h-5" />
                                            ) : (
                                                <Power className="w-5 h-5" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Gym Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-xl text-gray-900">Add New Gym</h3>
                                <p className="text-sm text-gray-500 mt-0.5">Register a new gym location</p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <form onSubmit={handleAddGym} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Gym Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newGym.name}
                                    onChange={(e) => setNewGym({ ...newGym, name: e.target.value })}
                                    placeholder="e.g. Iron Fitness Downtown"
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Location</label>
                                <input
                                    type="text"
                                    required
                                    value={newGym.location}
                                    onChange={(e) => setNewGym({ ...newGym, location: e.target.value })}
                                    placeholder="e.g. 123 Main St, New York"
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors"
                                />
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

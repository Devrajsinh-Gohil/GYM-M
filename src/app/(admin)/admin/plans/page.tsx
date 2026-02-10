"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, getDoc, serverTimestamp } from "firebase/firestore";
import { Plus, CreditCard, Trash2, XCircle, DollarSign, Calendar } from "lucide-react";

interface Plan {
    id: string;
    name: string;
    price: number;
    durationMonths: number;
    description?: string;
    gymId: string;
}

export default function PlansPage() {
    const { user } = useAuth();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [gymId, setGymId] = useState<string | null>(null);

    // Modal & Form
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newPlan, setNewPlan] = useState({ name: "", price: "", duration: "1", description: "" });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const init = async () => {
            if (!user) return;
            try {
                // Get Admin's Gym
                const userDoc = await getDoc(doc(db, "users", user.uid));
                const gId = userDoc.data()?.gymId;
                if (gId) {
                    setGymId(gId);
                    fetchPlans(gId);
                }
            } catch (error) {
                console.error("Error initializing plans:", error);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [user]);

    const fetchPlans = async (gId: string) => {
        try {
            const q = query(collection(db, "plans"), where("gymId", "==", gId));
            const snap = await getDocs(q);
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Plan));
            setPlans(list);
        } catch (error) {
            console.error("Error fetching plans:", error);
        }
    };

    const handleAddPlan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!gymId || !newPlan.name || !newPlan.price) return;

        setSubmitting(true);
        try {
            await addDoc(collection(db, "plans"), {
                gymId,
                name: newPlan.name,
                price: Number(newPlan.price),
                durationMonths: Number(newPlan.duration),
                description: newPlan.description,
                createdAt: serverTimestamp()
            });

            setNewPlan({ name: "", price: "", duration: "1", description: "" });
            setIsModalOpen(false);
            fetchPlans(gymId);
        } catch (error) {
            console.error("Error adding plan:", error);
            alert("Failed to create plan");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (planId: string) => {
        if (!confirm("Delete this plan? Users currently on this plan will not be affected, but new users won't be able to select it.")) return;
        try {
            await deleteDoc(doc(db, "plans", planId));
            setPlans(plans.filter(p => p.id !== planId));
        } catch (error) {
            console.error("Error deleting plan:", error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Membership Plans</h1>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Create Plan
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <p className="text-gray-500 col-span-full text-center py-8">Loading plans...</p>
                ) : plans.length === 0 ? (
                    <div className="col-span-full text-center py-12 bg-white rounded-xl border border-gray-200 border-dashed">
                        <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No plans created yet.</p>
                    </div>
                ) : (
                    plans.map(plan => (
                        <div key={plan.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 relative group">
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition">
                                <button
                                    onClick={() => handleDelete(plan.id)}
                                    className="text-gray-400 hover:text-red-500"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>

                            <h3 className="text-lg font-bold text-gray-900 mb-1">{plan.name}</h3>
                            <p className="text-gray-500 text-sm mb-4">{plan.description || "No description"}</p>

                            <div className="flex items-baseline mb-4">
                                <span className="text-3xl font-bold text-emerald-600">₹{plan.price}</span>
                                <span className="text-gray-400 ml-1">/ {plan.durationMonths} mo</span>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                                <Calendar className="w-4 h-4" />
                                Duration: {plan.durationMonths} Month{plan.durationMonths > 1 ? 's' : ''}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add Plan Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg">New Membership Plan</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAddPlan} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newPlan.name}
                                    onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                                    placeholder="e.g. Gold Monthly"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2 text-gray-400">₹</span>
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            value={newPlan.price}
                                            onChange={(e) => setNewPlan({ ...newPlan, price: e.target.value })}
                                            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Months)</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        value={newPlan.duration}
                                        onChange={(e) => setNewPlan({ ...newPlan, duration: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                                <textarea
                                    value={newPlan.description}
                                    onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                                ></textarea>
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
                                    {submitting ? "Creating..." : "Create Plan"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

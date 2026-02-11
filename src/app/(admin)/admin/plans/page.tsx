"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, getDoc, serverTimestamp } from "firebase/firestore";
import { Plus, CreditCard, Trash2, X, DollarSign, Calendar, Package, Sparkles } from "lucide-react";

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
        <div className="space-y-6 pb-20 fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Membership Plans</h1>
                    <p className="text-gray-600 mt-1">Create and manage subscription plans</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-semibold shadow-sm hover-lift"
                >
                    <Plus className="w-5 h-5" />
                    Create Plan
                </button>
            </div>

            {/* Plans Grid */}
            {loading ? (
                <div className="min-h-[400px] flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-500 font-medium">Loading plans...</p>
                    </div>
                </div>
            ) : plans.length === 0 ? (
                <div className="bg-white rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Package className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">No plans yet</h3>
                    <p className="text-gray-500 mb-6">Create your first membership plan to get started</p>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-semibold"
                    >
                        Create Plan
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {plans.map((plan, index) => {
                        const gradients = [
                            'from-blue-500 to-blue-600',
                            'from-purple-500 to-purple-600',
                            'from-emerald-500 to-emerald-600',
                            'from-orange-500 to-orange-600',
                            'from-pink-500 to-pink-600',
                            'from-indigo-500 to-indigo-600',
                        ];
                        const gradient = gradients[index % gradients.length];

                        return (
                            <div key={plan.id} className="relative overflow-hidden bg-white rounded-2xl border border-gray-200 shadow-sm hover-lift transition-smooth group">
                                {/* Gradient Header */}
                                <div className={`relative bg-gradient-to-br ${gradient} p-6 text-white`}>
                                    <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white/10 blur-2xl"></div>
                                    <div className="relative z-10">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                                <Sparkles className="w-6 h-6" />
                                            </div>
                                            <button
                                                onClick={() => handleDelete(plan.id)}
                                                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                title="Delete plan"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <h3 className="text-2xl font-bold mb-1">{plan.name}</h3>
                                        <p className="text-white/80 text-sm line-clamp-2">
                                            {plan.description || "Premium membership plan"}
                                        </p>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-6">
                                    <div className="flex items-baseline mb-6">
                                        <span className="text-4xl font-bold text-gray-900">₹{plan.price}</span>
                                        <span className="text-gray-500 ml-2">/ {plan.durationMonths} mo</span>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <Calendar className="w-4 h-4 text-emerald-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 font-medium">Duration</p>
                                                <p className="text-sm font-bold text-gray-900">
                                                    {plan.durationMonths} Month{plan.durationMonths > 1 ? 's' : ''}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <DollarSign className="w-4 h-4 text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 font-medium">Per Month</p>
                                                <p className="text-sm font-bold text-gray-900">
                                                    ₹{Math.round(plan.price / plan.durationMonths)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add Plan Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-xl text-gray-900">New Membership Plan</h3>
                                <p className="text-sm text-gray-500 mt-0.5">Create a new subscription plan</p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <form onSubmit={handleAddPlan} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Plan Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newPlan.name}
                                    onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                                    placeholder="e.g. Gold Monthly"
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Price (₹)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            value={newPlan.price}
                                            onChange={(e) => setNewPlan({ ...newPlan, price: e.target.value })}
                                            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Duration (Months)</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        value={newPlan.duration}
                                        onChange={(e) => setNewPlan({ ...newPlan, duration: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Description (Optional)</label>
                                <textarea
                                    value={newPlan.description}
                                    onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                                    rows={3}
                                    placeholder="Describe what's included in this plan..."
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                                ></textarea>
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

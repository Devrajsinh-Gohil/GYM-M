"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, getDoc, Timestamp } from "firebase/firestore";
import { X, User, Calendar, CreditCard, ChevronRight, Trash2 } from "lucide-react";

interface Member {
    id: string;
    name: string;
    email: string;
    status: string;
    phoneNumber?: string;
    gymId: string;
    plan?: {
        id: string;
        name: string;
        expiry: any;
    };
}

interface Plan {
    id: string;
    name: string;
    durationMonths: number;
    price: number;
}

export default function MembersPage() {
    const { user } = useAuth();
    const [members, setMembers] = useState<Member[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"active" | "pending" | "rejected" | "expired" | "expiring_soon">("active");

    // Selected Member for Modal
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const [selectedPlanId, setSelectedPlanId] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [assigning, setAssigning] = useState(false);

    const fetchData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const adminDoc = await getDoc(doc(db, "users", user.uid));
            const gymId = adminDoc.data()?.gymId;

            if (!gymId) return;

            // 1. Fetch Members
            const q = query(
                collection(db, "users"),
                where("gymId", "==", gymId),
                where("role", "==", "USER")
            );
            const querySnapshot = await getDocs(q);
            const membersList = querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Member[];
            setMembers(membersList);

            // 2. Fetch Plans
            const plansQ = query(collection(db, "plans"), where("gymId", "==", gymId));
            const plansSnap = await getDocs(plansQ);
            setPlans(plansSnap.docs.map(d => ({ id: d.id, ...d.data() } as Plan)));

        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user]);

    const handleApprove = async (memberId: string) => {
        if (!confirm("Approve this member?")) return;
        try {
            await updateDoc(doc(db, "users", memberId), { status: "ACTIVE" });
            setMembers(prev => prev.map(m => m.id === memberId ? { ...m, status: "ACTIVE" } : m));
        } catch (error) { console.error(error); }
    };

    const handleReject = async (memberId: string) => {
        if (!confirm("Reject this member?")) return;
        try {
            await updateDoc(doc(db, "users", memberId), { status: "REJECTED" });
            setMembers(prev => prev.map(m => m.id === memberId ? { ...m, status: "REJECTED" } : m));
        } catch (error) { console.error(error); }
    };

    const handlePlanChange = (planId: string) => {
        setSelectedPlanId(planId);

        if (planId) {
            const plan = plans.find(p => p.id === planId);
            if (plan) {
                // Set start date to today
                const today = new Date();
                const startDateStr = today.toISOString().split('T')[0];
                setStartDate(startDateStr);

                // Calculate end date based on plan duration
                const endDateObj = new Date(today);
                endDateObj.setMonth(endDateObj.getMonth() + plan.durationMonths);
                const endDateStr = endDateObj.toISOString().split('T')[0];
                setEndDate(endDateStr);
            }
        } else {
            setStartDate("");
            setEndDate("");
        }
    };

    const handleAssignPlan = async () => {
        if (!selectedMember || !selectedPlanId || !startDate || !endDate) {
            alert("Please select a plan and set both start and end dates.");
            return;
        }

        // Validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (end <= start) {
            alert("End date must be after start date.");
            return;
        }

        setAssigning(true);
        try {
            const plan = plans.find(p => p.id === selectedPlanId);
            if (!plan) return;

            // Use custom dates instead of auto-calculating
            const expiryDate = new Date(endDate);

            await updateDoc(doc(db, "users", selectedMember.id), {
                plan: {
                    id: plan.id,
                    name: plan.name,
                    expiry: Timestamp.fromDate(expiryDate)
                }
            });

            // Update Local State
            setMembers(prev => prev.map(m => m.id === selectedMember.id ? {
                ...m,
                plan: { id: plan.id, name: plan.name, expiry: { seconds: Math.floor(expiryDate.getTime() / 1000) } }
            } : m));

            setSelectedMember(null);
            setSelectedPlanId("");
            setStartDate("");
            setEndDate("");
            alert("Plan assigned successfully!");

        } catch (error) {
            console.error("Error assigning plan:", error);
            alert("Failed to assign plan.");
        } finally {
            setAssigning(false);
        }
    };

    const handleRemoveMember = async (memberId: string, memberName: string) => {
        if (!confirm(`Are you sure you want to remove ${memberName} from this gym? This action will remove them from your member list but preserve their account.`)) return;
        try {
            await updateDoc(doc(db, "users", memberId), {
                gymId: null,
                status: "PENDING"
            });
            setMembers(prev => prev.filter(m => m.id !== memberId));
            setSelectedMember(null);
            alert("Member removed successfully!");
        } catch (error) {
            console.error("Error removing member:", error);
            alert("Failed to remove member.");
        }
    };

    // Helper to calculate status dynamically
    const getComputedStatus = (member: Member): string => {
        if (member.status === 'PENDING' || member.status === 'REJECTED') return member.status;

        if (!member.plan?.expiry) return member.status; // Fallback

        const now = new Date();
        const expiryDate = new Date(member.plan.expiry.seconds * 1000);
        const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysLeft < 0) return 'EXPIRED';
        if (daysLeft <= 7) return 'EXPIRING_SOON';

        return 'ACTIVE';
    };

    const filteredMembers = members.filter((m) => {
        const status = getComputedStatus(m);
        return status === activeTab.toUpperCase();
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Member Management</h1>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 rounded-xl bg-gray-100 p-1 w-fit overflow-x-auto">
                {["pending", "active", "expiring_soon", "expired", "rejected"].map((tab) => {
                    const count = members.filter(m => getComputedStatus(m) === tab.toUpperCase()).length;
                    return (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`px-4 py-2 text-sm font-medium rounded-lg capitalize whitespace-nowrap transition-all ${activeTab === tab
                                ? "bg-white text-gray-900 shadow"
                                : "text-gray-500 hover:text-gray-900"
                                }`}
                        >
                            {tab.replace('_', ' ')} ({count})
                        </button>
                    );
                })}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading members...</div>
                ) : filteredMembers.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center text-gray-500">
                        <User className="w-12 h-12 mb-3 opacity-20" />
                        <p>No {activeTab} members found.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                                <tr>
                                    <th className="px-6 py-3">Name</th>
                                    <th className="px-6 py-3">Email</th>
                                    <th className="px-6 py-3">Current Plan</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredMembers.map((member) => (
                                    <tr key={member.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedMember(member)}>
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {member.name}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">{member.email}</td>
                                        <td className="px-6 py-4 text-gray-500">
                                            {member.plan ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 font-medium text-xs">
                                                    <CreditCard className="w-3 h-3" />
                                                    {member.plan.name}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-400">No Plan</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Member Details Modal */}
            {selectedMember && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900">{selectedMember.name}</h3>
                                <p className="text-sm text-gray-500">{selectedMember.email}</p>
                            </div>
                            <button onClick={() => setSelectedMember(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6 overflow-y-auto">
                            {/* Status Actions */}
                            {selectedMember.status === 'PENDING' && (
                                <div className="flex gap-3">
                                    <button onClick={() => handleApprove(selectedMember.id)} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700">Approve</button>
                                    <button onClick={() => handleReject(selectedMember.id)} className="flex-1 py-2 bg-red-100 text-red-600 rounded-lg font-medium hover:bg-red-200">Reject</button>
                                </div>
                            )}

                            {/* Plan Assignment Section */}
                            <div className="space-y-3">
                                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Membership Plan</h4>

                                {selectedMember.plan ? (
                                    <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-bold text-emerald-800">{selectedMember.plan.name}</span>
                                            <span className="text-xs text-emerald-600 font-medium bg-white px-2 py-1 rounded-full">Active</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-emerald-700">
                                            <Calendar className="w-4 h-4" />
                                            Expires: {new Date(selectedMember.plan.expiry.seconds * 1000).toLocaleDateString()}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-sm text-gray-500 italic">No active plan assigned.</div>
                                )}

                                <div className="mt-4 pt-4 border-t border-gray-100">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {selectedMember.status === 'EXPIRED' ? 'Renew Membership' : 'Assign / Change Plan'}
                                    </label>
                                    <div className="space-y-3">
                                        <select
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            value={selectedPlanId}
                                            onChange={(e) => handlePlanChange(e.target.value)}
                                        >
                                            <option value="">Select Plan...</option>
                                            {plans.map(p => (
                                                <option key={p.id} value={p.id}>{p.name} (₹{p.price})</option>
                                            ))}
                                        </select>

                                        {selectedPlanId && (
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                                                    <input
                                                        type="date"
                                                        value={startDate}
                                                        onChange={(e) => setStartDate(e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                                                    <input
                                                        type="date"
                                                        value={endDate}
                                                        onChange={(e) => setEndDate(e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            onClick={handleAssignPlan}
                                            disabled={!selectedPlanId || !startDate || !endDate || assigning}
                                            className={`w-full px-4 py-2 text-white rounded-lg font-medium disabled:opacity-50 ${selectedMember.status === 'EXPIRED' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-slate-900 hover:bg-slate-800'}`}
                                        >
                                            {assigning ? "..." : (selectedMember.status === 'EXPIRED' ? "Renew" : "Assign")}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Remove Member Section */}
                            <div className="pt-4 border-t border-gray-100">
                                <button
                                    onClick={() => handleRemoveMember(selectedMember.id, selectedMember.name)}
                                    className="w-full py-2.5 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors flex items-center justify-center gap-2 border border-red-200"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Remove Member from Gym
                                </button>
                                <p className="text-xs text-gray-500 text-center mt-2">This will remove the member from your gym but preserve their account.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

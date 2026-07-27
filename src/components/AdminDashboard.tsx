/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { initializeApp, deleteApp } from "firebase/app";
import { doc, getDoc, collection, getDocs, updateDoc, setDoc } from "firebase/firestore";
import { db, firebaseConfig } from "../lib/firebase";
import { useNavigate } from "react-router-dom";
import { Users, Building2, Activity, Settings, LogOut, Plus, X, Loader2 } from "lucide-react";

export const AdminDashboard: React.FC = () => {
  const [adminData, setAdminData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("overview");

  // Create Admin State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    name: "",
    email: "",
    phone: "",
    organizationName: "",
    password: "",
    status: "Active",
    permissions: {
      dashboard: true,
      trips: true,
      journey: true,
      expenses: true,
      budget: true,
      travellers: true,
      documents: true,
      reports: true,
      settings: true
    }
  });
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const auth = getAuth();
  const navigate = useNavigate();

  const fetchAdminData = async () => {
    if (!auth.currentUser) {
      navigate("/admin-portal");
      return;
    }
    try {
      const adminDoc = await getDoc(doc(db, "admins", auth.currentUser.uid));
      if (adminDoc.exists()) {
        const role = adminDoc.data().role;
        if (role === "super_admin" || role === "admin" || role === "Admin") {
          setAdminData(adminDoc.data());
          if (role === "super_admin") {
            const orgsSnap = await getDocs(collection(db, "organizations"));
            setOrganizations(orgsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
            
            const adminsSnap = await getDocs(collection(db, "admins"));
            setAdmins(adminsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
          }
        } else {
          navigate("/admin-portal");
        }
      } else {
        navigate("/admin-portal");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [auth.currentUser, navigate]);

  const handleLogout = () => {
    auth.signOut();
    navigate("/admin-portal");
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setCreateError("");

    try {
      // Create a secondary app to avoid signing out the current Super Admin
      const secondaryApp = initializeApp(firebaseConfig, "Secondary");
      const secondaryAuth = getAuth(secondaryApp);
      
      const cred = await createUserWithEmailAndPassword(secondaryAuth, newAdmin.email, newAdmin.password);
      
      const orgId = `org_${Date.now()}`;
      
      // Create organization
      await setDoc(doc(db, "organizations", orgId), {
        id: orgId,
        name: newAdmin.organizationName,
        status: "Active",
        createdAt: new Date().toISOString(),
        createdBy: auth.currentUser?.uid
      });

      // Create Admin
      await setDoc(doc(db, "admins", cred.user.uid), {
        id: cred.user.uid,
        name: newAdmin.name,
        email: newAdmin.email,
        phone: newAdmin.phone,
        organizationId: orgId,
        organizationName: newAdmin.organizationName,
        role: "Admin",
        status: newAdmin.status,
        permissions: newAdmin.permissions,
        createdAt: new Date().toISOString()
      });

      // Cleanup
      await signOut(secondaryAuth);
      await deleteApp(secondaryApp);

      setIsCreateModalOpen(false);
      setNewAdmin({ name: "", email: "", phone: "", organizationName: "", password: "", status: "Active" });
      
      // Refresh
      fetchAdminData();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed') {
        setCreateError("Email/Password Auth is disabled in Firebase Console. Please enable it.");
      } else {
        setCreateError(err.message || "Failed to create Admin");
      }
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        Loading admin dashboard...
      </div>
    );
  }

  if (!adminData) return null;

  const isSuperAdmin = adminData.role === "super_admin";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-slate-300 flex flex-col hidden md:flex">
        <div className="p-6">
          <h2 className="text-white font-black text-xl tracking-tight">TripPro Admin</h2>
          <p className="text-xs font-bold text-indigo-400 mt-1 uppercase tracking-widest">{adminData.role}</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto pb-4">
          <button 
            onClick={() => setActiveTab("overview")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === "overview" ? "bg-indigo-600 text-white" : "hover:bg-slate-800"}`}
          >
            <Activity className="w-5 h-5" /> Dashboard
          </button>
          
          <button 
            onClick={() => setActiveTab("trips")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === "trips" ? "bg-indigo-600 text-white" : "hover:bg-slate-800"}`}
          >
            <Activity className="w-5 h-5" /> Trips
          </button>

          <button 
            onClick={() => setActiveTab("travellers")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === "travellers" ? "bg-indigo-600 text-white" : "hover:bg-slate-800"}`}
          >
            <Users className="w-5 h-5" /> Travellers
          </button>

          <button 
            onClick={() => setActiveTab("expenses")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === "expenses" ? "bg-indigo-600 text-white" : "hover:bg-slate-800"}`}
          >
            <Activity className="w-5 h-5" /> Expenses & Budgets
          </button>

          {isSuperAdmin && (
            <>
              <div className="pt-4 pb-2">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-4">Super Admin</p>
              </div>
              <button 
                onClick={() => setActiveTab("organizations")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === "organizations" ? "bg-indigo-600 text-white" : "hover:bg-slate-800"}`}
              >
                <Building2 className="w-5 h-5" /> Organizations
              </button>
              
              <button 
                onClick={() => setActiveTab("admins")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === "admins" ? "bg-indigo-600 text-white" : "hover:bg-slate-800"}`}
              >
                <Users className="w-5 h-5" /> Admin Management
              </button>
            </>
          )}

          <div className="pt-4 pb-2">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-4">System</p>
          </div>
          <button 
            onClick={() => setActiveTab("settings")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === "settings" ? "bg-indigo-600 text-white" : "hover:bg-slate-800"}`}
          >
            <Settings className="w-5 h-5" /> System Settings
          </button>
        </nav>
        
        <div className="p-4 mt-auto">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-rose-400 hover:bg-rose-500/10 rounded-xl font-bold transition-colors"
          >
            <LogOut className="w-5 h-5" /> Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950 p-6 lg:p-10">
        <div className="max-w-6xl mx-auto space-y-8">
          
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white capitalize">{activeTab}</h1>
              <p className="text-slate-500 font-medium">Welcome back, {adminData.name}</p>
            </div>
            
            {activeTab === "admins" && isSuperAdmin && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
              >
                <Plus className="w-4 h-4" /> Add Admin
              </button>
            )}
          </header>

          {activeTab === "overview" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {isSuperAdmin ? (
                <>
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Organizations</p>
                    <p className="text-4xl font-black text-slate-900 dark:text-white">{organizations.length}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Administrators</p>
                    <p className="text-4xl font-black text-slate-900 dark:text-white">{admins.length}</p>
                  </div>
                </>
              ) : (
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Active Organization</p>
                  <p className="text-xl font-black text-slate-900 dark:text-white">{adminData.organizationName}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "organizations" && isSuperAdmin && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Organization Name</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Created By</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm font-medium">
                    {organizations.map(org => (
                      <tr key={org.id} className="text-slate-900 dark:text-slate-300">
                        <td className="px-6 py-4">{org.name}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${org.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                            {org.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">{org.createdBy}</td>
                        <td className="px-6 py-4 text-right">
                          <button className="text-indigo-500 hover:text-indigo-400 font-bold">Edit</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "admins" && isSuperAdmin && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">Role</th>
                      <th className="px-6 py-4">Organization</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm font-medium">
                    {admins.map(admin => (
                      <tr key={admin.id} className="text-slate-900 dark:text-slate-300">
                        <td className="px-6 py-4">{admin.name}</td>
                        <td className="px-6 py-4">{admin.email}</td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[11px] font-bold">
                            {admin.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">{admin.organizationName || 'N/A'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${admin.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                            {admin.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
              <Settings className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h2 className="text-xl font-black text-slate-900 dark:text-white">System Settings</h2>
              <p className="text-slate-500 mt-2">Manage global system settings and configurations.</p>
            </div>
          )}

          {activeTab === "trips" && (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
              <Activity className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Trips Management</h2>
              <p className="text-slate-500 mt-2">View and manage all trips across the organization.</p>
            </div>
          )}

          {activeTab === "travellers" && (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
              <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Travellers</h2>
              <p className="text-slate-500 mt-2">View and manage all travellers.</p>
            </div>
          )}

          {activeTab === "expenses" && (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
              <Activity className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Expenses & Budgets</h2>
              <p className="text-slate-500 mt-2">Monitor organization-wide expenses and budgets.</p>
            </div>
          )}

        </div>
      </div>

      {/* Create Admin Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Create New Admin</h2>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateAdmin} className="p-6 space-y-4">
              {createError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-sm font-bold rounded-lg border border-rose-200 dark:border-rose-500/30">
                  {createError}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Admin Name</label>
                  <input type="text" required value={newAdmin.name} onChange={e => setNewAdmin({...newAdmin, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Phone</label>
                  <input type="tel" required value={newAdmin.phone} onChange={e => setNewAdmin({...newAdmin, phone: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Email Address</label>
                <input type="email" required value={newAdmin.email} onChange={e => setNewAdmin({...newAdmin, email: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Temporary Password</label>
                <input type="password" required minLength={6} value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin, password: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Organization Name</label>
                <input type="text" required value={newAdmin.organizationName} onChange={e => setNewAdmin({...newAdmin, organizationName: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500" placeholder="e.g. Fidians Tours" />
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Permissions</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(newAdmin.permissions).map(([key, value]) => (
                    <label key={key} className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 capitalize cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={value} 
                        onChange={(e) => setNewAdmin({
                          ...newAdmin, 
                          permissions: { ...newAdmin.permissions, [key]: e.target.checked }
                        })}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-700" 
                      />
                      {key}
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isCreating} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2">
                  {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isCreating ? "Creating..." : "Create Admin & Organization"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

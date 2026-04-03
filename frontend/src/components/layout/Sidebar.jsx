import { Link, NavLink } from "react-router-dom";
import {
  Home, Wallet, PiggyBank, TrendingUp, Target, Users, CreditCard, Repeat, LogOut, PieChart, X
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import toast from "../ui/Toast";

const navItems = [
  { to: "/dashboard", icon: Home, label: "Dashboard" },
  { to: "/analytics", icon: PieChart, label: "Analytics" },
  { to: "/transactions", icon: Wallet, label: "Transactions" },
  { to: "/budget", icon: PiggyBank, label: "Budget" },
  { to: "/investments", icon: TrendingUp, label: "Investments" },
  { to: "/goals", icon: Target, label: "Goals" },
  { to: "/emi", icon: CreditCard, label: "EMI & Loans" },
  { to: "/recurring", icon: Repeat, label: "Recurring" },
  { to: "/family", icon: Users, label: "Family" },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();

  return (
    <>
      {/* Sidebar Container */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white/80 backdrop-blur-xl shadow-2xl border-r border-gray-100 flex flex-col 
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
      `}>
        {/* Logo Section */}
        <div className="p-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <PieChart className="text-white" size={24} />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent">
              FinanceHub
            </h1>
          </div>
          {/* Close Button (Mobile Only) */}
          <button
            onClick={onClose}
            className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
          >
            <X size={24} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 mt-2 overflow-y-auto custom-scrollbar space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => onClose && onClose()} // Close sidebar on mobile when link clicked
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group ${isActive
                  ? "bg-indigo-50 text-indigo-700 font-bold shadow-sm ring-1 ring-indigo-200"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`transition-all duration-300 ${isActive ? "scale-110" : "group-hover:scale-110"}`}>
                    <item.icon size={20} className={isActive ? "text-indigo-600" : "text-gray-400 group-hover:text-gray-600"} />
                  </div>
                  <span>{item.label}</span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600 shadow-lg shadow-indigo-400" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User / Logout Section */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-gray-50 border border-gray-100 group hover:border-indigo-200 transition-all">
            <Link to="/profile" className="flex items-center gap-3 flex-1 min-w-0" onClick={() => onClose && onClose()}>
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-gray-200 shadow-sm overflow-hidden flex-shrink-0 group-hover:scale-105 transition-transform">
                {user?.profilePicture ? (
                  <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-indigo-600 font-bold uppercase">{user?.name?.[0]}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate group-hover:text-indigo-700">{user?.name}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </Link>
            <button
              onClick={() => {
                toast.confirm("Are you sure you want to logout?", () => {
                  logout();
                });
              }}
              className="p-2 text-gray-400 hover:text-rose-500 hover:bg-white rounded-lg transition-all"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
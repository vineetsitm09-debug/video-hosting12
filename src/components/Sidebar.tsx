import React from "react";
import { Home, Flame, Library, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";

type SideItemProps = {
  icon: React.ReactNode;
  label: string;
  to: string;
};

function SideItem({ icon, label, to }: SideItemProps) {
  return (
    <li>
      <NavLink
        to={to}
        className={({ isActive }) =>
          `w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors duration-200 ${
            isActive
              ? "bg-gray-900 text-red-500 font-semibold"
              : "text-gray-300 hover:bg-gray-800 hover:text-white"
          }`
        }
        aria-label={label}
      >
        {icon}
        <span className="text-sm">{label}</span>
      </NavLink>
    </li>
  );
}

export default function Sidebar({ themeCls }: { themeCls: any }) {
  return (
    <aside className="hidden md:block w-60">
      <nav
        role="navigation"
        className={`h-full rounded-2xl border border-white/10 shadow-md overflow-hidden bg-black/90 ${themeCls.panel}`}
      >
        <ul className="p-3 space-y-1">
          <SideItem icon={<Home className="w-5 h-5" />} label="Home" to="/" />
          <SideItem
            icon={<Flame className="w-5 h-5" />}
            label="Trending"
            to="/trending"
          />
          <SideItem
            icon={<Library className="w-5 h-5" />}
            label="Library"
            to="/library"
          />
          <SideItem
            icon={<Settings className="w-5 h-5" />}
            label="Settings"
            to="/settings"
          />
        </ul>
      </nav>
    </aside>
  );
}

import { useMemo } from "react";
import { NAV_ITEMS } from "../data/navItems";
import { useAuth } from "../context/AuthContext";

export const useNav = () => {
  const { user } = useAuth();
  const role = user ? user.role : "guest";

  const navLinks = useMemo(
    () => NAV_ITEMS.filter(item => item.roles.includes(role)),
    [role]
  );

  // --- MÓDOSÍTÁS KEZDETE: Dinamikus Admin menüpont ---
  const dynamicNavLinks = useMemo(() => {
    const links = [...navLinks];
    if (role === 'admin') {
      links.push({ id: "admin", label: "Admin", path: "/admin", roles: ["admin"] });
    }
    return links;
  }, [navLinks, role]);
  // --- MÓDOSÍTÁS VÉGE ---

  return dynamicNavLinks;
};
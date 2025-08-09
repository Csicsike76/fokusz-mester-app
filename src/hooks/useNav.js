import { useMemo } from "react";
import { NAV_ITEMS } from "../data/navItems";
import { useAuth } from "../context/AuthContext";

export const useNav = () => {
  const { user } = useAuth();
  const role = user ? user.role : "guest";

  return useMemo(
    () => NAV_ITEMS.filter(item => item.roles.includes(role)),
    [role]
  );
};
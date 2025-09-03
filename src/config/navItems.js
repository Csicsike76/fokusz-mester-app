// src/config/navItems.js

export const NAV_ITEMS = [
  { 
    id: "math",
    label: "Matematika",
    path: "/tananyag/interaktiv-matematika-gyljtemany", 
    roles: ["student", "teacher", "admin"] 
  },
  { 
    id: "physics",
    label: "Fizika",
    path: "/tananyag/interaktiv-fizika-gyljtemany",
    roles: ["student", "teacher", "admin"] 
  },
  { 
    id: "ai",
    label: "Mesterséges Intelligencia",
    path: "/tananyag/interaktav-aimi1-gyljtemany",
    roles: ["student", "teacher", "admin"] 
  },
  { 
    id: "help",
    label: "Súgó",
    path: "/sugo",
    roles: ["guest", "student", "teacher", "admin"] 
  },
  { 
    id: "profile",
    label: "Profil",
    path: "/profil",
    roles: ["student", "teacher", "admin"]
  },
  { 
    id: "dashboard",
    label: "Irányítópult",
    path: "/dashboard/teacher",
    roles: ["teacher"]
  },
  {
    id: "admin",
    label: "Admin",
    path: "/admin",
    roles: ["admin"]
  }
];
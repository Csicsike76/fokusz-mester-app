export const NAV_ITEMS = [

 
  { 
    id: "help",
    label: "Súgó",
    path: "/sugo",
    roles: ["guest", "student", "teacher"] 
  },
  { 
    id: "profile",
    label: "Profil",
    path: "/profil",
    roles: ["student", "teacher"]
  },
  { 
    id: "dashboard",
    label: "Irányítópult",
    path: "/dashboard/teacher",
    roles: ["teacher"]
  },
  ,
  {
    id: "admin",
    label: "Admin",
    path: "/admin",
    roles: ["admin"]
  },
];
export const NAV_ITEMS = [
  { 
    id: "free-lessons", 
    label: "Ingyenes Leckék", 
    path: "/#ingyenes-leckek", 
    roles: ["guest", "student", "teacher"] 
  },
  { 
    id: "math",
    label: "Matematika",
    path: "/targy/matematika", 
    roles: ["guest", "student", "teacher"] 
  },
  { 
    id: "physics",
    label: "Fizika",
    path: "/targy/fizika",
    roles: ["guest", "student", "teacher"] 
  },
  { 
    id: "ai",
    label: "Mesterséges Intelligencia",
    path: "/targy/ai",
    roles: ["guest", "student", "teacher"] 
  },
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
];
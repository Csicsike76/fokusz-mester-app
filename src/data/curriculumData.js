export const curriculum = {
  matematika: {
    title: "Matematika",
    grades: {
      5: {
        title: "5. Osztály",
        topics: [
          { id: "termeszetes_szamok", title: "1. Természetes számok", quizId: "termeszetes_szamok_5" },
          { id: "oszthatosag", title: "2. Természetes számok oszthatósága", quizId: "oszthatosag_5" },
          // ...többi 5.-es téma
        ]
      },
      6: {
        title: "6. Osztály",
        topics: [
          { id: "racionalis_szamok", title: "1. Racionális számok", quizId: "racionalis_szamok_6" },
          // ...többi 6.-os téma
        ]
      }
    }
  },
  fizika: {
    title: "Fizika",
    grades: {
      7: {
        title: "7. Osztály",
        topics: [
          { id: "mechanika_alapjai", title: "1. A mechanika alapjai", quizId: "mechanika_7" },
          // ...többi 7.-es téma
        ]
      }
    }
  },
  // ...többi tantárgy
};
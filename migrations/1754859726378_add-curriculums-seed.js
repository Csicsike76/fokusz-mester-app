// 2025XXXXXXXX_add_curriculums_seed.js (példa fájlnév)
exports.up = function(knex) {
    return knex('curriculums').insert([
        // Ingyenes leckék (Free Lesson Curriculums)
        { title: 'Törtek és Tizedestörtek', slug: 'kviz_muveletek_tortekkel', subject: 'Matematika', grade: '5. Osztály', category: 'free_lesson', is_published: true },
        { title: 'Százalékszámítás', slug: 'kviz_aranyok', subject: 'Matematika', grade: '6. Osztály', category: 'free_lesson', is_published: true },
        { title: 'Természetes számok négyzetének négyzetgyöke', slug: 'kviz_termeszetes_negyzetgyok', subject: 'Matematika', grade: '7. Osztály', category: 'free_lesson', is_published: true },
        { title: 'Halmazok meghatározása elemeik közös tulajdonságával', slug: 'kviz_halmazok_meghataroza', subject: 'Matematika', grade: '8. Osztály', category: 'free_lesson', is_published: true },
        { title: 'Halmazállapot-változások', slug: 'kviz_halmazallapot_valtozasok', subject: 'Fizika', grade: '6. Osztály', category: 'free_lesson', is_published: true },
        { title: 'A fizikában használt matematikai eljárások és modellek', slug: 'kviz_fizikai_mennyisegek_es_jelensegek', subject: 'Fizika', grade: '7. Osztály', category: 'free_lesson', is_published: true },
        { title: 'Elektromosság alapjai', slug: 'kviz_elektromossag_alapjai', subject: 'Fizika', grade: '8. Osztály', category: 'free_lesson', is_published: true },
        { title: 'Képalkotás MI-vel', slug: 'muhely_kepalkotas', subject: 'Mesterséges Intelligencia', grade: null, category: 'free_lesson', is_published: true },
        { title: 'Játéktervezés 101', slug: 'muhely_jatektervezes', subject: 'Mesterséges Intelligencia', grade: null, category: 'free_lesson', is_published: true },
        { title: 'A Promptolás Alapjai', slug: 'muhely_prompt-alapok', subject: 'Mesterséges Intelligencia', grade: null, category: 'free_lesson', is_published: true },
        // Ingyenes interaktív eszközök (Free Tools)
        { title: 'Időutazó Csevegő 🕰️', slug: 'idoutazo_csevego', subject: null, grade: null, category: 'free_tool', is_published: true },
        { title: 'Jövőkutató Szimulátor 🚀', slug: 'jovokutato_szimulator', subject: null, grade: null, category: 'free_tool', is_published: true },
        { title: 'Személyes Célkitűző 🎯', slug: 'celkituzo', subject: null, grade: null, category: 'free_tool', is_published: true },
        { title: 'Tudás Iránytű 🧭', slug: 'iranytu', subject: null, grade: null, category: 'free_tool', is_published: true },
        // Teljes kurzusok (Prémium) (Premium Courses)
        { title: 'Teljes Matematika Kurzus', slug: 'interaktav-matematika-gyljtemany', subject: 'Matematika', grade: null, category: 'premium_course', is_published: true },
        { title: 'Teljes Fizika Kurzus', slug: 'interaktav-fizika-gyljtemany', subject: 'Fizika', grade: null, category: 'premium_course', is_published: true },
        { title: 'Teljes Interaktív Mesterséges Intelligencia', slug: 'interaktav-aimi1-gyljtemany', subject: 'Mesterséges Intelligencia', grade: null, category: 'premium_course', is_published: true },
        // Exkluzív prémium eszközök (Premium Tools)
        { title: 'Interaktív Képlet- és Tételtár 📚', slug: 'kepletgyujtemeny', subject: null, grade: null, category: 'premium_tool', is_published: true },
        { title: 'A Napi Kihívás 🧠', slug: 'napi_kihivas', subject: null, grade: null, category: 'premium_tool', is_published: true },
        { title: 'CSICSIKE Tutor 💡', slug: 'tutor', subject: null, grade: null, category: 'premium_tool', is_published: true },
        { title: 'Házifeladat Hős 🦸', slug: 'hazi_hos', subject: null, grade: null, category: 'premium_tool', is_published: true },
        { title: 'AI Vita Aréna 🏛️', slug: 'vita_arena', subject: null, grade: null, category: 'premium_tool', is_published: true },
        { title: 'AI Vizsga Szimulátor 📝', slug: 'vizsga_szimulator', subject: null, grade: null, category: 'premium_tool', is_published: true },
        { title: 'Absztrakt->Konkrét Fordító 🔬', slug: 'konkretizalo', subject: null, grade: null, category: 'premium_tool', is_published: true },
        { title: 'Esszé Vázlatoló ✍️', slug: 'essze_vazlatolo', subject: null, grade: null, category: 'premium_tool', is_published: true }
    ]);
};

exports.down = function(knex) {
    return knex('curriculums').whereIn('slug', [
        // Ingyenes leckék
        'kviz_muveletek_tortekkel',
        'kviz_aranyok',
        'kviz_termeszetes_negyzetgyok',
        'kviz_halmazok_meghataroza',
        'kviz_halmazallapot_valtozasok',
        'kviz_fizikai_mennyisegek_es_jelensegek',
        'kviz_elektromossag_alapjai',
        'muhely_kepalkotas',
        'muhely_jatektervezes',
        'muhely_prompt-alapok',
        // Ingyenes eszközök
        'idoutazo_csevego',
        'jovokutato_szimulator',
        'celkituzo',
        'iranytu',
        // Prémium kurzusok
        'interaktav-matematika-gyljtemany',
        'interaktav-fizika-gyljtemany',
        'interaktav-aimi1-gyljtemany',
        // Prémium eszközök
        'kepletgyujtemeny',
        'napi_kihivas',
        'tutor',
        'hazi_hos',
        'vita_arena',
        'vizsga_szimulator',
        'konkretizalo',
        'essze_vazlatolo'
    ]).del();
};

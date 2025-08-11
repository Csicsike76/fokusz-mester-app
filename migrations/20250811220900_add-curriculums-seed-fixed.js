exports.up = (pgm) => {
  pgm.sql(`
    WITH data (title, slug, subject, grade, category, description, is_published) AS (
      VALUES
      ('Törtek és Tizedestörtek','kviz-muveletek-tortekkel','matematika',5,'free_lesson',NULL,true),
      ('Százalékszámítás','kviz-aranyok','matematika',6,'free_lesson',NULL,true),
      ('Természetes számok négyzetének négyzetgyöke','kviz-termeszetes-negyzetgyok','matematika',7,'free_lesson',NULL,true),
      ('Halmazok meghatározása elemeik közös tulajdonságával','kviz-halmazok-meghataroza','matematika',8,'free_lesson',NULL,true),
      ('Halmazállapot-változások','kviz-halmazallapot-valtozasok','fizika',6,'free_lesson',NULL,true),
      ('A fizikában használt matematikai eljárások és modellek','kviz-fizikai-mennyisegek-es-jelensegek','fizika',7,'free_lesson',NULL,true),
      ('Elektromosság alapjai','kviz-elektromossag-alapjai','fizika',8,'free_lesson',NULL,true),

      ('Képalkotás MI-vel','muhely-kepalkotas','ai',NULL,'free_lesson',NULL,true),
      ('Játéktervezés 101','muhely-jatektervezes','ai',NULL,'free_lesson',NULL,true),
      ('A Promptolás Alapjai','muhely-prompt-alapok','ai',NULL,'free_lesson',NULL,true),

      ('Időutazó Csevegő 🕰️','idoutazo-csevego','eszkozok',NULL,'free_tool','Beszélgess a tudomány legnagyobb elméivel!',true),
      ('Jövőkutató Szimulátor 🚀','jovokutato-szimulator','eszkozok',NULL,'free_tool',NULL,true),
      ('Személyes Célkitűző 🎯','celkituzo','eszkozok',NULL,'free_tool',NULL,true),
      ('Tudás Iránytű 🧭','iranytu','eszkozok',NULL,'free_tool',NULL,true),

      ('Teljes Matematika Kurzus','interaktav-matematika-gyljtemany','matematika',NULL,'premium_course',NULL,true),
      ('Teljes Fizika Kurzus','interaktav-fizika-gyljtemany','fizika',NULL,'premium_course',NULL,true),
      ('Teljes Interaktív Mesterséges Intelligencia','interaktav-aimi1-gyljtemany','ai',NULL,'premium_course',NULL,true),

      ('Interaktív Képlet- és Tételtár 📚','kepletgyujtemeny',NULL,NULL,'premium_tool',NULL,true),
      ('A Napi Kihívás 🧠','napi-kihivas',NULL,NULL,'premium_tool',NULL,true),
      ('CSICSIKE Tutor 💡','tutor',NULL,NULL,'premium_tool',NULL,true),
      ('Házifeladat Hős 🦸','hazi-hos',NULL,NULL,'premium_tool',NULL,true),
      ('AI Vita Aréna 🏛️','vita-arena',NULL,NULL,'premium_tool',NULL,true),
      ('AI Vizsga Szimulátor 📝','vizsga-szimulator',NULL,NULL,'premium_tool',NULL,true),
      ('Absztrakt->Konkrét Fordító 🔬','konkretizalo',NULL,NULL,'premium_tool',NULL,true),
      ('Esszé Vázlatoló ✍️','essze-vazlatolo',NULL,NULL,'premium_tool',NULL,true)
    )
    INSERT INTO curriculums (title, slug, subject, grade, category, description, is_published)
    SELECT d.title, d.slug, d.subject, d.grade, d.category, d.description, d.is_published
    FROM data d
    LEFT JOIN curriculums c ON c.slug = d.slug
    WHERE c.id IS NULL;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DELETE FROM curriculums
    WHERE slug IN (
      'kviz-muveletek-tortekkel',
      'kviz-aranyok',
      'kviz-termeszetes-negyzetgyok',
      'kviz-halmazok-meghataroza',
      'kviz-halmazallapot-valtozasok',
      'kviz-fizikai-mennyisegek-es-jelensegek',
      'kviz-elektromossag-alapjai',
      'muhely-kepalkotas',
      'muhely-jatektervezes',
      'muhely-prompt-alapok',
      'idoutazo-csevego',
      'jovokutato-szimulator',
      'celkituzo',
      'iranytu',
      'interaktav-matematika-gyljtemany',
      'interaktav-fizika-gyljtemany',
      'interaktav-aimi1-gyljtemany',
      'kepletgyujtemeny',
      'napi-kihivas',
      'tutor',
      'hazi-hos',
      'vita-arena',
      'vizsga-szimulator',
      'konkretizalo',
      'essze-vazlatolo'
    );
  `);
};

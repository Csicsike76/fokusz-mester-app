// src/components/Layout/Layout.js

import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../Navbar/Navbar';
import BackgroundVideo from '../BackgroundVideo/BackgroundVideo';
import UiControls from '../UiControls/UiControls';
import { Helmet } from 'react-helmet-async'; // HOZZÁADVA: Helmet importálása

const Layout = () => {
  // Schema.org jelölések
  const schemaMarkup = [
    {
      "@context": "https://schema.org",
      "@type": "EducationalOrganization",
      "name": "Fókusz Mester",
      "url": "https://fokuszmester.com/",
      "logo": "https://fokuszmester.com/assets/fokuszmester-logo.png", // Cseréld a valós logó URL-re
      "description": "A Fókusz Mester egy interaktív online oktatási platform, amely matematika, fizika és mesterséges intelligencia tananyagokat, kvízeket, villámkártyákat és egyéb tanulást segítő eszközöket biztosít diákok, tanárok és osztályok számára, 5-8. osztályosoknak.",
      "sameAs": [
        "https://www.facebook.com/profile.php?id=61581465947170&locale=hu_HU",
        "https://www.facebook.com/profile.php?id=61581860337127"
      ],
      "hasCourse": [ // Általános kurzus típusok a főoldalra
        {
          "@type": "Course",
          "name": "5. Osztályos Matematika",
          "description": "Interaktív tananyagok és kvízek az 5. osztályos matematika témaköreihez."
        },
        {
          "@type": "Course",
          "name": "6. Osztályos Matematika",
          "description": "Interaktív tananyagok és kvízek a 6. osztályos matematika témaköreihez."
        },
        {
          "@type": "Course",
          "name": "7. Osztályos Matematika",
          "description": "Interaktív tananyagok és kvízek a 7. osztályos matematika témaköreihez."
        },
        {
          "@type": "Course",
          "name": "8. Osztályos Matematika",
          "description": "Interaktív tananyagok és kvízek a 8. osztályos matematika témaköreihez."
        },
        {
          "@type": "Course",
          "name": "Fizika Alapismeretek (6-8. osztály)",
          "description": "Átfogó fizika tananyag és gyakorló feladatok a 6-8. osztályosok számára."
        },
        {
          "@type": "Course",
          "name": "Mesterséges Intelligencia Alapjai",
          "description": "Bevezetés a mesterséges intelligencia világába diákok és tanárok számára."
        }
      ],
      "offers": [
        {
          "@type": "Offer",
          "name": "Ingyenes Leckék és Eszközök",
          "description": "Válogatott tananyagok és segédanyagok ingyenesen elérhetők a platformon."
        },
        {
          "@type": "Offer",
          "name": "Prémium Tartalmak és Funkciók",
          "description": "Előfizetéses hozzáférés exkluzív tananyagokhoz, kvízekhez és speciális eszközökhöz.",
          "category": "Premium Content"
        },
        {
          "@type": "Offer",
          "name": "Osztályregisztráció és Kedvezményes Csomagok",
          "description": "Kedvezményes hozzáférés osztályok és iskolák számára."
        }
      ],
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": "+40751955532", // Cseréld a valós telefonszámra
        "contactType": "customer service",
        "areaServed": "HU" // Magyarországra vonatkozóan
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "Fókusz Mester",
      "url": "https://fokuszmester.com/",
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": "https://fokuszmester.com/kereses?q={search_term_string}" // Feltételezve, hogy a kereső URL-je ilyen formátumú
        },
        "query-input": "required name=search_term_string"
      },
      "about": "Interaktív online oktatási platform matematika, fizika és mesterséges intelligencia tananyagokkal."
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Súgó és Segítség",
      "url": "https://fokuszmester.com/sugo",
      "description": "Segítség és gyakran ismételt kérdések a Fókusz Mester platform használatához."
    }
  ];

  return (
    <>
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(schemaMarkup)}
        </script>
        {/* BEILLESZTVE: Google Search Console ellenőrző meta tag */}
        <meta name="google-site-verification" content="MgQyuB2pXA1" />
      </Helmet>
      
      <BackgroundVideo /> 
      <Navbar />
      <UiControls /> 
      <main>
        <Outlet />
      </main>
      {/* Ide jöhet a Footer komponens, ha van */}
    </>
  );
};

export default Layout;
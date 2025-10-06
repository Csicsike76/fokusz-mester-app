// src/components/Layout/Layout.js

import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../Navbar/Navbar';
import BackgroundVideo from '../BackgroundVideo/BackgroundVideo';
import UiControls from '../UiControls/UiControls';
import { Helmet } from 'react-helmet-async';

const Layout = () => {
  // Schema.org jelölések
  const schemaMarkup = [
    {
      "@context": "https://schema.org",
      "@type": "EducationalOrganization",
      "name": "Fókusz Mester",
      "url": "https://fokuszmester.com/",
      "logo": "https://fokuszmester.com/assets/fokuszmester-logo.png",
      "description": "A Fókusz Mester egy interaktív online oktatási platform, amely matematika, fizika és mesterséges intelligencia tananyagokat, kvízeket, villámkártyákat és egyéb tanulást segítő eszközöket biztosít diákok, tanárok és osztályok számára, 5-8. osztályosoknak.",
      "sameAs": [
        "https://www.facebook.com/profile.php?id=61581465947170&locale=hu_HU",
        "https://www.facebook.com/profile.php?id=61581860337127"
      ],
      "hasCourse": [
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
        "telephone": "+40751955532",
        "contactType": "customer service",
        "areaServed": "HU"
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
          "urlTemplate": "https://fokuszmester.com/kereses?q={search_term_string}"
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
    },
    { // Schema.org VideoObject jelölés a háttérvideóhoz
      "@context": "https://schema.org",
      "@type": "VideoObject",
      "name": "Fókusz Mester Bemutató Háttérvideó",
      "description": "A Fókusz Mester online oktatási platform bemutató háttérvideója. Budapesti látképpel és motiváló hangulattal. Jól illeszkedik a tanulási környezethez.",
      "uploadDate": "2025-10-06T12:00:00+01:00",
      "duration": "PT8S",
      "contentUrl": "https://fokuszmester.com/assets/video.mp4",
      "thumbnailUrl": "https://fokuszmester.com/assets/video-thumbnail.jpg",
      "embedUrl": "https://fokuszmester.com/",
      "publisher": {
        "@type": "EducationalOrganization",
        "name": "Fókusz Mester",
        "url": "https://fokuszmester.com/"
      }
    }
  ];

  // Az Organization séma adatai, amiből az Open Graph és Twitter Card tag-ek generálódnak
  const orgData = schemaMarkup.find(item => item['@type'] === 'EducationalOrganization');
  const pageTitle = "Fókusz Mester - Online Oktatási Platform"; // Általános oldalcím
  const pageDescription = "Interaktív online oktatási platform matematika, fizika és mesterséges intelligencia tananyagokkal, kvízekkel és egyéb tanulást segítő eszközökkel diákok, tanárok és osztályok számára."; // Általános oldal leírás

  return (
    <>
      <Helmet>
        {/* Schema.org JSON-LD */}
        <script type="application/ld+json">
          {JSON.stringify(schemaMarkup)}
        </script>
        {/* Google Search Console ellenőrző meta tag */}
        <meta name="google-site-verification" content="MgQyuB2pXA1CQwbWub64aWOHvCXujTduUv0XyNb73gc" />

        {/* Open Graph Meta Tag-ek */}
        <meta property="og:title" content={orgData?.name || pageTitle} />
        <meta property="og:description" content={orgData?.description || pageDescription} />
        <meta property="og:image" content={orgData?.logo || 'https://fokuszmester.com/assets/default-share-image.jpg'} /> {/* Kérem, készítsen egy default képet! */}
        <meta property="og:url" content={orgData?.url || 'https://fokuszmester.com/'} />
        <meta property="og:type" content="website" /> {/* Ha egy specifikus oldalról van szó, lehet "article" */}
        <meta property="og:site_name" content="Fókusz Mester" />

        {/* Twitter Card Meta Tag-ek */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={orgData?.name || pageTitle} />
        <meta name="twitter:description" content={orgData?.description || pageDescription} />
        <meta name="twitter:image" content={orgData?.logo || 'https://fokuszmester.com/assets/default-share-image.jpg'} />
        {/* Ha van Twitter fiók, hozzáadható: <meta name="twitter:site" content="@FokuszMester" /> */}
      </Helmet>
      
      <BackgroundVideo /> 
      <Navbar />
      <UiControls /> 
      <main>
        <Outlet />
      </main>
    </>
  );
};

export default Layout;
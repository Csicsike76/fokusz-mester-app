// Szükséges csomagok betöltése
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Az Express alkalmazás létrehozása
const app = express();

// Middleware-ek használata
app.use(cors()); // Engedélyezi a frontendről érkező kéréseket
app.use(express.json()); // Lehetővé teszi a JSON formátumú kérések feldolgozását

// --- API VÉGPONTOK ---

// Egy egyszerű "gyökér" végpont, ami jelzi, hogy a szerver fut
app.get('/api', (req, res) => {
  res.json({ message: "Szia! Ez a Fókusz Mester API válasza." });
});

// A port meghatározása, amin a szerver futni fog
// A Render a PORT környezeti változót fogja használni, helyben a 3001-et
const PORT = process.env.PORT || 3001;

// A szerver elindítása
app.listen(PORT, () => {
  console.log(`✅ A szerver elindult a ${PORT} porton.`);
});
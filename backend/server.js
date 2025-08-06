const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Később itt lesz az adatbázis kapcsolat
// const { Pool } = require('pg');
// const pool = new Pool({ ... });

const app = express();

app.use(cors());
app.use(express.json());

// --- API VÉGPONTOK ---

app.get('/api', (req, res) => {
  res.json({ message: "Szia! Ez a Fókusz Mester API válasza." });
});

// ÚJ VÉGPONT A REGISZTRÁCIÓ FOGADÁSÁRA
app.post('/api/register', (req, res) => {
  // A frontend által küldött adatok a req.body objektumban érkeznek
  const userData = req.body;

  console.log('Új regisztrációs kérés érkezett:', userData);

  // TODO: Itt jön majd a backend logika:
  // 1. Validálás (pl. jelszó erőssége)
  // 2. Ellenőrzés, hogy az email/felhasználónév foglalt-e (adatbázis lekérdezés)
  // 3. Jelszó hashelése
  // 4. Felhasználó mentése az adatbázisba
  // 5. Visszaigazoló email küldése

  // Egyelőre csak egy sikeres választ küldünk vissza a frontendnek
  res.status(201).json({ 
    success: true, 
    message: `Sikeres regisztráció a(z) ${userData.email} címmel! (Adatok még nincsenek mentve)` 
  });
});


const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`✅ A szerver elindult a ${PORT} porton.`);
});
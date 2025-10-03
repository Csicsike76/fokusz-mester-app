// apiService.js
// NEM KÉNE SEMMILYEN API_URL, HA AZ process.env.REACT_APP_API_URL-T HASZNÁLJUK, DE HAGYJUK MEG PÓTLÓLAG
export const API_URL = process.env.REACT_APP_API_URL || 'https://fokusz-mester-backend.onrender.com';
// export const API_URL = process.env.REACT_APP_API_URL; // Ha biztosak vagyunk benne, hogy a környezeti változó mindig be van állítva

const apiService = {
    // Auth
    login: (email, password) => {
        return fetch(`${API_URL}/api/login`, { // <<-- AZ /api ÚTVONAL RÁÉPÜL AZ API_URL-RE!
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        }).then(handleResponse);
    },
    // Curriculums
    getAllCurriculums: () => {
        return fetch(`${API_URL}/api/curriculums`).then(handleResponse); // <<-- AZ /api ÚTVONAL RÁÉPÜL AZ API_URL-RE!
    },
    // ... a többi API hívás (getQuiz, getTool, etc.)
};

async function handleResponse(response) {
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'Hiba történt a szerverrel való kommunikáció során.');
    }
    return data;
}

export default apiService;
const API_URL = 'http://localhost:3001'; // Vagy a Render URL-je

const apiService = {
    // Auth
    login: (email, password) => {
        return fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        }).then(handleResponse);
    },
    // ... ide jöhet a register, logout stb.

    // Curriculums
    getAllCurriculums: () => {
        return fetch(`${API_URL}/api/curriculums`).then(handleResponse);
    },

    // ... ide jön az összes többi API hívás (getQuiz, getTool, etc.)
};

async function handleResponse(response) {
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'Hiba történt a szerverrel való kommunikáció során.');
    }
    return data;
}

export default apiService;
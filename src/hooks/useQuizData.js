import { useState, useEffect, useCallback } from 'react';
const API_URL = 'https://fokusz-mester-backend.onrender.com';

const useQuizData = (slug) => {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchData = useCallback(async () => {
        if (!slug) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/quiz/${slug}`);
            const result = await response.json();
            if (!result.success) throw new Error(result.message);
            setData(result.quiz);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [slug]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { data, isLoading, error };
};

export default useQuizData;
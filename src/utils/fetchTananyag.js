export const fetchTananyag = async (filename) => {
  try {
    const response = await fetch(`/data/tananyag/${filename}`);
    if (!response.ok) {
      throw new Error('Nem sikerült betölteni a tananyagot');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(error);
    return null;
  }
};

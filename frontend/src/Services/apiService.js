import axios from 'axios';

const apiUrl = 'http://localhost:8091/some-endpoint';

const getAuthToken = () => localStorage.getItem('authToken');

export const getData = async () => {
    try {
        const token = getAuthToken();
        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
};

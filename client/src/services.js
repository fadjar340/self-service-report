export const isAdmin = async (username) => {
    try {
        const response = await fetch(`/api/admin/check/${username}`);
        const data = await response.json();
        return data.isAdmin; // Assuming the API returns { isAdmin: true/false }
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false; // Default to false on error
    }
};

const validateQuery = (queryText) => {
    const upperQuery = queryText.trim().toUpperCase();

    if (!upperQuery.startsWith('SELECT') && !upperQuery.startsWith('WITH')) {
        throw new Error('Query must start with SELECT or WITH');
    }

    const dangerousKeywords = [
        'DELETE',
        'DROP',
        'UPDATE',
        'INSERT',
        'ALTER',
        'CREATE',
        'TRUNCATE',
        'EXEC',
        'EXECUTE'
    ];

    for (const keyword of dangerousKeywords) {
        if (upperQuery.includes(keyword)) {
            throw new Error(`Query contains forbidden keyword: ${keyword}`);
        }
    }

    return true;
};

module.exports = { validateQuery };
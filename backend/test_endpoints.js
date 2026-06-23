const testEndpoints = async () => {
    const API_URL = 'http://localhost:5005/api';
    
    try {
        console.log('\nTesting /api/rooms...');
        const roomsRes = await fetch(`${API_URL}/rooms`);
        const roomsData = await roomsRes.json();
        console.log('Rooms Status:', roomsRes.status);
        console.log('Rooms Data:', JSON.stringify(roomsData, null, 2));

    } catch (error) {
        console.error('Error:', error.message);
    }
};

testEndpoints();

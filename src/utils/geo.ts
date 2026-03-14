export const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
        );
        const data = await response.json();
        return data.display_name || "Unknown Location";
    } catch (error) {
        console.error("Reverse geocoding failed:", error);
        throw error;
    }
};

/**
 * Helper to remove undefined values for Firestore compatibility
 * Firestore does not support undefined values in objects or arrays.
 */
export const cleanObject = (obj: any): any => {
    // Handle arrays
    if (Array.isArray(obj)) {
        return obj.map(item => cleanObject(item));
    }
    
    // Handle objects
    if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
        return Object.fromEntries(
            Object.entries(obj)
                .filter(([_, v]) => v !== undefined)
                .map(([k, v]) => [k, cleanObject(v)])
        );
    }
    
    // Primitive values or Date
    return obj;
};

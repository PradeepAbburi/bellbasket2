export const generateSlug = (name: string, area: string) => {
    const combined = `${name} ${area}`;
    return combined
        .toLowerCase()
        .replace(/[^\w ]+/g, '')
        .replace(/ +/g, '-');
};

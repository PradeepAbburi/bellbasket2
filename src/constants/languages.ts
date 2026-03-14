export const INDIAN_LANGUAGES = [
    'Hindi', 'Bengali', 'Marathi', 'Telugu', 'Tamil', 'Gujarati', 'Urdu',
    'Kannada', 'Odia', 'Malayalam', 'Punjabi', 'Assamese', 'Sanskrit',
    'Maithili', 'Santali', 'Kashmiri', 'Nepali', 'Konkani', 'Sindhi',
    'Dogri', 'Manipuri', 'Bodo'
].sort();

export const INTERNATIONAL_LANGUAGES = [
    'English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese',
    'Korean', 'Arabic', 'Russian', 'Portuguese', 'Italian'
].sort();

export const ALL_LANGUAGES = [...new Set(['English', ...INDIAN_LANGUAGES, ...INTERNATIONAL_LANGUAGES])];

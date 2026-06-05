import * as Lucide from 'lucide-react';
const keys = Object.keys(Lucide);
const matches = keys.filter(k => k.toLowerCase().match(/(broom|brush|sweep|clear|trash|delete|eraser|wash)/));
console.log('Matching icons:', matches);

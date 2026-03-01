const fs = require('fs');
let text = fs.readFileSync('app/translations.js', 'utf8');

// 1. Remove the productMessage keys
text = text.replace(/productMessageTitle:.*?,\n/g, '');
text = text.replace(/productMessageLabel:.*?,\n/g, '');
text = text.replace(/productMessageHelp:.*?,\n/g, '');

// 2. Remove "Messaggio smart prodotto" / "Smart product message" etc from proFeatures array
const featuresToRemove = [
    '\"Messaggio smart prodotto\", ',
    '\"Smart product message\", ',
    '\"Mensaje inteligente de producto\", ',
    '\"Smart-Produktnachricht\", ',
    '\"Message intelligent de produit\", ',
    '\"Mensagem inteligente de produto\", '
];

featuresToRemove.forEach(f => {
    text = text.replace(f, '');
});

fs.writeFileSync('app/translations.js', text, 'utf8');
console.log('Translations cleaned successfully.');

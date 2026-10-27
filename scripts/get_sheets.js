const https = require('https');

https.get('https://docs.google.com/spreadsheets/d/1vg9nwhkFxwN4qVzjkfmXTrIVoHVYxeMH3-PXjqzeWao/edit?usp=sharing', (res) => {
  let html = '';
  res.on('data', chunk => html += chunk);
  res.on('end', () => {
    const regex = /"name":"([^"]+)"[^{}]*?"sheetId":(\d+)/g;
    let match;
    console.log('--- PESTAÑAS ENCONTRADAS ---');
    while ((match = regex.exec(html)) !== null) {
      console.log(`Nombre: "${match[1]}" -> GID: ${match[2]}`);
    }
  });
});

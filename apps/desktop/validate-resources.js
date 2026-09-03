const fs = require('fs');
const path = require('path');

const whisperBinary = process.platform === 'win32' ? 'whisper-server.exe' : 'whisper-server';
const requiredResources = [
    path.join('resources', '.next', 'standalone', 'server.js'),
    path.join('resources', 'whisper-server', whisperBinary),
];
const missingResources = requiredResources.filter((resource) => !fs.existsSync(resource));

if (missingResources.length > 0) {
    console.error(`Recursos obrigatorios ausentes:\n${missingResources.join('\n')}`);
    process.exit(1);
}

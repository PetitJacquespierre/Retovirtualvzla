import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');
const imgDir = path.join(projectRoot, 'img');

async function optimizeImages() {
    console.log('Iniciando optimización de imágenes...');
    
    if (!fs.existsSync(imgDir)) {
        console.error('El directorio img/ no existe.');
        return;
    }

    const files = fs.readdirSync(imgDir);
    let totalSaved = 0;

    for (const file of files) {
        const filePath = path.join(imgDir, file);
        const ext = path.extname(file).toLowerCase();
        
        if (['.png', '.jpg', '.jpeg'].includes(ext)) {
            const outputFileName = file.replace(new RegExp(`${ext}$`, 'i'), '.webp');
            const outputPath = path.join(imgDir, outputFileName);
            
            try {
                const info = await sharp(filePath)
                    .webp({ quality: 80, effort: 6 })
                    .toFile(outputPath);
                    
                const originalSize = fs.statSync(filePath).size;
                const newSize = info.size;
                const saved = originalSize - newSize;
                totalSaved += saved;
                
                console.log(`[OPTIMIZADO] ${file} -> ${outputFileName} (Reducción: ${(saved / 1024).toFixed(2)} KB)`);
                
                fs.unlinkSync(filePath);
            } catch (err) {
                console.error(`Error optimizando ${file}:`, err);
            }
        }
    }
    
    console.log(`Optimización completada. Ahorro total: ${(totalSaved / (1024 * 1024)).toFixed(2)} MB`);
}

optimizeImages();

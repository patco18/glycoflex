/**
 * Script de réinitialisation Firebase simplifié pour exécution en ligne de commande
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const appDataPath = path.join(__dirname, '.app-data');
const backupPath = path.join(__dirname, 'firebase_backup', 'app_data_backup_' + Date.now());

// Fichiers et dossiers à nettoyer
const cleanupTargets = [
  '.expo/web/cache',
  '.expo/web/development',
  '.expo/.env.local',
  'node_modules/.cache',
  '.app-data/firebase_auth',
  '.app-data/firebase_sync',
  '.app-data/encryption_keys',
];

// Crée une interface pour la lecture/écriture dans le terminal
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Fonction pour poser une question et obtenir une réponse
function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// Fonction pour créer un répertoire récursivement
function mkdirRecursive(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Fonction pour sauvegarder les fichiers avant de les supprimer
function backupFiles() {
  console.log('📦 Sauvegarde des données avant réinitialisation...');
  
  mkdirRecursive(backupPath);
  
  cleanupTargets.forEach(target => {
    const fullPath = path.join(__dirname, target);
    const backupTarget = path.join(backupPath, target);
    
    if (fs.existsSync(fullPath)) {
      // Créer le répertoire de destination
      mkdirRecursive(path.dirname(backupTarget));
      
      // Copier si c'est un fichier, sinon copier récursivement si c'est un dossier
      if (fs.statSync(fullPath).isDirectory()) {
        console.log(`Sauvegarde du dossier: ${target}`);
        copyDirRecursive(fullPath, backupTarget);
      } else {
        console.log(`Sauvegarde du fichier: ${target}`);
        fs.copyFileSync(fullPath, backupTarget);
      }
    }
  });
  
  console.log(`✅ Sauvegarde terminée dans: ${backupPath}`);
}

// Fonction pour copier un répertoire de façon récursive
function copyDirRecursive(src, dest) {
  mkdirRecursive(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Fonction pour nettoyer les fichiers et dossiers
function cleanupFiles() {
  console.log('🧹 Nettoyage des données Firebase locales...');
  
  cleanupTargets.forEach(target => {
    const fullPath = path.join(__dirname, target);
    
    if (fs.existsSync(fullPath)) {
      if (fs.statSync(fullPath).isDirectory()) {
        console.log(`Suppression du dossier: ${target}`);
        fs.rmSync(fullPath, { recursive: true, force: true });
      } else {
        console.log(`Suppression du fichier: ${target}`);
        fs.unlinkSync(fullPath);
      }
    }
  });
  
  // Créer des dossiers vides pour les remplacer
  cleanupTargets.forEach(target => {
    const fullPath = path.join(__dirname, target);
    if (target.endsWith('/')) {
      mkdirRecursive(fullPath);
    }
  });
  
  console.log('✅ Nettoyage terminé');
}

// Fonction principale
async function main() {
  console.log('🔥 Utilitaire de réinitialisation Firebase pour GlycoFlex 🔥');
  console.log('-----------------------------------------------------');
  console.log('⚠️  ATTENTION: Cette opération va effacer toutes les données');
  console.log('    Firebase locales et vous déconnecter de l\'application.');
  console.log('-----------------------------------------------------');
  
  const answer = await askQuestion('Êtes-vous sûr de vouloir continuer? (oui/non): ');
  
  if (answer.toLowerCase() !== 'oui') {
    console.log('❌ Opération annulée.');
    rl.close();
    return;
  }
  
  try {
    // Sauvegarder les données avant de les supprimer
    backupFiles();
    
    // Supprimer les données
    cleanupFiles();
    
    console.log('');
    console.log('🎉 Réinitialisation terminée avec succès!');
    console.log('📝 Une sauvegarde a été créée dans:', backupPath);
    console.log('🔄 Veuillez redémarrer l\'application pour appliquer les changements.');
  } catch (error) {
    console.error('❌ Erreur pendant la réinitialisation:', error);
  } finally {
    rl.close();
  }
}

// Exécuter la fonction principale
main();

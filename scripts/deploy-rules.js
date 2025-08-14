#!/usr/bin/env node

/**
 * Ce script permet de déployer les règles Firestore pour le projet glycoflex-new
 * sans avoir besoin de s'authentifier via le script précédent
 */

const fs = require('fs');
const { exec } = require('child_process');

// Vérifier si Firebase CLI est installé
console.log('🔍 Vérification de Firebase CLI...');

const checkFirebaseCLI = () => {
  return new Promise((resolve, reject) => {
    exec('firebase --version', (error) => {
      if (error) {
        reject('Firebase CLI n\'est pas installé. Installez-le avec: npm install -g firebase-tools');
      } else {
        resolve();
      }
    });
  });
};

// Vérifier que le fichier de règles existe
const checkRulesFile = () => {
  if (!fs.existsSync('./firestore.rules')) {
    throw new Error('Le fichier firestore.rules est introuvable dans le répertoire courant.');
  }
  console.log('✅ Fichier de règles trouvé');
};

// Déployer les règles
const deployRules = () => {
  return new Promise((resolve, reject) => {
    console.log('🚀 Déploiement des règles Firestore...');
    
    // Utiliser firebase deploy pour déployer uniquement les règles
    const deployCommand = 'firebase deploy --only firestore:rules --project glycoflex-new';
    
    exec(deployCommand, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Erreur lors du déploiement:', stderr);
        reject(error);
        return;
      }
      
      console.log(stdout);
      console.log('✅ Règles Firestore déployées avec succès!');
      resolve();
    });
  });
};

// Exécuter le processus principal
const main = async () => {
  try {
    console.log('🔥 Déploiement des règles Firestore pour glycoflex-new');
    
    await checkFirebaseCLI();
    checkRulesFile();
    
    // Se connecter à Firebase si nécessaire
    console.log('🔑 Vérification de l\'authentification Firebase...');
    exec('firebase login:list', async (error, stdout) => {
      const isLoggedIn = !stdout.includes('No authorized accounts found');
      
      if (!isLoggedIn) {
        console.log('⚠️ Vous n\'êtes pas connecté à Firebase. Authentification requise...');
        exec('firebase login', (loginError) => {
          if (loginError) {
            console.error('❌ Échec de l\'authentification:', loginError);
            return;
          }
          deployRules();
        });
      } else {
        console.log('✅ Déjà connecté à Firebase');
        await deployRules();
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
};

// Exécuter le script
main();

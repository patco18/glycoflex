# GlycoFlex - Application de Suivi de Glucose

GlycoFlex est une application mobile développée avec React Native et Expo, conçue pour aider les utilisateurs à surveiller et gérer leurs niveaux de glucose sanguin de manière efficace et intuitive.

## 📱 Fonctionnalités

- **Suivi des Mesures de Glucose** : Enregistrez facilement vos mesures de glucose avec date et heure
- **Visualisation des Données** : Graphiques interactifs pour visualiser vos tendances de glucose
- **Analyses Statistiques** : Consultez des statistiques détaillées sur vos niveaux de glucose
- **Analyses Prédictives** : Anticipez les tendances de votre glycémie
- **Export PDF** : Générez des rapports PDF à partager avec votre médecin
- **Multilingue** : Disponible en français et en anglais
- **Optimisations Android** : Performances améliorées sur les appareils Android
- **Interface Utilisateur Intuitive** : Navigation facile avec une interface moderne

## 🛠️ Technologies Utilisées

- **React Native** : Framework pour le développement d'applications mobiles cross-platform
- **Expo** : Plateforme pour simplifier le développement React Native
- **Expo Router v5** : Navigation entre les écrans de l'application
- **TypeScript** : Pour un code typé et plus robuste
- **Firebase** : Pour l'authentification et le stockage des données
- **i18n** : Pour l'internationalisation (multilingue)
- **Expo Linear Gradient** : Pour les effets visuels avancés
- **React Native Charts** : Pour les visualisations graphiques

## 🚀 Installation

1. Clonez le dépôt :
   ```bash
   git clone https://github.com/patco18/glycoflex.git
   cd glycoflex
   ```

2. Installez les dépendances :
   ```bash
   npm install
   ```

3. Lancez l'application :
   ```bash
   npx expo start
   ```

## 📱 Utilisation

1. **Écran d'accueil** : Visualisez vos dernières mesures et statistiques
2. **Ajouter une mesure** : Utilisez l'onglet "Ajouter" pour enregistrer une nouvelle mesure de glucose
3. **Historique** : Consultez l'historique complet de vos mesures
4. **Paramètres** : Personnalisez l'application selon vos préférences

## 🔧 Configuration

L'application utilise Firebase pour le stockage et l'authentification. Pour configurer Firebase :

1. Créez un projet Firebase sur la [console Firebase](https://console.firebase.google.com/)
2. Ajoutez une application Android/iOS à votre projet Firebase
3. Téléchargez le fichier de configuration et placez-le dans le dossier approprié
4. Assurez-vous que les services d'authentification et de base de données en temps réel sont activés

### Environment setup

Copiez le fichier `.env.example` vers `.env` et remplissez les valeurs obtenues depuis la console Firebase :

```bash
cp .env.example .env
```

Ces variables d'environnement sont lues dans `config/app.ts` pour initialiser Firebase.

## 📊 Structure du Projet

```
app/                 # Écrans principaux de l'application avec Expo Router
  (tabs)/            # Organisation des onglets de l'application
components/          # Composants réutilisables
contexts/            # Contextes React pour l'état global
hooks/               # Hooks personnalisés
locales/             # Fichiers de traduction
services/            # Services (Firebase, etc.)
types/               # Définitions de types TypeScript
utils/               # Fonctions utilitaires
```

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou à soumettre une pull request.

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus d'informations.

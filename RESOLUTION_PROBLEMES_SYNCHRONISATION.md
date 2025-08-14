# Guide de résolution des problèmes de synchronisation avec Firebase

Ce document vous guide à travers les étapes nécessaires pour résoudre les problèmes de synchronisation avec Firebase dans l'application GlycoFlex. Les problèmes de synchronisation peuvent se manifester par des erreurs lors de la sauvegarde ou la récupération de données, ou par des documents corrompus.

## Symptômes courants des problèmes de synchronisation

- Messages d'erreur "Document ignoré (corrompu)"
- Données qui ne s'affichent pas correctement
- Erreurs de déchiffrement
- Synchronisation qui semble bloquée
- Données qui ne s'affichent pas sur un autre appareil malgré la synchronisation activée

## Étapes de résolution des problèmes

### 1. Vérifier l'état du chiffrement

Le chiffrement est au cœur du système de synchronisation. Si les clés de chiffrement ne fonctionnent pas correctement, la synchronisation échouera.

**Pour vérifier et corriger les problèmes de chiffrement :**

1. Accédez à **Paramètres** → **Gestion du chiffrement**
2. Vérifiez l'état de la clé de chiffrement (si elle est présente et valide)
3. Si la validation indique une erreur, cliquez sur "Tester le chiffrement"
4. Si le test échoue, cliquez sur "Réinitialiser la clé de chiffrement"

> **Note :** La réinitialisation de la clé conserve les anciennes clés comme clés de secours, mais peut empêcher le déchiffrement des documents très anciens.

### 2. Réparer la base de données

Si vous avez des documents corrompus dans la base de données, ils peuvent bloquer la synchronisation correcte.

**Pour nettoyer les documents corrompus :**

1. Accédez à **Paramètres** → **Réparation Firebase**
2. Cliquez sur "Analyser la base de données"
3. Si des documents corrompus sont détectés, cliquez sur "Réparer les problèmes"

> **Note :** Cette action supprimera les documents corrompus, mais vos données valides seront préservées.

### 3. Réinitialiser l'état de synchronisation

Si les problèmes persistent, vous pouvez réinitialiser complètement l'état de synchronisation.

**Pour réinitialiser la synchronisation :**

1. Accédez à **Paramètres** → **Réparation Firebase**
2. Après avoir effectué une analyse, cliquez sur "Réinitialiser complètement"
3. Attendez que le processus se termine
4. Redémarrez l'application

### 4. Solution complète en cas de problèmes persistants

Si aucune des solutions précédentes ne fonctionne, vous pouvez utiliser cette procédure complète :

1. **Sauvegardez vos données** (si possible) :
   - Accédez à l'écran d'accueil et exportez vos mesures en PDF ou CSV
   - Notez vos paramètres importants

2. **Réinitialisez complètement** :
   - Accédez à **Paramètres** → **Gestion du chiffrement**
   - Réinitialisez la clé de chiffrement
   - Accédez à **Paramètres** → **Réparation Firebase**
   - Effectuez une réparation complète de la base de données
   
3. **Réactivez la synchronisation** :
   - Accédez à **Paramètres** → **Synchronisation Cloud**
   - Désactivez puis réactivez la synchronisation
   
4. **Redémarrez l'application**

## Prévention des problèmes futurs

Pour éviter de rencontrer à nouveau des problèmes de synchronisation :

1. Ne fermez pas l'application pendant une synchronisation en cours
2. Assurez-vous d'avoir une connexion Internet stable lors de la synchronisation
3. Mettez régulièrement à jour l'application
4. Si vous utilisez plusieurs appareils, synchronisez-les régulièrement pour éviter les conflits

## Assistance technique

Si vous rencontrez toujours des problèmes après avoir suivi ce guide, contactez notre support technique à l'adresse support@glycoflex.app en précisant :

- Les étapes que vous avez suivies
- Les messages d'erreur exacts que vous avez rencontrés
- La version de l'application que vous utilisez
- Le type d'appareil que vous utilisez

---

*Dernière mise à jour : 10 juin 2023*

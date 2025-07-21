// Déclaration globale pour augmenter les types manquants
declare module "*.json" {
    const value: any;
    export default value;
}

// Si d'autres types personnalisés sont nécessaires, ils peuvent être ajoutés ici

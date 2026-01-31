# Référence API

L'API de synchronisation expose des endpoints pour l'authentification et la synchronisation des mesures. Toutes les routes protégées exigent un token `Bearer`.

## Authentification

### Inscription

`POST /v1/auth/register`

**Payload**

```json
{
  "email": "user@example.com",
  "password": "motdepasse"
}
```

**Réponse**

```json
{
  "user": {
    "id": "usr_...",
    "email": "user@example.com",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "lastSignInAt": "2024-01-01T00:00:00.000Z"
  },
  "token": "...",
  "expiresAt": "2024-02-01T00:00:00.000Z"
}
```

### Connexion

`POST /v1/auth/login`

**Payload**

```json
{
  "email": "user@example.com",
  "password": "motdepasse"
}
```

### Déconnexion

`POST /v1/auth/logout`

**Headers**

```
Authorization: Bearer <token>
```

### Suppression de compte

`DELETE /v1/auth/account`

**Headers**

```
Authorization: Bearer <token>
```

## Mesures de glycémie

### Liste des mesures

`GET /v1/measurements`

**Headers**

```
Authorization: Bearer <token>
```

### Ajouter ou mettre à jour une mesure

`POST /v1/measurements`

**Headers**

```
Authorization: Bearer <token>
```

**Payload**

```json
{
  "id": "measurement_id",
  "value": 120,
  "type": "avant_repas",
  "timestamp": 1700000000000,
  "notes": "Après le déjeuner"
}
```

### Supprimer une mesure

`DELETE /v1/measurements/:id`

**Headers**

```
Authorization: Bearer <token>
```

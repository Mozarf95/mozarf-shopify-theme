# MOZARF — thème Shopify + CLI

Le **thème complet** à pousser est dans le dossier  
`theme_export__www-mozarf-com-copie-de-mozarf-theme__10APR2026-1055pm\`.

---

## Méthode simple (recommandée)

### Étape 1 — Une fois : Node

```powershell
cd "c:\Users\mozar\Desktop\CODING\SITE MOZARF\mozarf-shopify-theme"
npm install
```

### Étape 2 — Une fois : ton magasin

**Option A — Script tout-en-un (Windows)**  
Dans PowerShell (dans ce dossier) :

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned -Force
.\SYNCHRONISER-MOZARF.ps1
```

(La première ligne n’est à faire qu’une fois si Windows bloque les scripts.)

Il te demande ton domaine `xxx.myshopify.com`, crée `shopify.theme.toml`, ouvre la connexion navigateur, puis envoie le thème.

**Option B — À la main**  
Copie `shopify.theme.toml.example` → `shopify.theme.toml`, ouvre le fichier et remplace la ligne `store` par ton vrai domaine (Admin Shopify → **Paramètres** → **Détails de la boutique**).

### Étape 3 — À chaque synchro

Après `shopify.theme.toml` créé :

```powershell
npm run login
npm run sync
```

- `login` : ouvre le navigateur si ta session a expiré.  
- `sync` : envoie le dossier **theme_export** vers Shopify (tu choisis **quel thème** mettre à jour — prends un thème **brouillon / dev**, pas le thème en ligne sauf intention).

**Prévisualisation live pendant que tu codes :**

```powershell
npm run dev
```

(Même dossier `theme_export`, magasin lu depuis `shopify.theme.toml`.)

---

## Fichiers de config

| Fichier | Rôle |
|---------|------|
| `shopify.theme.toml` | Ton `store` (généré par le script ou copié depuis `.example`) — **ignoré par Git** |
| `shopify.theme.toml.example` | Modèle à copier |
| `SYNCHRONISER-MOZARF.ps1` | Première config + login + push en une fois |

---

## Prérequis

- **Node.js** 20.10+ (`node -v`)
- Accès **Thèmes** sur la boutique Shopify

---

## Autres commandes

| Commande | Rôle |
|----------|------|
| `npm run check` | `theme check` sur le dossier courant |
| `npm run pull` | Télécharger un thème (à lancer avec les flags voulus) |
| `npm run package` | Créer un `.zip` du thème |

---

## Limites

- L’IA édite les fichiers **sur ton PC** ; seul le **CLI** envoie vers Shopify.
- Pour un premier test, cible un **thème non publié** dans l’invite `theme push`.

---

## Ancienne note (thème minimal à la racine)

Le dossier racine du repo peut contenir un squelette ; le **vrai thème MOZARF exporté** est dans `theme_export__…`. Utilise **`npm run sync`** pour celui-ci.

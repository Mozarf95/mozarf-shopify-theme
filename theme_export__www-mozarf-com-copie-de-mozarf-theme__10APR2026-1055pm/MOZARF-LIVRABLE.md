# MOZARF — Livrable final (spec + thème + mise en route)

Document unique qui reprend **tout ce qui a été demandé** pour la boutique type BeatStars, **ce qui est en place dans le thème**, et **ce que tu dois faire dans l’admin Shopify**.

---

## 1. Rappel de ta spec (objectifs)

| Besoin | Détail |
|--------|--------|
| Plateforme | **Shopify** comme base ; lien **externe BeatStars** si tu veux rediriger ou doubler les ventes. |
| Offre | **Pas de “single” comme produit principal** : **un album = un produit Shopify**, avec possibilité d’**acheter chaque morceau séparément** (via variantes dédiées dans le JSON). |
| Formats | Sur **la même page** (modale) : **MP3**, **WAV**, **pack stems**, **licence pro** — boutons qui ajoutent la bonne variante au panier. |
| UX | **Modale plein écran**, arrière-plan **légèrement visible** (flou), albums derrière ; **comportement identique sur mobile**. |
| Préécoute | **30 secondes** (réglable par section). |
| Identité | **Noir + bleu MOZARF** (variables CSS `--mozarf-*` dans `mozarf-marketplace.css`). |
| Accueil | **Nouvel album en vitrine** + **mini description** (section dédiée). |
| Collections | Esprit **[BeatStars explore collections](https://www.beatstars.com/explore-collections)** ; au clic sur un album, **fiche modale** ; **autres albums visibles** en dessous (grille collection + grille “more” sur la vitrine). |
| Référence album | Ex. [collection BeatStars](https://www.beatstars.com/collection/191526) — chez toi : grille Shopify + modale. |
| Filtres | **Recherche / filtres** via le snippet **facets** du thème (filtres collection Shopify). |
| Drum kits | Liste type **[explore sound kits](https://www.beatstars.com/explore-sound-kits)** ; **fiche produit centrée** (pas collée à gauche comme [cet exemple](https://www.beatstars.com/travabeats/sound-kits/257242)) → template **`product.mozarf-kit`** + CSS. |
| International | Boutique **en anglais**, **multi-devises** et **multi-langues** → réglages **Shopify Markets** + traductions (pas remplaçables par un seul fichier thème). |
| Contenu | **Uniquement de vrais produits** : pas de fausses données dans le thème ; les démos locales (`previsualisation-maquette`) sont hors Shopify. |
| Cible visuelle | Environ **80 %** de l’esprit produit fini, en t’appuyant sur **tes** produits + metafields. |

---

## 2. Thème Shopify « tout-en-un » (déjà modifié)

**Dossier à zipper ou à pousser en entier** (c’est le thème complet avec toutes les modifs) :

```
mozarf-shopify-theme/theme_export__www-mozarf-com-copie-de-mozarf-theme__10APR2026-1055pm/
```

Ce dossier contient notamment :

| Rôle | Fichiers |
|------|----------|
| Marketplace albums | `sections/mozarf-marketplace-albums.liquid`, `assets/mozarf-marketplace.css`, `assets/mozarf-marketplace.js` |
| Modale + JSON album | `snippets/mozarf-marketplace-modal.liquid`, `snippets/mozarf-album-json.liquid` |
| Vitrine accueil | `sections/mozarf-home-showcase-album.liquid` |
| Kits | `sections/mozarf-marketplace-kits.liquid`, `assets/mozarf-kit-centered.css` |
| Gabarits | `templates/collection.mozarf-albums.json`, `templates/collection.mozarf-kits.json`, `templates/product.mozarf-kit.json`, **`templates/product.mozarf-album.json`** (page album type BeatStars + « More releases »), **`templates/page.mozarf.json`** (page texte fond sombre, ex. Production) |
| Typo globale | `assets/mozarf-site.css` + **Inter** (Google Fonts) chargés dans `layout/theme.liquid` sur tout le site |
| JSON album | `snippets/mozarf-album-json-inline.liquid` — JSON dans `<script type="application/json">` pour que le clic / lecteur fonctionne (évite les bugs d’échappement `data-album-json`) |
| Layout | `layout/theme.liquid` — `mozarf-site.css`, `mozarf-kit-centered.css`, classes **`mozarf-kit-centered-template`** et **`mozarf-album-page-template`** selon le template produit |
| Lecteur release (existant) | `sections/mozarf-release-player.liquid`, `assets/mozarf-release.css`, `assets/mozarf-release-player.js`, etc. |

Le petit dossier `shopify/` à la racine du projet est une **copie partielle** pour copier-coller des fichiers ; **ce n’est pas** un thème complet. Le vrai paquet final est le **theme_export** ci-dessus.

---

## 3. Ce que tu configures dans l’admin Shopify

### 3.1 Metafields produit (albums)

**Settings → Custom data → Products** — créer au minimum :

- **`custom.mozarf_album_data`** — type **JSON**  
- Optionnel : **`custom.mozarf_album_blurb`** — texte court (vitrine + cartes)

**Exemple de JSON** (`mozarf_album_data`) :

```json
{
  "title": "Nom affiché dans la modale",
  "featured_image": "https://cdn.shopify.com/s/files/1/.../cover.jpg",
  "tracks": [
    {
      "title": "Track 1",
      "preview_url": "https://cdn.shopify.com/s/files/1/.../extrait.mp3",
      "purchase": {
        "mp3_variant_id": 123456789,
        "wav_variant_id": 123456790,
        "stems_variant_id": 123456791,
        "license_variant_id": 123456792
      }
    }
  ],
  "full_album_variant_id": 123456799,
  "full_album_label": "Full album"
}
```

- Chaque `*_variant_id` est l’**ID de variante Shopify** (Admin → produit → variante → URL ou API).  
- `preview_url` = lien **direct** vers un fichier audio (ex. fichier uploadé dans **Contenu → Fichiers**).  
- Laisse `null` ou omets une clé si un format n’existe pas pour ce morceau.

### 3.2 Collections et templates

- Collection **albums** : thème → template **`mozarf-albums`**. Clic sur la carte = **modale lecteur** ; lien sous la carte = **page produit**.  
- **Albums (page détail)** : assigne le template produit **`mozarf-album`** à tes produits album → lecteur en pleine largeur + section **« More releases »** (choisir la collection des autres albums dans l’éditeur de thème).  
- Collection **kits** : template **`mozarf-kits`** (vérifie que la collection contient des produits et que les filtres ne sont pas vides côté Admin → Search & Discovery).  
- Produits **drum kits** : template **`mozarf-kit`** (mise en page centrée).  
- Page **Production** (ou toute page blanche sur fond clair) : dans l’admin de la page, template **`mozarf`** → fond sombre + texte lisible (`sections/mozarf-page-dark.liquid`).

### 3.3 Page d’accueil

Dans **Personnaliser le thème** → page d’accueil : ajouter la section **« MOZARF — Home album showcase »**, choisir le produit album, optionnellement une collection **« autres albums »**, et les liens BeatStars dans les réglages de section.

*(Tu peux laisser ton `index.json` actuel et ajouter cette section à la main ; aucune obligation de modifier le JSON à la main.)*

### 3.4 Menus (onglets Collections / Kits)

**Navigation** : crée des entrées vers tes collections qui utilisent `mozarf-albums` et `mozarf-kits`. Les URLs BeatStars sont en **boutons** dans les sections (réglables), pas obligatoirement dans le menu.

### 3.5 BeatStars (liens par défaut dans les templates JSON)

- Collections : [https://www.beatstars.com/explore-collections](https://www.beatstars.com/explore-collections)  
- Kits : [https://www.beatstars.com/explore-sound-kits](https://www.beatstars.com/explore-sound-kits)  

Modifiables dans l’éditeur de thème (paramètres des sections).

### 3.6 Anglais, devises, langues

- **Markets** : [documentation Shopify Markets](https://help.shopify.com/manual/markets)  
- Langues / traductions : appli **Translate & Adapt** ou équivalent + traduction des **contenus** et des **clés** du thème si besoin.

---

## 4. Prévisualisation locale (maquette HTML)

Hors Shopify, pour voir le rendu noir/bleu + modale + grille :

```
previsualisation-maquette/index.html
```

Ouvre ce fichier dans le navigateur ou via un petit serveur statique. Les styles pointent vers `shopify/assets/mozarf-marketplace.css`.

---

## 5. Déploiement (CLI simplifié)

Depuis **`mozarf-shopify-theme`** : voir **`README.md`** — `SYNCHRONISER-MOZARF.ps1`, `shopify.theme.toml`, puis `npm run sync`.

---

## 6. Limites / suite possible

- Le panier : le JS marketplace redirige vers **`/cart`** après ajout ; on pourra plus tard brancher le **panier drawer** du thème si tu le souhaites.  
- **Multi-langue** : le contenu des sections et metafields doit être traduit côté Shopify ; le thème fournit l’UI de base en anglais dans les défauts des templates JSON.  
- **Filtres** : ils reposent sur **`snippets/facets.liquid`** et la configuration des filtres de collection dans l’admin ; si un filtre n’apparaît pas, vérifie **Search & Discovery** / métachamps de filtre.

---

*Ce fichier est le livrable « spec + emplacement du thème + checklist admin ». Une copie identique est dans `theme_export__…/MOZARF-LIVRABLE.md` pour partir avec le zip du thème.*

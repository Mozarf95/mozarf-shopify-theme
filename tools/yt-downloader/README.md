# YT Playlist → MP3 (usage perso, depuis le téléphone)

## Héberger le serveur (gratuit, depuis un téléphone)
1. Va sur render.com, crée un compte avec GitHub.
2. New > Blueprint, choisis ce dépôt (il lit `render.yaml`).
3. Quand Render demande `YTD_TOKEN`, invente un mot de passe.
4. Une fois déployé, note l'adresse (ex. `https://mozarf-yt-downloader.onrender.com`).

## Brancher la page Shopify
Éditeur de thème > page « yt-downloader » > section : colle l'adresse du serveur et le même mot de passe.

## Limites
- Offre gratuite : le serveur s'endort (1er chargement ~1 min) et coupe les téléchargements trop longs. Prévois des petites playlists.
- YouTube bloque souvent les serveurs d'hébergement : des erreurs « Sign in to confirm you're not a bot » sont possibles.

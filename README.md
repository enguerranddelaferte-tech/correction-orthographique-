# Correcteur Word & Excel

Correcteur d'orthographe pour fichiers Word (.docx) et Excel (.xlsx), installable comme application (PWA) et utilisable hors connexion.

- Déposez un fichier : l'application relit les paragraphes, tableaux, en-têtes et pieds de page (Word) ou les cellules de texte (Excel).
- Validez les corrections une par une.
- Téléchargez le fichier corrigé, mise en forme intacte. Pour Word : en suivi des modifications ou corrections appliquées.

Tout se fait dans le navigateur : les fichiers ne sont envoyés nulle part.

**Application :** https://enguerranddelaferte-tech.github.io/correction-orthographique-/

## Limites

Le correcteur repère les mots absents du dictionnaire (orthographe). Il ne corrige pas la grammaire ni les accords, et peut se tromper sur le jargon et les abréviations : vérifiez chaque proposition.

## Crédits

- [nspell](https://github.com/wooorm/nspell), moteur compatible Hunspell (MIT)
- Dictionnaire français Dicollecte (MPL 2.0, voir `LICENCE-dictionnaire.txt`)
- [JSZip](https://github.com/Stuk/jszip) (MIT)

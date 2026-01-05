# OAF - Outil d'Analyse Financière

🔷 Application Python d'analyse de données financières avec Yahoo Finance

## Description

OAF (Outil d'Analyse Financière) est une application Python qui permet d'analyser des données financières en temps réel à partir de Yahoo Finance. L'application offre des fonctionnalités d'analyse technique incluant les moyennes mobiles, la volatilité, et les rendements.

## Fonctionnalités

- 📊 **Téléchargement de données historiques** : Récupération des données boursières via Yahoo Finance
- 📈 **Statistiques de base** : Prix min/max/moyen, volume moyen
- 📉 **Moyennes mobiles** : Calcul des MA20, MA50, MA200
- 📊 **Analyse de volatilité** : Volatilité journalière et annuelle
- 💹 **Calcul de rendements** : Rendements totaux et moyens
- 🔍 **Comparaison de titres** : Comparaison de plusieurs actions simultanément
- ℹ️ **Informations d'entreprise** : Secteur, industrie, capitalisation, etc.

## Installation

### Prérequis

- Python 3.8 ou supérieur
- pip (gestionnaire de paquets Python)

### Installation des dépendances

```bash
pip install -r requirements.txt
```

Ou installez manuellement les packages :

```bash
pip install yfinance pandas numpy matplotlib
```

## Utilisation

### Mode interactif

Lancez l'application en mode interactif :

```bash
python app.py
```

Vous aurez accès à un menu avec les options suivantes :
1. **Analyser un titre** : Analyse complète d'une action
2. **Comparer plusieurs titres** : Comparaison de plusieurs actions
3. **Quitter** : Fermer l'application

### Mode ligne de commande

Analysez rapidement un titre depuis la ligne de commande :

```bash
python app.py AAPL
```

Avec une période spécifique :

```bash
python app.py AAPL 6mo
```

### Périodes disponibles

- `1d` : 1 jour
- `5d` : 5 jours
- `1mo` : 1 mois
- `3mo` : 3 mois
- `6mo` : 6 mois
- `1y` : 1 an (défaut)
- `2y` : 2 ans
- `5y` : 5 ans
- `10y` : 10 ans
- `ytd` : Depuis le début de l'année
- `max` : Toutes les données disponibles

## Exemples d'utilisation

### Exemple 1 : Analyse d'Apple (AAPL)

```bash
python app.py AAPL 1y
```

Cela affichera :
- Informations de l'entreprise
- Statistiques de base (prix, volume)
- Moyennes mobiles (MA20, MA50, MA200)
- Analyse de volatilité et rendements

### Exemple 2 : Comparaison de plusieurs titres

Mode interactif :
```bash
python app.py
```
Puis choisissez l'option 2 et entrez : `AAPL,GOOGL,MSFT`

### Exemple 3 : Symboles boursiers populaires

- **Actions US** : AAPL, GOOGL, MSFT, AMZN, TSLA, META, NVDA
- **Actions FR** : MC.PA (LVMH), OR.PA (L'Oréal), SAN.PA (Sanofi)
- **Indices** : ^GSPC (S&P 500), ^DJI (Dow Jones), ^IXIC (NASDAQ)
- **Cryptomonnaies** : BTC-USD, ETH-USD

## Structure du projet

```
OAF/
├── app.py              # Application principale
├── requirements.txt    # Dépendances Python
├── .gitignore         # Fichiers à ignorer par Git
└── README.md          # Documentation
```

## API Yahoo Finance

Cette application utilise la bibliothèque `yfinance` qui permet d'accéder gratuitement aux données de Yahoo Finance. Les données incluent :
- Prix historiques (Open, High, Low, Close)
- Volumes de transaction
- Dividendes et splits
- Informations sur l'entreprise

## Limitations

- Les données proviennent de Yahoo Finance et peuvent avoir un délai de quelques minutes
- Certains symboles boursiers peuvent ne pas être disponibles
- La qualité des données dépend de Yahoo Finance

## Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## Licence

Ce projet est open source et disponible pour une utilisation personnelle et éducative.

## Auteur

Développé avec 💙 pour l'analyse financière
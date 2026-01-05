#!/usr/bin/env python3
"""
Script d'exemple pour démontrer les fonctionnalités de OAF
Utilise des données simulées pour montrer les capacités de l'application
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta


def generer_donnees_exemple():
    """Génère des données boursières simulées pour la démonstration"""
    # Générer 252 jours (1 année de trading)
    dates = pd.date_range(end=datetime.now(), periods=252, freq='D')
    
    # Simuler un prix avec une tendance et de la volatilité
    np.random.seed(42)
    prix_initial = 150.0
    rendements = np.random.normal(0.001, 0.02, 252)  # Rendements journaliers
    prix = prix_initial * (1 + rendements).cumprod()
    
    # Créer un DataFrame similaire à celui de yfinance
    donnees = pd.DataFrame({
        'Open': prix * (1 + np.random.uniform(-0.01, 0.01, 252)),
        'High': prix * (1 + np.random.uniform(0, 0.02, 252)),
        'Low': prix * (1 - np.random.uniform(0, 0.02, 252)),
        'Close': prix,
        'Volume': np.random.randint(50000000, 150000000, 252)
    }, index=dates)
    
    return donnees


def analyser_donnees_exemple(donnees, symbole="EXEMPLE"):
    """Analyse des données d'exemple"""
    print(f"\n{'#'*60}")
    print(f"# DÉMONSTRATION - ANALYSE FINANCIÈRE {symbole}")
    print(f"# Données simulées à titre d'exemple")
    print(f"{'#'*60}\n")
    
    # Statistiques de base
    print(f"{'='*60}")
    print(f"📈 STATISTIQUES DE BASE")
    print(f"{'='*60}")
    
    prix_actuel = donnees['Close'].iloc[-1]
    prix_min = donnees['Close'].min()
    prix_max = donnees['Close'].max()
    prix_moyen = donnees['Close'].mean()
    
    print(f"Prix actuel: {prix_actuel:.2f}")
    print(f"Prix minimum: {prix_min:.2f}")
    print(f"Prix maximum: {prix_max:.2f}")
    print(f"Prix moyen: {prix_moyen:.2f}")
    
    volume_moyen = donnees['Volume'].mean()
    print(f"\nVolume moyen: {volume_moyen:,.0f}")
    print(f"{'='*60}\n")
    
    # Moyennes mobiles
    print(f"{'='*60}")
    print(f"📊 MOYENNES MOBILES")
    print(f"{'='*60}")
    
    periodes = [20, 50, 200]
    print(f"Prix actuel: {prix_actuel:.2f}")
    
    for periode in periodes:
        ma = donnees['Close'].rolling(window=periode).mean().iloc[-1]
        diff = ((prix_actuel - ma) / ma) * 100
        print(f"MA{periode}: {ma:.2f} ({diff:+.2f}%)")
    
    print(f"{'='*60}\n")
    
    # Analyse de volatilité
    print(f"{'='*60}")
    print(f"📉 ANALYSE DE VOLATILITÉ")
    print(f"{'='*60}")
    
    rendements = donnees['Close'].pct_change()
    volatilite_journaliere = rendements.std()
    volatilite_annuelle = volatilite_journaliere * np.sqrt(252)
    
    print(f"Volatilité journalière: {volatilite_journaliere*100:.2f}%")
    print(f"Volatilité annuelle: {volatilite_annuelle*100:.2f}%")
    
    rendement_total = ((donnees['Close'].iloc[-1] / donnees['Close'].iloc[0]) - 1) * 100
    rendement_moyen_journalier = rendements.mean() * 100
    
    print(f"\nRendement total: {rendement_total:.2f}%")
    print(f"Rendement moyen journalier: {rendement_moyen_journalier:.2f}%")
    print(f"{'='*60}\n")
    
    # Statistiques supplémentaires
    print(f"{'='*60}")
    print(f"📊 STATISTIQUES AVANCÉES")
    print(f"{'='*60}")
    
    # Ratio de Sharpe simplifié (sans taux sans risque)
    ratio_sharpe = rendements.mean() / rendements.std() * np.sqrt(252)
    print(f"Ratio de Sharpe (annualisé): {ratio_sharpe:.2f}")
    
    # Drawdown maximum
    cumul = (1 + rendements).cumprod()
    running_max = cumul.expanding().max()
    drawdown = (cumul - running_max) / running_max
    max_drawdown = drawdown.min() * 100
    print(f"Drawdown maximum: {max_drawdown:.2f}%")
    
    # Jours positifs vs négatifs
    jours_positifs = (rendements > 0).sum()
    jours_negatifs = (rendements < 0).sum()
    print(f"\nJours positifs: {jours_positifs} ({jours_positifs/len(rendements)*100:.1f}%)")
    print(f"Jours négatifs: {jours_negatifs} ({jours_negatifs/len(rendements)*100:.1f}%)")
    
    print(f"{'='*60}\n")


def comparer_titres_exemple():
    """Démontre la comparaison de plusieurs titres"""
    print(f"\n{'='*60}")
    print(f"📊 COMPARAISON DE TITRES (Données simulées)")
    print(f"{'='*60}\n")
    
    symboles = ['TECH-A', 'TECH-B', 'FINANCE-C']
    resultats = []
    
    for i, symbole in enumerate(symboles):
        np.random.seed(42 + i)
        dates = pd.date_range(end=datetime.now(), periods=252, freq='D')
        
        # Différentes caractéristiques pour chaque titre
        prix_initial = 100.0 + i * 50
        rendement_moyen = 0.001 * (1 + i * 0.5)
        volatilite = 0.015 + i * 0.005
        
        rendements = np.random.normal(rendement_moyen, volatilite, 252)
        prix = prix_initial * (1 + rendements).cumprod()
        
        donnees = pd.DataFrame({
            'Close': prix
        }, index=dates)
        
        prix_debut = donnees['Close'].iloc[0]
        prix_fin = donnees['Close'].iloc[-1]
        rendement = ((prix_fin / prix_debut) - 1) * 100
        
        rendements_daily = donnees['Close'].pct_change()
        volatilite_calc = rendements_daily.std() * np.sqrt(252) * 100
        
        resultats.append({
            'Symbole': symbole,
            'Prix début': f"{prix_debut:.2f}",
            'Prix fin': f"{prix_fin:.2f}",
            'Rendement (%)': f"{rendement:.2f}",
            'Volatilité annuelle (%)': f"{volatilite_calc:.2f}"
        })
    
    df_resultats = pd.DataFrame(resultats)
    print(df_resultats.to_string(index=False))
    print(f"\n{'='*60}\n")


def main():
    """Fonction principale de démonstration"""
    print("\n" + "="*60)
    print("🔷 OAF - DÉMONSTRATION DES FONCTIONNALITÉS")
    print("="*60)
    print("\nCette démonstration utilise des données simulées pour")
    print("illustrer les capacités de l'application OAF.")
    print("\nPour utiliser avec de vraies données Yahoo Finance:")
    print("  python app.py AAPL 1y")
    print("="*60)
    
    # Démonstration 1: Analyse d'un titre
    print("\n\n📊 DÉMONSTRATION 1: Analyse d'un titre unique\n")
    donnees = generer_donnees_exemple()
    analyser_donnees_exemple(donnees, "DEMO-001")
    
    # Démonstration 2: Comparaison de titres
    print("\n\n📊 DÉMONSTRATION 2: Comparaison de plusieurs titres\n")
    comparer_titres_exemple()
    
    print("\n" + "="*60)
    print("✓ Démonstration terminée!")
    print("="*60)
    print("\nPour analyser de vraies données boursières:")
    print("1. Assurez-vous d'avoir une connexion internet")
    print("2. Lancez: python app.py AAPL")
    print("   ou en mode interactif: python app.py")
    print("="*60 + "\n")


if __name__ == "__main__":
    main()

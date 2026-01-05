#!/usr/bin/env python3
"""
OAF - Outil d'Analyse Financière
Application Python d'analyse de données financières avec Yahoo Finance
"""

import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import sys


class AnalyseFinanciere:
    """Classe pour l'analyse de données financières"""
    
    def __init__(self, symbole):
        """
        Initialise l'analyse pour un symbole boursier
        
        Args:
            symbole (str): Symbole boursier (ex: AAPL, GOOGL, MSFT)
        """
        self.symbole = symbole.upper()
        self.ticker = yf.Ticker(self.symbole)
        self.donnees = None
        
    def telecharger_donnees(self, periode="1y"):
        """
        Télécharge les données historiques
        
        Args:
            periode (str): Période de données (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max)
        
        Returns:
            DataFrame: Données historiques
        """
        try:
            self.donnees = self.ticker.history(period=periode)
            if self.donnees.empty:
                print(f"⚠️  Aucune donnée trouvée pour {self.symbole}")
                return None
            print(f"✓ Données téléchargées pour {self.symbole} ({periode})")
            return self.donnees
        except Exception as e:
            print(f"❌ Erreur lors du téléchargement: {e}")
            return None
    
    def info_entreprise(self):
        """Affiche les informations de l'entreprise"""
        try:
            info = self.ticker.info
            print(f"\n{'='*60}")
            print(f"📊 INFORMATIONS - {self.symbole}")
            print(f"{'='*60}")
            
            champs = [
                ('longName', 'Nom'),
                ('sector', 'Secteur'),
                ('industry', 'Industrie'),
                ('country', 'Pays'),
                ('marketCap', 'Capitalisation'),
                ('currency', 'Devise'),
            ]
            
            for cle, label in champs:
                if cle in info and info[cle]:
                    valeur = info[cle]
                    if cle == 'marketCap' and isinstance(valeur, (int, float)):
                        valeur = f"{valeur:,.0f}"
                    print(f"{label}: {valeur}")
            
            print(f"{'='*60}\n")
        except Exception as e:
            print(f"⚠️  Impossible de récupérer les informations: {e}")
    
    def statistiques_base(self):
        """Calcule et affiche les statistiques de base"""
        if self.donnees is None or self.donnees.empty:
            print("❌ Pas de données disponibles. Téléchargez d'abord les données.")
            return
        
        print(f"\n{'='*60}")
        print(f"📈 STATISTIQUES DE BASE - {self.symbole}")
        print(f"{'='*60}")
        
        prix_actuel = self.donnees['Close'].iloc[-1]
        prix_min = self.donnees['Close'].min()
        prix_max = self.donnees['Close'].max()
        prix_moyen = self.donnees['Close'].mean()
        
        print(f"Prix actuel: {prix_actuel:.2f}")
        print(f"Prix minimum: {prix_min:.2f}")
        print(f"Prix maximum: {prix_max:.2f}")
        print(f"Prix moyen: {prix_moyen:.2f}")
        
        # Volume
        volume_moyen = self.donnees['Volume'].mean()
        print(f"\nVolume moyen: {volume_moyen:,.0f}")
        
        print(f"{'='*60}\n")
    
    def calculer_rendements(self):
        """Calcule les rendements journaliers"""
        if self.donnees is None or self.donnees.empty:
            return None
        
        rendements = self.donnees['Close'].pct_change()
        return rendements
    
    def moyennes_mobiles(self, periodes=[20, 50, 200]):
        """
        Calcule les moyennes mobiles
        
        Args:
            periodes (list): Liste des périodes pour les moyennes mobiles
        """
        if self.donnees is None or self.donnees.empty:
            print("❌ Pas de données disponibles.")
            return
        
        print(f"\n{'='*60}")
        print(f"📊 MOYENNES MOBILES - {self.symbole}")
        print(f"{'='*60}")
        
        prix_actuel = self.donnees['Close'].iloc[-1]
        print(f"Prix actuel: {prix_actuel:.2f}")
        
        for periode in periodes:
            if len(self.donnees) >= periode:
                ma = self.donnees['Close'].rolling(window=periode).mean().iloc[-1]
                diff = ((prix_actuel - ma) / ma) * 100
                print(f"MA{periode}: {ma:.2f} ({diff:+.2f}%)")
        
        print(f"{'='*60}\n")
    
    def analyse_volatilite(self):
        """Analyse la volatilité du titre"""
        if self.donnees is None or self.donnees.empty:
            print("❌ Pas de données disponibles.")
            return
        
        rendements = self.calculer_rendements()
        
        print(f"\n{'='*60}")
        print(f"📉 ANALYSE DE VOLATILITÉ - {self.symbole}")
        print(f"{'='*60}")
        
        volatilite_journaliere = rendements.std()
        volatilite_annuelle = volatilite_journaliere * np.sqrt(252)
        
        print(f"Volatilité journalière: {volatilite_journaliere*100:.2f}%")
        print(f"Volatilité annuelle: {volatilite_annuelle*100:.2f}%")
        
        # Rendements
        rendement_total = ((self.donnees['Close'].iloc[-1] / self.donnees['Close'].iloc[0]) - 1) * 100
        rendement_moyen_journalier = rendements.mean() * 100
        
        print(f"\nRendement total: {rendement_total:.2f}%")
        print(f"Rendement moyen journalier: {rendement_moyen_journalier:.2f}%")
        
        print(f"{'='*60}\n")
    
    def rapport_complet(self):
        """Génère un rapport d'analyse complet"""
        print(f"\n{'#'*60}")
        print(f"# RAPPORT D'ANALYSE FINANCIÈRE - {self.symbole}")
        print(f"# {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'#'*60}\n")
        
        self.info_entreprise()
        self.statistiques_base()
        self.moyennes_mobiles()
        self.analyse_volatilite()


def afficher_menu():
    """Affiche le menu principal"""
    print("\n" + "="*60)
    print("🔷 OAF - Outil d'Analyse Financière")
    print("="*60)
    print("1. Analyser un titre")
    print("2. Comparer plusieurs titres")
    print("3. Quitter")
    print("="*60)


def analyser_titre():
    """Mode d'analyse d'un seul titre"""
    symbole = input("\n📌 Entrez le symbole boursier (ex: AAPL, GOOGL, MSFT): ").strip()
    
    if not symbole:
        print("❌ Symbole invalide")
        return
    
    print(f"\nPériodes disponibles: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max")
    periode = input("📅 Période (défaut: 1y): ").strip() or "1y"
    
    analyse = AnalyseFinanciere(symbole)
    
    donnees = analyse.telecharger_donnees(periode)
    if donnees is not None:
        analyse.rapport_complet()


def comparer_titres():
    """Mode de comparaison de plusieurs titres"""
    symboles_input = input("\n📌 Entrez les symboles séparés par des virgules (ex: AAPL,GOOGL,MSFT): ").strip()
    
    if not symboles_input:
        print("❌ Aucun symbole fourni")
        return
    
    symboles = [s.strip() for s in symboles_input.split(',')]
    periode = input("📅 Période (défaut: 1y): ").strip() or "1y"
    
    print(f"\n{'='*60}")
    print(f"📊 COMPARAISON DE TITRES")
    print(f"{'='*60}\n")
    
    resultats = []
    
    for symbole in symboles:
        analyse = AnalyseFinanciere(symbole)
        donnees = analyse.telecharger_donnees(periode)
        
        if donnees is not None and not donnees.empty:
            prix_debut = donnees['Close'].iloc[0]
            prix_fin = donnees['Close'].iloc[-1]
            rendement = ((prix_fin / prix_debut) - 1) * 100
            
            rendements = analyse.calculer_rendements()
            volatilite = rendements.std() * np.sqrt(252) * 100
            
            resultats.append({
                'Symbole': symbole,
                'Prix début': f"{prix_debut:.2f}",
                'Prix fin': f"{prix_fin:.2f}",
                'Rendement (%)': f"{rendement:.2f}",
                'Volatilité annuelle (%)': f"{volatilite:.2f}"
            })
    
    if resultats:
        df_resultats = pd.DataFrame(resultats)
        print(df_resultats.to_string(index=False))
        print(f"\n{'='*60}\n")


def main():
    """Fonction principale"""
    print("\n🔷 Bienvenue dans OAF - Outil d'Analyse Financière")
    print("Application d'analyse de données financières avec Yahoo Finance\n")
    
    # Mode non-interactif si des arguments sont fournis
    if len(sys.argv) > 1:
        symbole = sys.argv[1]
        periode = sys.argv[2] if len(sys.argv) > 2 else "1y"
        
        analyse = AnalyseFinanciere(symbole)
        donnees = analyse.telecharger_donnees(periode)
        if donnees is not None:
            analyse.rapport_complet()
        return
    
    # Mode interactif
    while True:
        afficher_menu()
        choix = input("\nVotre choix: ").strip()
        
        if choix == "1":
            analyser_titre()
        elif choix == "2":
            comparer_titres()
        elif choix == "3":
            print("\n👋 Au revoir!\n")
            break
        else:
            print("❌ Choix invalide")


if __name__ == "__main__":
    main()

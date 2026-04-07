/**
 * dateUtils.js — Fonctions utilitaires pour gérer les dates
 *
 * On utilise la bibliothèque date-fns pour manipuler les dates facilement.
 * Ces fonctions sont utilisées dans toute l'application.
 */

import { getISOWeek, getISOWeekYear, format } from 'date-fns'
import { fr } from 'date-fns/locale'

/**
 * Calcule le numéro de semaine ISO d'une date donnée.
 * Exemple : le 3 juin 2025 → 23
 *
 * @param {Date} date - La date dont on veut le numéro de semaine
 * @returns {number} Le numéro de semaine (1 à 53)
 */
export function getWeekNumber(date) {
  return getISOWeek(date)
}

/**
 * Génère une clé unique pour la semaine courante.
 * Cette clé sert d'identifiant dans le localStorage.
 * Exemple : "week-2025-W23"
 *
 * @returns {string} La clé de la semaine au format "week-YYYY-WXX"
 */
export function getWeekKey() {
  const now = new Date()
  const year = getISOWeekYear(now)   // Année ISO (peut différer de l'année calendaire en début/fin d'année)
  const week = getISOWeek(now)       // Numéro de semaine ISO (1–53)
  // On formate le numéro de semaine sur 2 chiffres : 3 → "03", 23 → "23"
  const weekPadded = String(week).padStart(2, '0')
  return `week-${year}-W${weekPadded}`
}

/**
 * Retourne le nom du jour actuel en minuscules, en français.
 * Exemple : si on est mardi → "mardi"
 *
 * @returns {string} Le nom du jour parmi : "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"
 */
export function getCurrentDayName() {
  // format() de date-fns avec la locale "fr" retourne le nom du jour en français
  // "EEEE" = nom complet du jour (ex: "Mardi"), toLowerCase() le met en minuscules
  return format(new Date(), 'EEEE', { locale: fr }).toLowerCase()
}

/**
 * Vérifie si le nom de jour fourni correspond au jour actuel.
 * Utilisé pour mettre en surbrillance la colonne du jour courant.
 *
 * @param {string} dayName - Le nom du jour à vérifier ("lundi", "mardi", etc.)
 * @returns {boolean} true si c'est aujourd'hui, false sinon
 */
export function isCurrentDay(dayName) {
  return getCurrentDayName() === dayName
}

/**
 * Formate la date d'aujourd'hui de façon lisible pour l'afficher dans le header.
 * Exemple : "Mardi 3 juin 2025"
 *
 * @returns {string} La date du jour formatée
 */
export function getTodayFormatted() {
  return format(new Date(), "EEEE d MMMM yyyy", { locale: fr })
}

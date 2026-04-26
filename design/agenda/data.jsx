// Données de l'agenda — adapté du projet réel
const CATEGORIES = {
  sommeil:  { label: 'Sommeil',        dot: '#A8A29E' },
  coran:    { label: 'Coran & Dhikr',  dot: '#78716C' },
  learning: { label: 'Apprentissage',  dot: '#0A0A0A' },
  clients:  { label: 'Clients',        dot: '#D97706' },
  salam:    { label: 'Dev App',        dot: '#0369A1' },
  sport:    { label: 'Sport',          dot: '#15803D' },
  school:   { label: 'École',          dot: '#1E40AF' },
  work:     { label: 'Travail',        dot: '#44403C' },
  rest:     { label: 'Repos & Repas',  dot: '#D6D3D1' },
};

const DAYS_ORDER = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];

const SCHEDULE = {
  lundi: { label: 'Lundi', type: 'École + Push', blocks: [
    { id:'lun-1', time:'05:30 – 06:15', label:'Fajr + Coran',          category:'coran',    done:true,  note:'Sourate Al-Mulk' },
    { id:'lun-2', time:'06:15 – 08:20', label:'Apprentissage',         category:'learning', done:true,  note:'React Server Components — chapitre 4' },
    { id:'lun-3', time:'08:20 – 09:00', label:'Trajet aller',          category:'coran',    done:true },
    { id:'lun-4', time:'09:00 – 17:00', label:'École',                 category:'school',   done:false, note:'TP Algorithmique' },
    { id:'lun-5', time:'17:20 – 18:40', label:'Sport · Push',          category:'sport',    done:false, note:'Bench 4×8 · OHP 4×8' },
    { id:'lun-6', time:'19:00 – 20:00', label:'Clients Altiseo',       category:'clients',  done:false, note:'Audit SEO Q2' },
    { id:'lun-7', time:'20:00 – 21:30', label:'Apprentissage',         category:'learning', done:false },
    { id:'lun-8', time:'21:30 – 22:00', label:'Repas OMAD',            category:'rest',     done:false },
  ]},
  mardi: { label: 'Mardi', type: 'École + Pull', blocks: [
    { id:'mar-1', time:'05:30 – 06:15', label:'Fajr + Coran',          category:'coran',    done:false },
    { id:'mar-2', time:'06:15 – 08:20', label:'Dev App',               category:'salam',    done:false, note:'Refactor onboarding' },
    { id:'mar-3', time:'09:00 – 17:00', label:'École',                 category:'school',   done:false },
    { id:'mar-4', time:'17:20 – 18:40', label:'Sport · Pull',          category:'sport',    done:false },
    { id:'mar-5', time:'19:00 – 21:30', label:'Apprentissage',         category:'learning', done:false },
    { id:'mar-6', time:'21:30 – 22:00', label:'Repas OMAD',            category:'rest',     done:false },
  ]},
  mercredi: { label: 'Mercredi', type: 'Travail', blocks: [
    { id:'mer-1', time:'05:30 – 06:15', label:'Fajr + Coran',          category:'coran',    done:false },
    { id:'mer-2', time:'06:15 – 09:20', label:'Clients Altiseo',       category:'clients',  done:false },
    { id:'mer-3', time:'10:00 – 19:30', label:'Travail',               category:'work',     done:false, note:'Pause 12h-14h30' },
    { id:'mer-4', time:'20:30 – 21:30', label:'Temps libre',           category:'rest',     done:false },
    { id:'mer-5', time:'21:30 – 22:00', label:'Repas OMAD',            category:'rest',     done:false },
  ]},
  jeudi: { label: 'Jeudi', type: 'Travail + Legs', blocks: [
    { id:'jeu-1', time:'05:30 – 06:15', label:'Fajr + Coran',          category:'coran',    done:false },
    { id:'jeu-2', time:'06:15 – 09:20', label:'Apprentissage',         category:'learning', done:false },
    { id:'jeu-3', time:'10:00 – 19:30', label:'Travail',               category:'work',     done:false },
    { id:'jeu-4', time:'19:50 – 20:35', label:'Sport · Legs',          category:'sport',    done:false },
    { id:'jeu-5', time:'20:55 – 21:30', label:'Temps libre',           category:'rest',     done:false },
    { id:'jeu-6', time:'21:30 – 22:00', label:'Repas OMAD',            category:'rest',     done:false },
  ]},
  vendredi: { label: 'Vendredi', type: 'Travail', blocks: [
    { id:'ven-1', time:'05:30 – 06:15', label:'Fajr + Coran',          category:'coran',    done:false },
    { id:'ven-2', time:'06:15 – 09:20', label:'Clients Altiseo',       category:'clients',  done:false },
    { id:'ven-3', time:'10:00 – 19:30', label:'Travail',               category:'work',     done:false },
    { id:'ven-4', time:'20:30 – 21:30', label:'Famille',               category:'rest',     done:false },
    { id:'ven-5', time:'21:30 – 22:00', label:'Repas OMAD',            category:'rest',     done:false },
  ]},
  samedi: { label: 'Samedi', type: 'Travail', blocks: [
    { id:'sam-1', time:'05:30 – 06:15', label:'Fajr + Coran',          category:'coran',    done:false },
    { id:'sam-2', time:'06:15 – 09:20', label:'Apprentissage',         category:'learning', done:false },
    { id:'sam-3', time:'10:00 – 19:30', label:'Travail',               category:'work',     done:false },
    { id:'sam-4', time:'20:30 – 21:30', label:'Temps libre',           category:'rest',     done:false },
    { id:'sam-5', time:'21:30 – 22:00', label:'Repas OMAD',            category:'rest',     done:false },
  ]},
  dimanche: { label: 'Dimanche', type: 'Travail 15h30', blocks: [
    { id:'dim-1', time:'05:30 – 06:15', label:'Fajr + Coran',          category:'coran',    done:false },
    { id:'dim-2', time:'06:15 – 07:10', label:'Dev App',               category:'salam',    done:false },
    { id:'dim-3', time:'07:10 – 08:05', label:'Clients Altiseo',       category:'clients',  done:false },
    { id:'dim-4', time:'08:05 – 14:50', label:'Temps libre',           category:'rest',     done:false },
    { id:'dim-5', time:'15:30 – 19:00', label:'Travail',               category:'work',     done:false },
    { id:'dim-6', time:'20:00 – 21:30', label:'Temps libre',           category:'rest',     done:false },
    { id:'dim-7', time:'21:30 – 22:00', label:'Repas OMAD',            category:'rest',     done:false },
  ]},
};

const WEEK_DATES = ['28','29','30','01','02','03','04']; // 28 Avril → 4 Mai 2026
const TODAY_INDEX = 0; // Lundi

Object.assign(window, { CATEGORIES, DAYS_ORDER, SCHEDULE, WEEK_DATES, TODAY_INDEX });

/**
 * Versets du jour (Louis Segond 1910) — un verset par page et par jour, choisi dans une liste
 * thématique propre au contexte de la page : le verset affiché sur « Prière » parle de prière, celui
 * de « Finances » de gestion fidèle, etc. Le choix est déterministe (même verset toute la journée,
 * pour tous les utilisateurs, change à minuit UTC = heure d'Abidjan) et sans état à stocker.
 */
export interface Verse {
  text: string;
  ref: string;
}

const v = (text: string, ref: string): Verse => ({ text, ref });

export const VERSE_POOLS = {
  dashboard: [
    v("Que votre lumière luise ainsi devant les hommes, afin qu'ils voient vos bonnes œuvres, et qu'ils glorifient votre Père qui est dans les cieux.", "Matthieu 5:16"),
    v("Ainsi, mes frères bien-aimés, soyez fermes, inébranlables, travaillez de mieux en mieux à l'œuvre du Seigneur.", "1 Corinthiens 15:58"),
    v("C'est ici la journée que l'Éternel a faite : qu'elle soit pour nous un sujet d'allégresse et de joie !", "Psaume 118:24"),
    v("Ne t'ai-je pas commandé : Fortifie-toi et prends courage ? Ne t'effraie point, car l'Éternel, ton Dieu, est avec toi dans tout ce que tu entreprendras.", "Josué 1:9"),
    v("Voici, qu'il est agréable, qu'il est doux pour des frères de demeurer ensemble !", "Psaume 133:1"),
    v("Confie-toi en l'Éternel de tout ton cœur, et ne t'appuie pas sur ta sagesse.", "Proverbes 3:5"),
    v("Je puis tout par celui qui me fortifie.", "Philippiens 4:13"),
    v("Car je connais les projets que j'ai formés sur vous, dit l'Éternel, projets de paix et non de malheur, afin de vous donner un avenir et de l'espérance.", "Jérémie 29:11"),
  ],
  communication: [
    v("Allez, faites de toutes les nations des disciples.", "Matthieu 28:19"),
    v("Allez par tout le monde, et prêchez la bonne nouvelle à toute la création.", "Marc 16:15"),
    v("Qu'ils sont beaux les pieds de ceux qui annoncent la paix, de ceux qui annoncent de bonnes nouvelles !", "Romains 10:15"),
    v("Comme des pommes d'or enchâssées dans des ciselures d'argent, ainsi est une parole dite à propos.", "Proverbes 25:11"),
    v("Que votre parole soit toujours accompagnée de grâce, assaisonnée de sel.", "Colossiens 4:6"),
    v("Les paroles agréables sont un rayon de miel, douces pour l'âme et salutaires pour le corps.", "Proverbes 16:24"),
    v("S'il y a lieu, quelque bonne parole, qui serve à l'édification et communique une grâce à ceux qui l'entendent.", "Éphésiens 4:29"),
  ],
  members: [
    v("Nous sommes membres les uns des autres.", "Éphésiens 4:25"),
    v("Ainsi, nous qui sommes plusieurs, nous formons un seul corps en Christ, et nous sommes tous membres les uns des autres.", "Romains 12:5"),
    v("Vous êtes le corps de Christ, et vous êtes ses membres, chacun pour sa part.", "1 Corinthiens 12:27"),
    v("Ils persévéraient dans l'enseignement des apôtres, dans la communion fraternelle, dans la fraction du pain, et dans les prières.", "Actes 2:42"),
    v("Veillons les uns sur les autres, pour nous exciter à la charité et aux bonnes œuvres.", "Hébreux 10:24"),
    v("À ceci tous connaîtront que vous êtes mes disciples, si vous avez de l'amour les uns pour les autres.", "Jean 13:35"),
    v("Accueillez-vous donc les uns les autres, comme Christ vous a accueillis, pour la gloire de Dieu.", "Romains 15:7"),
  ],
  families: [
    v("Moi et ma maison, nous servirons l'Éternel.", "Josué 24:15"),
    v("Voici, des fils sont un héritage de l'Éternel, le fruit des entrailles est une récompense.", "Psaume 127:3"),
    v("Instruis l'enfant selon la voie qu'il doit suivre ; et quand il sera vieux il ne s'en détournera pas.", "Proverbes 22:6"),
    v("Pères, n'irritez pas vos enfants, mais élevez-les en les corrigeant et en les instruisant selon le Seigneur.", "Éphésiens 6:4"),
    v("Mais par-dessus toutes ces choses revêtez-vous de la charité, qui est le lien de la perfection.", "Colossiens 3:14"),
    v("Crois au Seigneur Jésus, et tu seras sauvé, toi et ta famille.", "Actes 16:31"),
    v("Voici, qu'il est agréable, qu'il est doux pour des frères de demeurer ensemble !", "Psaume 133:1"),
  ],
  visitors: [
    v("N'oubliez pas l'hospitalité ; car, en l'exerçant, quelques-uns ont logé des anges, sans le savoir.", "Hébreux 13:2"),
    v("J'étais étranger, et vous m'avez recueilli.", "Matthieu 25:35"),
    v("Exercez l'hospitalité les uns envers les autres, sans murmures.", "1 Pierre 4:9"),
    v("Venez, et voyez.", "Jean 1:39"),
    v("Je suis dans la joie quand on me dit : Allons à la maison de l'Éternel !", "Psaume 122:1"),
    v("Accueillez-vous donc les uns les autres, comme Christ vous a accueillis, pour la gloire de Dieu.", "Romains 15:7"),
    v("Pourvoyez aux besoins des saints. Exercez l'hospitalité.", "Romains 12:13"),
  ],
  groups: [
    v("Car là où deux ou trois sont assemblés en mon nom, je suis au milieu d'eux.", "Matthieu 18:20"),
    v("Deux valent mieux qu'un, parce qu'ils retirent un bon salaire de leur travail.", "Ecclésiaste 4:9"),
    v("Portez les fardeaux les uns des autres, et vous accomplirez ainsi la loi de Christ.", "Galates 6:2"),
    v("N'abandonnons pas notre assemblée, comme c'est la coutume de quelques-uns ; mais exhortons-nous réciproquement.", "Hébreux 10:25"),
    v("Exhortez-vous donc réciproquement, et édifiez-vous les uns les autres.", "1 Thessaloniciens 5:11"),
    v("Chaque jour, ils étaient tous ensemble assidus au temple, ils rompaient le pain dans les maisons, et prenaient leur nourriture avec joie et simplicité de cœur.", "Actes 2:46"),
    v("Voici, qu'il est agréable, qu'il est doux pour des frères de demeurer ensemble !", "Psaume 133:1"),
  ],
  pastoral: [
    v("Portez les fardeaux les uns des autres, et vous accomplirez ainsi la loi de Christ.", "Galates 6:2"),
    v("Je suis le bon berger. Le bon berger donne sa vie pour ses brebis.", "Jean 10:11"),
    v("Paissez le troupeau de Dieu qui est sous votre garde, non par contrainte, mais volontairement, selon Dieu.", "1 Pierre 5:2"),
    v("Je chercherai celle qui était perdue, je ramènerai celle qui était égarée, je panserai celle qui est blessée.", "Ézéchiel 34:16"),
    v("L'Éternel est mon berger : je ne manquerai de rien.", "Psaume 23:1"),
    v("Venez à moi, vous tous qui êtes fatigués et chargés, et je vous donnerai du repos.", "Matthieu 11:28"),
    v("Confessez donc vos péchés les uns aux autres, et priez les uns pour les autres, afin que vous soyez guéris.", "Jacques 5:16"),
    v("Il nous console dans toutes nos afflictions, afin que nous puissions consoler ceux qui se trouvent dans l'affliction.", "2 Corinthiens 1:4"),
  ],
  prayer: [
    v("Persévérez dans la prière, veillez-y avec actions de grâces.", "Colossiens 4:2"),
    v("Demandez, et l'on vous donnera ; cherchez, et vous trouverez ; frappez, et l'on vous ouvrira.", "Matthieu 7:7"),
    v("Ne vous inquiétez de rien ; mais en toutes choses faites connaître vos besoins à Dieu par des prières et des supplications, avec des actions de grâces.", "Philippiens 4:6"),
    v("Priez sans cesse.", "1 Thessaloniciens 5:17"),
    v("Invoque-moi, et je te répondrai ; je t'annoncerai de grandes choses, des choses cachées, que tu ne connais pas.", "Jérémie 33:3"),
    v("La prière fervente du juste a une grande efficace.", "Jacques 5:16"),
    v("L'Éternel est près de tous ceux qui l'invoquent, de tous ceux qui l'invoquent avec sincérité.", "Psaume 145:18"),
    v("Tout ce que vous demandez en priant, croyez que vous l'avez reçu, et vous le verrez s'accomplir.", "Marc 11:24"),
  ],
  visits: [
    v("J'étais malade, et vous m'avez visité.", "Matthieu 25:36"),
    v("La religion pure et sans tache, devant Dieu notre Père, consiste à visiter les orphelins et les veuves dans leurs afflictions.", "Jacques 1:27"),
    v("Souvenez-vous des prisonniers, comme si vous étiez aussi prisonniers ; de ceux qui sont maltraités.", "Hébreux 13:3"),
    v("Réjouissez-vous avec ceux qui se réjouissent ; pleurez avec ceux qui pleurent.", "Romains 12:15"),
    v("Quelqu'un parmi vous est-il malade ? Qu'il appelle les anciens de l'Église, et que les anciens prient pour lui.", "Jacques 5:14"),
    v("Pratiquons le bien envers tous, et surtout envers les frères en la foi.", "Galates 6:10"),
    v("En tout temps l'ami aime, et dans le malheur il se montre un frère.", "Proverbes 17:17"),
  ],
  council: [
    v("Faute de direction, un peuple tombe ; le salut est dans le grand nombre des conseillers.", "Proverbes 11:14"),
    v("Les projets échouent, faute d'une assemblée qui délibère ; mais ils réussissent quand il y a de nombreux conseillers.", "Proverbes 15:22"),
    v("Écoute les conseils, et reçois l'instruction, afin que tu sois sage dans la suite de ta vie.", "Proverbes 19:20"),
    v("Si quelqu'un d'entre vous manque de sagesse, qu'il la demande à Dieu, qui donne à tous simplement et sans reproche, et elle lui sera donnée.", "Jacques 1:5"),
    v("Car c'est avec de la prudence que tu feras la guerre, et le salut est dans le grand nombre des conseillers.", "Proverbes 24:6"),
    v("Il a paru bon au Saint-Esprit et à nous, de ne vous imposer d'autre charge que ce qui est nécessaire.", "Actes 15:28"),
    v("Voici le commencement de la sagesse : acquiers la sagesse, et avec tout ce que tu possèdes acquiers l'intelligence.", "Proverbes 4:7"),
  ],
  ministries: [
    v("Il y a diversité de dons, mais le même Esprit.", "1 Corinthiens 12:4"),
    v("Comme de bons dispensateurs des diverses grâces de Dieu, que chacun de vous mette au service des autres le don qu'il a reçu.", "1 Pierre 4:10"),
    v("Pour le perfectionnement des saints en vue de l'œuvre du ministère et de l'édification du corps de Christ.", "Éphésiens 4:12"),
    v("Le Fils de l'homme est venu, non pour être servi, mais pour servir et donner sa vie en rançon pour beaucoup.", "Marc 10:45"),
    v("Que la charité vous rende serviteurs les uns des autres.", "Galates 5:13"),
    v("La moisson est grande, mais il y a peu d'ouvriers.", "Matthieu 9:37"),
    v("Tout ce que vous faites, faites-le de bon cœur, comme pour le Seigneur et non pour des hommes.", "Colossiens 3:23"),
  ],
  workers: [
    v("Car nous sommes ouvriers avec Dieu.", "1 Corinthiens 3:9"),
    v("Ainsi, mes frères bien-aimés, soyez fermes, inébranlables, travaillez de mieux en mieux à l'œuvre du Seigneur.", "1 Corinthiens 15:58"),
    v("Ne nous lassons pas de faire le bien ; car nous moissonnerons au temps convenable, si nous ne nous relâchons pas.", "Galates 6:9"),
    v("Efforce-toi de te présenter devant Dieu comme un homme éprouvé, un ouvrier qui n'a point à rougir.", "2 Timothée 2:15"),
    v("Dieu n'est pas injuste, pour oublier votre travail et l'amour que vous avez montré pour son nom.", "Hébreux 6:10"),
    v("Deux valent mieux qu'un, parce qu'ils retirent un bon salaire de leur travail.", "Ecclésiaste 4:9"),
    v("Tout ce que vous faites, faites-le de bon cœur, comme pour le Seigneur et non pour des hommes.", "Colossiens 3:23"),
  ],
  services: [
    v("Que tout se fasse avec bienséance et avec ordre.", "1 Corinthiens 14:40"),
    v("Servez l'Éternel avec joie, venez avec allégresse en sa présence !", "Psaume 100:2"),
    v("Venez, prosternons-nous et humilions-nous, fléchissons le genou devant l'Éternel, notre créateur !", "Psaume 95:6"),
    v("Dieu est Esprit, et il faut que ceux qui l'adorent l'adorent en esprit et en vérité.", "Jean 4:24"),
    v("Je suis dans la joie quand on me dit : Allons à la maison de l'Éternel !", "Psaume 122:1"),
    v("Que tout ce qui respire loue l'Éternel ! Louez l'Éternel !", "Psaume 150:6"),
    v("Je bénirai l'Éternel en tout temps ; sa louange sera toujours dans ma bouche.", "Psaume 34:2"),
  ],
  planning: [
    v("Il y a un temps pour tout, un temps pour toute chose sous les cieux.", "Ecclésiaste 3:1"),
    v("Enseigne-nous à bien compter nos jours, afin que nous appliquions notre cœur à la sagesse.", "Psaume 90:12"),
    v("Rachetez le temps, car les jours sont mauvais.", "Éphésiens 5:16"),
    v("Recommande à l'Éternel tes œuvres, et tes projets réussiront.", "Proverbes 16:3"),
    v("Le cœur de l'homme médite sa voie, mais c'est l'Éternel qui dirige ses pas.", "Proverbes 16:9"),
    v("Recommande ton sort à l'Éternel, mets en lui ta confiance, et il agira.", "Psaume 37:5"),
    v("Je connais les projets que j'ai formés sur vous, projets de paix et non de malheur, afin de vous donner un avenir et de l'espérance.", "Jérémie 29:11"),
  ],
  events: [
    v("Que tout se fasse avec bienséance et avec ordre.", "1 Corinthiens 14:40"),
    v("C'est ici la journée que l'Éternel a faite : qu'elle soit pour nous un sujet d'allégresse et de joie !", "Psaume 118:24"),
    v("N'abandonnons pas notre assemblée, comme c'est la coutume de quelques-uns ; mais exhortons-nous réciproquement.", "Hébreux 10:25"),
    v("Voici, qu'il est agréable, qu'il est doux pour des frères de demeurer ensemble !", "Psaume 133:1"),
    v("Le jour de la Pentecôte, ils étaient tous ensemble dans le même lieu.", "Actes 2:1"),
    v("Je suis dans la joie quand on me dit : Allons à la maison de l'Éternel !", "Psaume 122:1"),
    v("Servez l'Éternel avec joie, venez avec allégresse en sa présence !", "Psaume 100:2"),
  ],
  registrations: [
    v("Va dans les chemins et le long des haies, et contrains les gens d'entrer, afin que ma maison soit remplie.", "Luc 14:23"),
    v("Venez, et voyez.", "Jean 1:39"),
    v("Allez donc dans les carrefours, et appelez aux noces tous ceux que vous trouverez.", "Matthieu 22:9"),
    v("Que celui qui a soif vienne ; que celui qui veut prenne de l'eau de la vie, gratuitement.", "Apocalypse 22:17"),
    v("Je suis dans la joie quand on me dit : Allons à la maison de l'Éternel !", "Psaume 122:1"),
    v("Accueillez-vous donc les uns les autres, comme Christ vous a accueillis, pour la gloire de Dieu.", "Romains 15:7"),
    v("Que tout se fasse avec bienséance et avec ordre.", "1 Corinthiens 14:40"),
  ],
  calendar: [
    v("Il y a un temps pour tout, un temps pour toute chose sous les cieux.", "Ecclésiaste 3:1"),
    v("C'est ici la journée que l'Éternel a faite : qu'elle soit pour nous un sujet d'allégresse et de joie !", "Psaume 118:24"),
    v("Enseigne-nous à bien compter nos jours, afin que nous appliquions notre cœur à la sagesse.", "Psaume 90:12"),
    v("Rachetez le temps, car les jours sont mauvais.", "Éphésiens 5:16"),
    v("Mes temps sont dans ta main.", "Psaume 31:16"),
    v("Les bontés de l'Éternel ne sont pas épuisées ; elles se renouvellent chaque matin.", "Lamentations 3:22-23"),
    v("Le cœur de l'homme médite sa voie, mais c'est l'Éternel qui dirige ses pas.", "Proverbes 16:9"),
  ],
  attendance: [
    v("Car là où deux ou trois sont assemblés en mon nom, je suis au milieu d'eux.", "Matthieu 18:20"),
    v("N'abandonnons pas notre assemblée, comme c'est la coutume de quelques-uns.", "Hébreux 10:25"),
    v("Ils persévéraient dans l'enseignement des apôtres, dans la communion fraternelle, dans la fraction du pain, et dans les prières.", "Actes 2:42"),
    v("Chaque jour, ils étaient tous ensemble assidus au temple.", "Actes 2:46"),
    v("Je suis dans la joie quand on me dit : Allons à la maison de l'Éternel !", "Psaume 122:1"),
    v("Je suis le bon berger, je connais mes brebis, et mes brebis me connaissent.", "Jean 10:14"),
    v("Voici, qu'il est agréable, qu'il est doux pour des frères de demeurer ensemble !", "Psaume 133:1"),
  ],
  giving: [
    v("Que chacun donne comme il l'a résolu en son cœur, sans tristesse ni contrainte ; car Dieu aime celui qui donne avec joie.", "2 Corinthiens 9:7"),
    v("Honore l'Éternel avec tes biens, et avec les prémices de tout ton revenu.", "Proverbes 3:9"),
    v("Il y a plus de bonheur à donner qu'à recevoir.", "Actes 20:35"),
    v("Donnez, et il vous sera donné : on versera dans votre sein une bonne mesure, serrée, secouée et qui déborde.", "Luc 6:38"),
    v("L'âme bienfaisante sera rassasiée, et celui qui arrose sera lui-même arrosé.", "Proverbes 11:25"),
    v("Là où est ton trésor, là aussi sera ton cœur.", "Matthieu 6:21"),
    v("Celui qui sème abondamment moissonnera abondamment.", "2 Corinthiens 9:6"),
  ],
  finance: [
    v("Quel est celui d'entre vous qui, voulant bâtir une tour, ne s'assied d'abord pour calculer la dépense et voir s'il a de quoi l'achever ?", "Luc 14:28"),
    v("Celui qui est fidèle dans les moindres choses l'est aussi dans les grandes.", "Luc 16:10"),
    v("Ce qu'on demande des dispensateurs, c'est que chacun soit trouvé fidèle.", "1 Corinthiens 4:2"),
    v("Connais bien l'état de tes brebis, donne tes soins à tes troupeaux.", "Proverbes 27:23"),
    v("Nous recherchons ce qui est bien, non seulement devant le Seigneur, mais aussi devant les hommes.", "2 Corinthiens 8:21"),
    v("Honore l'Éternel avec tes biens, et avec les prémices de tout ton revenu.", "Proverbes 3:9"),
    v("Que tout se fasse avec bienséance et avec ordre.", "1 Corinthiens 14:40"),
  ],
  training: [
    v("Allez, faites de toutes les nations des disciples.", "Matthieu 28:19"),
    v("Ce que tu as entendu de moi en présence de beaucoup de témoins, confie-le à des hommes fidèles, qui soient capables de l'enseigner aussi à d'autres.", "2 Timothée 2:2"),
    v("Croissez dans la grâce et dans la connaissance de notre Seigneur et Sauveur Jésus-Christ.", "2 Pierre 3:18"),
    v("Donne au sage, et il deviendra plus sage ; instruis le juste, et il augmentera son savoir.", "Proverbes 9:9"),
    v("Si vous demeurez dans ma parole, vous êtes vraiment mes disciples.", "Jean 8:31"),
    v("Tout disciple accompli sera comme son maître.", "Luc 6:40"),
    v("Soyez transformés par le renouvellement de l'intelligence.", "Romains 12:2"),
    v("Celui qui a commencé en vous cette bonne œuvre la rendra parfaite pour le jour de Jésus-Christ.", "Philippiens 1:6"),
  ],
  certifications: [
    v("Reste ferme dans ce que tu as appris et dont tu as reconnu la certitude.", "2 Timothée 3:14"),
    v("J'ai combattu le bon combat, j'ai achevé la course, j'ai gardé la foi.", "2 Timothée 4:7"),
    v("Je cours vers le but, pour remporter le prix de la vocation céleste de Dieu en Jésus-Christ.", "Philippiens 3:14"),
    v("Efforce-toi de te présenter devant Dieu comme un homme éprouvé, un ouvrier qui n'a point à rougir.", "2 Timothée 2:15"),
    v("Voici le commencement de la sagesse : acquiers la sagesse, et avec tout ce que tu possèdes acquiers l'intelligence.", "Proverbes 4:7"),
    v("Tout ce que vous faites, faites-le de bon cœur, comme pour le Seigneur et non pour des hommes.", "Colossiens 3:23"),
    v("Cela va bien, bon et fidèle serviteur ; tu as été fidèle en peu de chose, je te confierai beaucoup.", "Matthieu 25:21"),
  ],
  library: [
    v("Ta parole est une lampe à mes pieds, et une lumière sur mon sentier.", "Psaume 119:105"),
    v("Que ce livre de la loi ne s'éloigne pas de ta bouche ; médite-le jour et nuit.", "Josué 1:8"),
    v("Toute Écriture est inspirée de Dieu, et utile pour enseigner, pour convaincre, pour redresser, pour instruire dans la justice.", "2 Timothée 3:16"),
    v("L'Éternel donne la sagesse ; de sa bouche sortent la connaissance et l'intelligence.", "Proverbes 2:6"),
    v("Que la parole de Christ habite parmi vous abondamment.", "Colossiens 3:16"),
    v("Je conserve ta parole dans mon cœur, afin de ne point pécher contre toi.", "Psaume 119:11"),
    v("Un cœur intelligent acquiert la science, et l'oreille des sages cherche la science.", "Proverbes 18:15"),
    v("Ils examinaient chaque jour les Écritures, pour voir si ce qu'on leur disait était exact.", "Actes 17:11"),
  ],
  auth: [
    v("Celui qui a fait la promesse est fidèle.", "Hébreux 10:23"),
    v("Que l'Éternel te bénisse, et qu'il te garde !", "Nombres 6:24"),
    v("Les bontés de l'Éternel ne sont pas épuisées ; elles se renouvellent chaque matin.", "Lamentations 3:22-23"),
    v("Confie-toi en l'Éternel de tout ton cœur, et ne t'appuie pas sur ta sagesse.", "Proverbes 3:5"),
    v("L'Éternel gardera ton départ et ton arrivée, dès maintenant et à jamais.", "Psaume 121:8"),
    v("Venez à moi, vous tous qui êtes fatigués et chargés, et je vous donnerai du repos.", "Matthieu 11:28"),
    v("Je puis tout par celui qui me fortifie.", "Philippiens 4:13"),
  ],
  onboarding: [
    v("Tout est possible à celui qui croit.", "Marc 9:23"),
    v("Si l'Éternel ne bâtit la maison, ceux qui la bâtissent travaillent en vain.", "Psaume 127:1"),
    v("Je bâtirai mon Église, et les portes du séjour des morts ne prévaudront point contre elle.", "Matthieu 16:18"),
    v("La gloire de cette dernière maison sera plus grande que celle de la première.", "Aggée 2:9"),
    v("Ce n'est ni par la puissance, ni par la force, mais c'est par mon esprit, dit l'Éternel des armées.", "Zacharie 4:6"),
    v("Recommande à l'Éternel tes œuvres, et tes projets réussiront.", "Proverbes 16:3"),
    v("Celui qui a commencé en vous cette bonne œuvre la rendra parfaite pour le jour de Jésus-Christ.", "Philippiens 1:6"),
  ],
} satisfies Record<string, Verse[]>;

export type VerseContext = keyof typeof VERSE_POOLS;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Décalage stable propre à chaque contexte : deux pages différentes ne tournent pas en phase. */
function contextOffset(context: string) {
  let hash = 0;
  for (const char of context) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash;
}

/**
 * Verset du jour pour un contexte de page. `slot` permet d'afficher un second verset différent sur la
 * même page (ex. une carte latérale) : il décale simplement l'index dans la même liste thématique.
 */
export function getDailyVerse(context: VerseContext, slot = 0, now: Date = new Date()): Verse {
  const pool: Verse[] = VERSE_POOLS[context];
  const dayNumber = Math.floor(now.getTime() / DAY_MS);
  return pool[(dayNumber + contextOffset(context) + slot) % pool.length]!;
}

/**
 * Keep imported Conversation articles to serious hard-science / CS research.
 * Rejects lifestyle, political commentary, and casual pop writing that still
 * appears on broad "Science + Tech" and even some topic feeds.
 */

const BLOCK_PATTERNS: RegExp[] = [
  // Personal / lifestyle / relationships
  /\b(boyfriend|girlfriend|dating|flirt|romance|romantic|cheating|lonely|loneliness)\b/i,
  /\bai (boyfriend|girlfriend|companion|partner|lover)\b/i,
  /\b(replika|character\.ai|nomi ai)\b/i,
  /\b(why do (i|my)|baby brain|too pretty|vivid dreams)\b/i,
  /\b(holiday traffic|lotto|world cup|football|tennis player's brain)\b/i,
  /\b(poetry|oscars?|mainstream films|gentrification)\b/i,
  /\b(people skills|hiring decisions|classroom)\b/i,
  /\b(choosing your senior|stream['’]? school students)\b/i,
  /\bfingers go wrinkly\b/i,
  /\b(writerly|everyday skill|moral questions|for all of humanity)\b/i,
  /\b(butter or margarine|baked goods)\b/i,
  /\b(ai prompting|prompting turned)\b/i,
  /\b(graphic violence|gore online|teens have seen)\b/i,
  /\b(ice['’]s tech|surveillance expand|activists are fighting)\b/i,
  /\b(older people want a say|wherever ai is heading)\b/i,
  /\b(héritage pour la sécurité|découpage technologique|esquiver la régulation)\b/i,

  // Politics / policy / geopolitics (not science of natural disasters)
  /\b(trump|harris|election|campaign|parliament|congress|senator|legislation)\b/i,
  /\b(geopolitic|foreign policy|government is controlling)\b/i,
  /\b(ai safety['’]? priorities|policing ai in the classroom)\b/i,
  /\b(digital transformation could be a blueprint)\b/i,

  // Soft / casual framing that is not research communication
  /\bi created an\b/i,
  /\bif you flirt\b/i,

  // French casual / lifestyle / sports / tourism
  /\b(vacances|penalty|gardiens|mandalorian|respiration nous permet)\b/i,
  /\b(pompiers au piège|feintes|organiser nos)\b/i,
  /\bà quoi servent les grosses boules\b/i,
  /\b(qu['’\u2019]en dit le droit|ni écologiques, ni économes)\b/i,
]

const HARD_SCIENCE_SIGNALS: RegExp[] = [
  // Physics / astronomy / cosmology
  /\b(quantum|physics|physicist|spacetime|relativity|neutrino|boson|fermion|photon|laser)\b/i,
  /\b(black hole|dark (matter|energy)|galaxy|galaxies|supernova|neutron star|pulsar)\b/i,
  /\b(telescope|astronom\w*|astrophysic\w*|cosmolog\w*|exoplanet|solar (flare|system|wind)|orbit)\b/i,
  /\b(particle|hadron|collider|entanglement|superconduct|magnetism|gravity)\b/i,

  // Chemistry / materials
  /\b(chemist|chemical|molecule|molecular|atom|atomic|periodic table|element)\b/i,
  /\b(nanoparticle|nanotech|nanomaterial|catalyst|polymer|crystal|semiconductor)\b/i,
  /\b(materials? science|graphene|alloy|isotope|reaction kinetics)\b/i,

  // Biology / life sciences (research, not lifestyle health tips)
  /\b(genome|genomic|dna|rna|protein|enzyme|cell(ular)?|microscop|cloning)\b/i,
  /\b(molecular biology|synthetic (life|biology)|immune cell|antibiotics?|pathogen)\b/i,
  /\b(evolution|natural selection|organism|species|ecology|fossils?)\b/i,

  // Earth science
  /\b(geolog|tectonic|magma|mantle|crater|seismic|earthquake|mineral|sediment)\b/i,
  /\b(climate model|oceanograph|atmosphere|glaci|paleoclim|permafrost)\b/i,

  // Mathematics
  /\b(mathematic|mathematics|theorem|conjecture|prime numbers?|jacobian|geometry|topology|algebra)\b/i,
  /\b(equation|proof|number theory|combinator|statistic(al)? model)\b/i,

  // Computer science / serious AI research
  /\b(computer science|algorithm|computational|simulation|compiler|cryptograph)\b/i,
  /\b(machine learning|neural networks?|deep learning|large language models?|llms?)\b/i,
  /\b(quantum comput|software|data structure|distributed system|cybersecurity)\b/i,
  /\b(programming|informatics|artificial intelligence|reinforcement learning)\b/i,
  /\b(satellite collisions?|data centres?|data centers?)\b/i,

  // Engineering (hard technical)
  /\b(engineering|aerospace|nanotechnology|sensor|optics|fiber optic)\b/i,
  /\b(spacecraft|rocket|propulsion|structural|bridge)\b/i,

  // French hard-science signals
  /\b(physique|quantique|astronom|astrophys|cosmolog|trou noir|matière noire|énergie sombre)\b/i,
  /\b(chim(ie|ique)|molécul|atome|périodique|nanotech|nanomatériau|catalyse)\b/i,
  /\b(génome|protéine|enzyme|cellule|microscop|évolution|fossile|bactéri)\b/i,
  /\b(géolog|tectonique|séismes?|volcans?|minéral|manteau|cratère|stratosphère)\b/i,
  /\b(mathémat|théorème|conjecture|algorithme|informatique|intelligence artificielle)\b/i,
  /\b(muon|muons|comète|comètes|satellite|métaux précieux|synapses?|système nerveux|rayons? n)\b/i,
  /\b(constellations? de satellites|centres? de données|recycle(r)? les métaux)\b/i,
  /\b(astronomes?|astrophysicien|extraterrestres?|microfossiles?)\b/i,
]

export function isHardScienceArticle(title: string, excerpt = ''): boolean {
  const text = `${title}\n${excerpt}`.trim()
  if (!text) return false

  if (BLOCK_PATTERNS.some((pattern) => pattern.test(text))) {
    return false
  }

  return HARD_SCIENCE_SIGNALS.some((pattern) => pattern.test(text))
}

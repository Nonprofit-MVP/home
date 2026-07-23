import type { Author } from '@/types'

export type CanadianUniversity = {
  id: string
  name: string
  shortName: string
  domain: string
  patterns: RegExp[]
}

/** Major Canadian universities matched from Conversation author institution strings. */
export const CANADIAN_UNIVERSITIES: CanadianUniversity[] = [
  {
    id: 'toronto',
    name: 'University of Toronto',
    shortName: 'U of T',
    domain: 'utoronto.ca',
    patterns: [/university of toronto/i, /\bu of t\b/i, /\butoronto\b/i],
  },
  {
    id: 'ubc',
    name: 'University of British Columbia',
    shortName: 'UBC',
    domain: 'ubc.ca',
    patterns: [/university of british columbia/i, /\bubc\b/i],
  },
  {
    id: 'waterloo',
    name: 'University of Waterloo',
    shortName: 'Waterloo',
    domain: 'uwaterloo.ca',
    patterns: [/university of waterloo/i, /\buwaterloo\b/i],
  },
  {
    id: 'mcgill',
    name: 'McGill University',
    shortName: 'McGill',
    domain: 'mcgill.ca',
    patterns: [/mcgill university/i, /\bmcgill\b/i],
  },
  {
    id: 'mcmaster',
    name: 'McMaster University',
    shortName: 'McMaster',
    domain: 'mcmaster.ca',
    patterns: [/mcmaster university/i, /\bmcmaster\b/i],
  },
  {
    id: 'alberta',
    name: 'University of Alberta',
    shortName: 'UAlberta',
    domain: 'ualberta.ca',
    patterns: [/university of alberta/i, /\bualberta\b/i],
  },
  {
    id: 'calgary',
    name: 'University of Calgary',
    shortName: 'UCalgary',
    domain: 'ucalgary.ca',
    patterns: [/university of calgary/i, /\bucalgary\b/i],
  },
  {
    id: 'ottawa',
    name: 'University of Ottawa',
    shortName: 'uOttawa',
    domain: 'uottawa.ca',
    patterns: [/university of ottawa/i, /université d['’]ottawa/i, /\buottawa\b/i],
  },
  {
    id: 'queens',
    name: "Queen's University",
    shortName: "Queen's",
    domain: 'queensu.ca',
    patterns: [/queen['’]?s university/i, /\bqueensu\b/i],
  },
  {
    id: 'western',
    name: 'Western University',
    shortName: 'Western',
    domain: 'uwo.ca',
    patterns: [/western university/i, /university of western ontario/i, /\buwo\b/i],
  },
  {
    id: 'victoria',
    name: 'University of Victoria',
    shortName: 'UVic',
    domain: 'uvic.ca',
    patterns: [/university of victoria/i, /\buvic\b/i],
  },
  {
    id: 'regina',
    name: 'University of Regina',
    shortName: 'URegina',
    domain: 'uregina.ca',
    patterns: [/university of regina/i, /\buregina\b/i],
  },
  {
    id: 'sfu',
    name: 'Simon Fraser University',
    shortName: 'SFU',
    domain: 'sfu.ca',
    patterns: [/simon fraser university/i, /\bsfu\b/i],
  },
  {
    id: 'york',
    name: 'York University',
    shortName: 'York',
    domain: 'yorku.ca',
    patterns: [/york university/i, /\byorku\b/i],
  },
  {
    id: 'carleton',
    name: 'Carleton University',
    shortName: 'Carleton',
    domain: 'carleton.ca',
    patterns: [/carleton university/i, /\bcarleton\b/i],
  },
  {
    id: 'dalhousie',
    name: 'Dalhousie University',
    shortName: 'Dal',
    domain: 'dal.ca',
    patterns: [/dalhousie university/i, /\bdalhousie\b/i],
  },
  {
    id: 'montreal',
    name: 'Université de Montréal',
    shortName: 'UdeM',
    domain: 'umontreal.ca',
    patterns: [/université de montréal/i, /universite de montreal/i, /\bumontreal\b/i],
  },
  {
    id: 'laval',
    name: 'Université Laval',
    shortName: 'Laval',
    domain: 'ulaval.ca',
    patterns: [/université laval/i, /universite laval/i, /\bulaval\b/i],
  },
  {
    id: 'concordia',
    name: 'Concordia University',
    shortName: 'Concordia',
    domain: 'concordia.ca',
    patterns: [/concordia university/i, /\bconcordia\b/i],
  },
  {
    id: 'ryerson',
    name: 'Toronto Metropolitan University',
    shortName: 'TMU',
    domain: 'torontomu.ca',
    patterns: [/toronto metropolitan university/i, /ryerson university/i, /\btmu\b/i],
  },
]

export function universityLogoUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`
}

export function matchCanadianUniversity(institution: string): CanadianUniversity | null {
  const text = institution.trim()
  if (!text) return null
  for (const uni of CANADIAN_UNIVERSITIES) {
    if (uni.patterns.some((pattern) => pattern.test(text))) return uni
  }
  return null
}

export function canadianUniversitiesFromAuthors(authors: Author[]): CanadianUniversity[] {
  const seen = new Set<string>()
  const matched: CanadianUniversity[] = []

  for (const author of authors) {
    const institution = author.institution?.trim()
    if (!institution) continue
    const uni = matchCanadianUniversity(institution)
    if (!uni || seen.has(uni.id)) continue
    seen.add(uni.id)
    matched.push(uni)
  }

  return matched
}

import type { Author } from '@/types'

export type CanadianUniversity = {
  id: string
  name: string
  shortName: string
  patterns: RegExp[]
}

function uni(
  id: string,
  name: string,
  shortName: string,
  patterns: RegExp[]
): CanadianUniversity {
  return { id, name, shortName, patterns }
}

/** Major Canadian universities matched from Conversation author institution strings. */
export const CANADIAN_UNIVERSITIES: CanadianUniversity[] = [
  uni('mcmaster', 'McMaster University', 'McMaster', [
    /mcmaster university/i,
    /\bmcmaster\b/i,
  ]),
  uni('toronto', 'University of Toronto', 'U of T', [
    /university of toronto/i,
    /\bu of t\b/i,
    /\butoronto\b/i,
  ]),
  uni('tmu', 'Toronto Metropolitan University', 'TMU', [
    /toronto metropolitan university/i,
    /ryerson university/i,
    /\btmu\b/i,
  ]),
  uni('ubc', 'University of British Columbia', 'UBC', [
    /university of british columbia/i,
    /\bubc\b/i,
  ]),
  uni('waterloo', 'University of Waterloo', 'Waterloo', [
    /university of waterloo/i,
    /\buwaterloo\b/i,
  ]),
  uni('wlu', 'Wilfrid Laurier University', 'Laurier', [
    /wilfrid laurier university/i,
    /\blauri?er university\b/i,
    /\bwlu\b/i,
  ]),
  uni('mcgill', 'McGill University', 'McGill', [
    /mcgill university/i,
    /\bmcgill\b/i,
  ]),
  uni('alberta', 'University of Alberta', 'UAlberta', [
    /university of alberta/i,
    /\bualberta\b/i,
  ]),
  uni('calgary', 'University of Calgary', 'UCalgary', [
    /university of calgary/i,
    /\bucalgary\b/i,
  ]),
  uni('ottawa', 'University of Ottawa', 'uOttawa', [
    /university of ottawa/i,
    /université d['’]ottawa/i,
    /universite d['’]?ottawa/i,
    /\buottawa\b/i,
  ]),
  uni('queens', "Queen's University", "Queen's", [
    /queen['’]?s university/i,
    /\bqueensu\b/i,
  ]),
  uni('western', 'Western University', 'Western', [
    /western university/i,
    /university of western ontario/i,
    /\buwo\b/i,
  ]),
  uni('victoria', 'University of Victoria', 'UVic', [
    /university of victoria/i,
    /\buvic\b/i,
  ]),
  uni('regina', 'University of Regina', 'URegina', [
    /university of regina/i,
    /\buregina\b/i,
  ]),
  uni('sfu', 'Simon Fraser University', 'SFU', [
    /simon fraser university/i,
    /\bsfu\b/i,
  ]),
  uni('york', 'York University', 'York', [
    /york university/i,
    /\byorku\b/i,
  ]),
  uni('carleton', 'Carleton University', 'Carleton', [
    /carleton university/i,
    /\bcarleton\b/i,
  ]),
  uni('dalhousie', 'Dalhousie University', 'Dalhousie', [
    /dalhousie university/i,
    /\bdalhousie\b/i,
  ]),
  uni('montreal', 'Université de Montréal', 'UdeM', [
    /université de montréal/i,
    /universite de montreal/i,
    /\bumontreal\b/i,
    /\budem\b/i,
  ]),
  uni('laval', 'Université Laval', 'Laval', [
    /université laval/i,
    /universite laval/i,
    /\bulaval\b/i,
  ]),
  uni('concordia', 'Concordia University', 'Concordia', [
    /concordia university/i,
    /\bconcordia\b/i,
  ]),
  uni('manitoba', 'University of Manitoba', 'UManitoba', [
    /university of manitoba/i,
    /\bumanitoba\b/i,
  ]),
  uni('saskatchewan', 'University of Saskatchewan', 'USask', [
    /university of saskatchewan/i,
    /\busask\b/i,
  ]),
  uni('guelph', 'University of Guelph', 'UGuelph', [
    /university of guelph/i,
    /\buguelph\b/i,
  ]),
  uni('sherbrooke', 'Université de Sherbrooke', 'UdeS', [
    /université de sherbrooke/i,
    /universite de sherbrooke/i,
    /\budes\b/i,
  ]),
  uni('uqam', 'Université du Québec à Montréal', 'UQAM', [
    /université du québec à montréal/i,
    /universite du quebec a montreal/i,
    /\buqam\b/i,
  ]),
  uni('memorial', 'Memorial University', 'Memorial', [
    /memorial university/i,
    /\bmun\b/i,
  ]),
  uni('unb', 'University of New Brunswick', 'UNB', [
    /university of new brunswick/i,
    /\bunb\b/i,
  ]),
  uni('lakehead', 'Lakehead University', 'Lakehead', [
    /lakehead university/i,
    /\blakehead\b/i,
  ]),
  uni('trent', 'Trent University', 'Trent', [
    /trent university/i,
    /\btrentu\b/i,
  ]),
  uni('brock', 'Brock University', 'Brock', [
    /brock university/i,
    /\bbrock\b/i,
  ]),
  uni('nipissing', 'Nipissing University', 'Nipissing', [
    /nipissing university/i,
    /\bnipissing\b/i,
  ]),
]

export function matchCanadianUniversity(institution: string): CanadianUniversity | null {
  const text = institution.trim()
  if (!text) return null
  for (const uni of CANADIAN_UNIVERSITIES) {
    if (uni.patterns.some((pattern) => pattern.test(text))) return uni
  }
  return null
}

export type AuthorWithUniversity = {
  author: Author
  university: CanadianUniversity | null
}

export function authorsWithUniversities(authors: Author[]): AuthorWithUniversity[] {
  return authors.map((author) => ({
    author,
    university: author.institution
      ? matchCanadianUniversity(author.institution)
      : null,
  }))
}

function authorWithUniLabel({ author, university }: AuthorWithUniversity): string {
  if (university) return `${author.name} (${university.name})`
  return author.name
}

/** e.g. "Jane Doe (McMaster University) & John Smith (University of Waterloo)" */
export function formatAuthorsWithUniversities(authors: Author[]): string {
  const list = authorsWithUniversities(authors)
  if (list.length === 0) return 'Unknown'
  if (list.length === 1) return authorWithUniLabel(list[0])
  if (list.length === 2) {
    return `${authorWithUniLabel(list[0])} & ${authorWithUniLabel(list[1])}`
  }
  return `${authorWithUniLabel(list[0])} et al.`
}

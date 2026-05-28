// ─── Local NL parser for "add family member" input ────────────────────────────
// No AI required — pure regex + heuristics.
// Usage: parseMember("Lila, she's 8, goes to Cedar Crest Academy grade 3")
// Returns: { name, role, age?, school?, grade?, notes }

export type ParsedMemberRole = 'parent' | 'child' | 'caregiver'

export interface ParsedMember {
  name: string
  role: ParsedMemberRole
  age: number | null
  school: string | null
  grade: string | null
  notes: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractName(text: string): string {
  // Try "Name is/," pattern first
  const comma = text.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*[,.]/)
  if (comma) return comma[1].trim()

  // Try "This is Name" or "Meet Name"
  const intro = text.match(/(?:this is|meet|adding|add)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i)
  if (intro) return intro[1].trim()

  // First capitalized word(s)
  const cap = text.match(/^[^A-Z]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/)
  return cap ? cap[1].trim() : text.split(' ')[0]
}

function extractAge(text: string): number | null {
  const m = text.match(/\b(\d{1,2})\s*(?:years?\s*old|yo|yr)/i)
  if (m) return parseInt(m[1], 10)
  // "age 8" or "aged 8"
  const m2 = text.match(/\bage[d]?\s+(\d{1,2})\b/i)
  if (m2) return parseInt(m2[1], 10)
  return null
}

function extractRole(text: string, age: number | null): ParsedMemberRole {
  const t = text.toLowerCase()
  if (/\b(mom|dad|mother|father|parent|guardian)\b/.test(t)) return 'parent'
  if (/\b(babysitter|nanny|caregiver|au pair|sitter)\b/.test(t)) return 'caregiver'
  if (/\b(son|daughter|kid|child|baby|toddler|teen|boy|girl)\b/.test(t)) return 'child'
  if (/\b(brother|sister|sibling)\b/.test(t)) return 'child'
  // Age < 18 implies child
  if (age !== null && age < 18) return 'child'
  return 'parent'
}

function extractSchool(text: string): string | null {
  // "goes to X" / "attends X" / "at X School/Academy/Elementary"
  const m = text.match(/(?:goes?\s+to|attends?|at)\s+([A-Z][^,.\n]+?(?:School|Academy|Elementary|Middle|High|College|University|Preschool))/i)
  if (m) return m[1].trim()
  // Fallback: any "X School/Academy"
  const m2 = text.match(/([A-Z][A-Za-z\s]+(?:School|Academy|Elementary|Middle|High|Preschool))/i)
  if (m2) return m2[1].trim()
  return null
}

function extractGrade(text: string): string | null {
  const m = text.match(/\b(grade\s*\d+|kindergarten|k-?\d?|[1-9]\d?(?:st|nd|rd|th)\s*grade|year\s*\d+)/i)
  return m ? m[1].trim() : null
}

// ── Main export ──────────────────────────────────────────────────────────────

export function parseMember(input: string): ParsedMember {
  const text = input.trim()
  const name  = extractName(text)
  const age   = extractAge(text)
  const role  = extractRole(text, age)
  const school = role === 'child' ? extractSchool(text) : null
  const grade  = role === 'child' ? extractGrade(text)  : null

  // Notes: anything left after removing matched fragments
  const notes = text

  return { name, role, age, school, grade, notes }
}

// ── Format confirmation string ─────────────────────────────────────────────

export function memberConfirmText(p: ParsedMember): string {
  const parts: string[] = [`${p.name} · ${p.role}`]
  if (p.age)    parts.push(`age ${p.age}`)
  if (p.school) parts.push(p.school)
  if (p.grade)  parts.push(p.grade)
  return parts.join(' · ')
}

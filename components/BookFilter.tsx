'use client'

export function bookOptions(names: Iterable<string>): string[] {
  return Array.from(new Set(Array.from(names).filter(Boolean))).sort((a, b) => a.localeCompare(b))
}

interface Props {
  value: string
  books: string[]
  onChange: (book: string) => void
}

export default function BookFilter({ value, books, onChange }: Props) {
  return (
    <select
      aria-label="Book"
      value={value}
      onChange={e => onChange(e.target.value)}
      className="flex-1 sm:flex-none min-h-[44px] bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
    >
      <option value="all">All books</option>
      {books.map(book => (
        <option key={book} value={book}>{book}</option>
      ))}
    </select>
  )
}

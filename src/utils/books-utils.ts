import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface Book {
  id: string
  title: string
  author: string
  genre: string
  created_at: string
  updated_at: string
  total_pages: number | null
}

export interface DocumentChunk {
  id: string
  book_id: string
  content: string
  page_start: number
  page_end: number
  chunk_index: number
  embedding: number[] | null
  metadata: any
  created_at: string
}

/**
 * Get all books by a specific genre
 * @param genre The genre to filter by
 * @param limit Optional limit for number of books returned
 * @returns Promise<Book[]> Array of books in the specified genre
 */
export async function getBooksByGenre(genre: string, limit?: number): Promise<Book[]> {
  try {
    let query = supabase
      .from('books')
      .select('*')
      .eq('genre', genre)
      .order('created_at', { ascending: false })

    if (limit) {
      query = query.limit(limit)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching books by genre:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching books by genre:', error)
    return []
  }
}

/**
 * Search books by title or author
 * @param searchTerm The search term to look for
 * @param genre Optional genre filter
 * @param limit Optional limit for number of results
 * @returns Promise<Book[]> Array of matching books
 */
export async function searchBooks(
  searchTerm: string, 
  genre?: string, 
  limit: number = 50
): Promise<Book[]> {
  try {
    let query = supabase
      .from('books')
      .select('*')
      .or(`title.ilike.%${searchTerm}%,author.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (genre) {
      query = query.eq('genre', genre)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error searching books:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error searching books:', error)
    return []
  }
}

/**
 * Get document chunks for a specific book
 * @param bookId The ID of the book
 * @param pageRange Optional page range filter {start: number, end: number}
 * @returns Promise<DocumentChunk[]> Array of document chunks
 */
export async function getBookChunks(
  bookId: string,
  pageRange?: { start: number; end: number }
): Promise<DocumentChunk[]> {
  try {
    let query = supabase
      .from('document_chunks')
      .select('*')
      .eq('book_id', bookId)
      .order('chunk_index', { ascending: true })

    if (pageRange) {
      query = query
        .gte('page_start', pageRange.start)
        .lte('page_end', pageRange.end)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching book chunks:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching book chunks:', error)
    return []
  }
}

/**
 * Get a single book by ID with its chunks
 * @param bookId The ID of the book
 * @returns Promise<{book: Book | null, chunks: DocumentChunk[]}> Book with chunks
 */
export async function getBookWithChunks(bookId: string): Promise<{
  book: Book | null
  chunks: DocumentChunk[]
}> {
  try {
    // Get the book
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('*')
      .eq('id', bookId)
      .single()

    if (bookError) {
      console.error('Error fetching book:', bookError)
      return { book: null, chunks: [] }
    }

    // Get the chunks
    const chunks = await getBookChunks(bookId)

    return { book, chunks }
  } catch (error) {
    console.error('Error fetching book with chunks:', error)
    return { book: null, chunks: [] }
  }
}

/**
 * Get statistics about books in the database
 * @returns Promise<{totalBooks: number, genreStats: {genre: string, count: number}[]}> Database statistics
 */
export async function getBooksStatistics(): Promise<{
  totalBooks: number
  genreStats: { genre: string; count: number }[]
}> {
  try {
    // Get total count
    const { count: totalBooks } = await supabase
      .from('books')
      .select('*', { count: 'exact', head: true })

    // Get genre statistics
    const { data: genreData, error } = await supabase
      .from('books')
      .select('genre')

    if (error) {
      console.error('Error fetching genre statistics:', error)
      return { totalBooks: totalBooks || 0, genreStats: [] }
    }

    // Count genres
    const genreCounts: { [key: string]: number } = {}
    genreData?.forEach(item => {
      genreCounts[item.genre] = (genreCounts[item.genre] || 0) + 1
    })

    const genreStats = Object.entries(genreCounts)
      .map(([genre, count]) => ({ genre, count }))
      .sort((a, b) => b.count - a.count)

    return {
      totalBooks: totalBooks || 0,
      genreStats
    }
  } catch (error) {
    console.error('Error fetching books statistics:', error)
    return { totalBooks: 0, genreStats: [] }
  }
}

/**
 * Search document chunks by content
 * @param searchTerm The text to search for in chunk content
 * @param genre Optional genre filter
 * @param limit Optional limit for number of results
 * @returns Promise<(DocumentChunk & {book: Book})[]> Array of chunks with book info
 */
export async function searchDocumentChunks(
  searchTerm: string,
  genre?: string,
  limit: number = 20
): Promise<(DocumentChunk & { book: Book })[]> {
  try {
    let query = supabase
      .from('document_chunks')
      .select(`
        *,
        book:books(*)
      `)
      .textSearch('content', searchTerm)
      .order('chunk_index', { ascending: true })
      .limit(limit)

    const { data, error } = await query

    if (error) {
      console.error('Error searching document chunks:', error)
      return []
    }

    // Filter by genre if specified
    let results = data || []
    if (genre) {
      results = results.filter((chunk: any) => chunk.book?.genre === genre)
    }

    return results as (DocumentChunk & { book: Book })[]
  } catch (error) {
    console.error('Error searching document chunks:', error)
    return []
  }
}

/**
 * Get recent books (useful for displaying recently added books)
 * @param limit Number of recent books to fetch
 * @param genre Optional genre filter
 * @returns Promise<Book[]> Array of recent books
 */
export async function getRecentBooks(limit: number = 10, genre?: string): Promise<Book[]> {
  try {
    let query = supabase
      .from('books')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (genre) {
      query = query.eq('genre', genre)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching recent books:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching recent books:', error)
    return []
  }
}
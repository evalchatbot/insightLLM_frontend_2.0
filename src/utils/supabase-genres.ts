import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
/**
 * Fetch enum values from the database using SQL function
 * @returns Promise<string[]> Array of enum genre values
 */
export async function fetchGenres(): Promise<string[]> {
  try {
    console.log('Fetching genre enum values from database...')
    
    // First, try using the custom SQL function (you need to create this in Supabase)
    const { data, error } = await supabase.rpc('get_genre_enum_values')
    
    if (!error && data) {
      console.log('Successfully fetched enum values:', data)
      return Array.isArray(data) ? data : [data]
    }
    
    console.log('Custom function failed, trying alternative approach:', error)
    
    // Alternative: Try the simpler function
    const { data: simpleData, error: simpleError } = await supabase.rpc('get_genre_enum_values_simple')
    
    if (!simpleError && simpleData) {
      console.log('Successfully fetched enum values with simple function:', simpleData)
      return Array.isArray(simpleData) ? simpleData : [simpleData]
    }
    
    console.log('Simple function also failed:', simpleError)
    
    // If functions don't exist, provide instructions and use fallback
    console.error('❌ SQL functions not found. Please create the SQL functions first.')
    console.log('📝 Instructions:')
    console.log('1. Go to Supabase Dashboard → SQL Editor')
    console.log('2. Run the SQL from SUPABASE_ENUM_FUNCTION.sql file')
    console.log('3. Refresh the app')
    
    // Temporary fallback while user creates the functions
    throw new Error('SQL functions not created yet. Please check console for instructions.')
    
  } catch (error) {
    console.error('Error fetching genres:', error)
    
    // Show helpful error message
    console.log('🔧 To fix this:')
    console.log('1. Create the SQL functions in Supabase (see SUPABASE_ENUM_FUNCTION.sql)')
    console.log('2. Or check your genre_type enum definition')
    console.log('3. Make sure there are no empty strings in your books.genre column')
    
    throw error
  }
}

/**
 * Get books count by genre (optional utility function)
 * @param genre Genre name to count books for
 * @returns Promise<number> Number of books in that genre
 */
export async function getBooksCountByGenre(genre: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('books')
      .select('*', { count: 'exact', head: true })
      .eq('genre', genre)

    if (error) {
      console.error('Error counting books by genre:', error)
      return 0
    }

    return count || 0
  } catch (error) {
    console.error('Error counting books by genre:', error)
    return 0
  }
}
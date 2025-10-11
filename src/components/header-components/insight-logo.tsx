'use client'
import { FaCaretDown, FaRegCheckCircle } from "react-icons/fa";
import { FaBook, FaBrain } from "react-icons/fa";
import DevButton from "../dev-components/dev-button";
import DevPopover from "../dev-components/dev-popover";
import { useEffect } from "react";
import insightZustand from "@/utils/insight-zustand";
import { fetchGenres } from "@/utils/supabase-genres";

const InsightLogo = () => {
  const { selectedGenre, setSelectedGenre, availableGenres, setAvailableGenres } = insightZustand();

  // Load genres on component mount
  useEffect(() => {
    const loadGenres = async () => {
      try {
        const genres = await fetchGenres();
        setAvailableGenres(genres);
        
        // Set default genre if not already set
        if (!selectedGenre || selectedGenre === 'General') {
          setSelectedGenre(genres[0] || 'General');
        }
      } catch (error) {
        console.error('Failed to load genres:', error);
        
        // Show helpful error message
        console.log('🔧 To fix the genre loading issue:');
        console.log('1. Go to Supabase Dashboard → SQL Editor');
        console.log('2. Run the SQL from SUPABASE_ENUM_FUNCTION.sql file');
        console.log('3. Refresh the app');
        
        // For now, show a message in the UI
        setAvailableGenres(['Setup Required']);
        setSelectedGenre('Setup Required');
      }
    };

    // Only load if we haven't loaded genres yet
    if (availableGenres.length === 0) {
      loadGenres();
    }
  }, [setAvailableGenres, setSelectedGenre, selectedGenre, availableGenres.length]);

  const handleGenreSelect = (genre: string) => {
    setSelectedGenre(genre);
  };

  return (
    <DevPopover
      popButton={
        <DevButton size="sm" rounded="sm" className="text-lg gap-2">
          {selectedGenre || 'Select Genre'}
          <FaCaretDown />
        </DevButton>
      }
    >
      <div className="py-2 max-h-64 overflow-y-auto">
        <div className="px-3 py-2 text-sm font-medium text-muted-foreground border-b border-border">
          Select Book Genre
        </div>
        {availableGenres.length > 0 ? (
          availableGenres.map((genre, index) => (
            <DevButton
              key={genre}
              variant="v3"
              onClick={() => handleGenreSelect(genre)}
              className="w-full !justify-between gap-3 group hover:bg-accent"
              rounded="none"
            >
              <span className="flex items-center gap-2">
                <FaBook className="text-lg text-[#4E82EE]" />
                {genre}
              </span>
              {selectedGenre === genre && (
                <FaRegCheckCircle className="text-xl text-green-500" />
              )}
            </DevButton>
          ))
        ) : (
          <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
            Loading genres...
          </div>
        )}
      </div>
    </DevPopover>
  );
  };

  export default InsightLogo
  

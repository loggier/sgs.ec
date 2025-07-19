
'use client';

import * as React from 'react';

type SearchContextType = {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
};

const SearchContext = React.createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [searchTerm, setSearchTerm] = React.useState('');

  const value = {
    searchTerm,
    setSearchTerm,
  };

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearch() {
  const context = React.useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}

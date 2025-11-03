import React, { createContext, useContext } from 'react';

export const SearchContext = createContext();

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    return { searchQuery: '', setSearchQuery: () => {} };
  }
  return context;
};


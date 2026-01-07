import React, { createContext, useContext, useState, useEffect } from 'react';

const BrandContext = createContext();

export const useBrand = () => {
  const context = useContext(BrandContext);
  if (!context) {
    throw new Error('useBrand must be used within a BrandProvider');
  }
  return context;
};

export const BrandProvider = ({ children }) => {
  const [selectedBrand, setSelectedBrandState] = useState(() => {
    // Initialize from localStorage
    try {
      const storedBrand = localStorage.getItem('selectedBrand');
      return storedBrand ? JSON.parse(storedBrand) : null;
    } catch (e) {
      console.error('Error parsing stored brand:', e);
      return null;
    }
  });

  // Sync with URL params on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlBrandId = urlParams.get('brandId');
    const storedBrand = localStorage.getItem('selectedBrand');

    if (urlBrandId) {
      try {
        const brand = storedBrand ? JSON.parse(storedBrand) : null;
        if (brand && brand.id === urlBrandId) {
          setSelectedBrandState(brand);
        }
      } catch (e) {
        console.error('Error parsing stored brand:', e);
      }
    }
  }, []);

  const setSelectedBrand = (brand) => {
    setSelectedBrandState(brand);
    if (brand) {
      localStorage.setItem('selectedBrand', JSON.stringify(brand));
      // Update URL params without using navigate
      const url = new URL(window.location);
      url.searchParams.set('brandId', brand.id);
      window.history.replaceState({}, '', url);
    } else {
      localStorage.removeItem('selectedBrand');
      // Remove brandId from URL
      const url = new URL(window.location);
      url.searchParams.delete('brandId');
      window.history.replaceState({}, '', url);
    }
  };

  const clearBrand = () => {
    setSelectedBrandState(null);
    localStorage.removeItem('selectedBrand');
    // Remove brandId from URL
    const url = new URL(window.location);
    url.searchParams.delete('brandId');
    window.history.replaceState({}, '', url);
    // Navigation will be handled by components that use this function
  };

  const getSelectedBrand = () => {
    return selectedBrand;
  };

  const value = {
    selectedBrand,
    setSelectedBrand,
    clearBrand,
    getSelectedBrand
  };

  return (
    <BrandContext.Provider value={value}>
      {children}
    </BrandContext.Provider>
  );
};

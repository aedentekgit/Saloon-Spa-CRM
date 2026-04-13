import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface Category {
  _id: string;
  name: string;
  type: 'room' | 'inventory' | 'service';
  description?: string;
  isActive: boolean;
}

interface CategoryContextType {
  categories: Category[];
  loading: boolean;
  fetchCategories: (type?: string) => Promise<void>;
  createCategory: (data: Partial<Category>) => Promise<boolean>;
  updateCategory: (id: string, data: Partial<Category>) => Promise<boolean>;
  deleteCategory: (id: string) => Promise<boolean>;
  getRoomCategories: () => string[];
  getInventoryCategories: () => string[];
  getServiceCategories: () => string[];
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

export const CategoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5100/api';

  const fetchCategories = async (type?: string) => {
    setLoading(true);
    try {
      const url = type ? `${API_URL}/categories?type=${type}` : `${API_URL}/categories`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setCategories(type ? (prev) => {
               // Merge or replace logic depending on needs. 
               // For simplicity, we fetch all when needed or just filter global state.
               return data; 
            } : data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const createCategory = async (data: Partial<Category>) => {
    try {
      const response = await fetch(`${API_URL}/categories`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify(data)
      });
      if (response.ok) {
        fetchCategories();
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  const updateCategory = async (id: string, data: Partial<Category>) => {
    try {
      const response = await fetch(`${API_URL}/categories/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify(data)
      });
      if (response.ok) {
        fetchCategories();
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/categories/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      if (response.ok) {
        fetchCategories();
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  const getRoomCategories = () => 
    categories.filter(c => c.type === 'room' && c.isActive !== false).map(c => c.name);
    
  const getInventoryCategories = () => 
    categories.filter(c => c.type === 'inventory' && c.isActive !== false).map(c => c.name);

  const getServiceCategories = () => 
    categories.filter(c => c.type === 'service' && c.isActive !== false).map(c => c.name);

  useEffect(() => {
    if (user) fetchCategories();
  }, [user]);

  return (
    <CategoryContext.Provider value={{ 
      categories, 
      loading, 
      fetchCategories, 
      createCategory, 
      updateCategory, 
      deleteCategory,
      getRoomCategories,
      getInventoryCategories,
      getServiceCategories
    }}>
      {children}
    </CategoryContext.Provider>
  );
};

export const useCategories = () => {
  const context = useContext(CategoryContext);
  if (!context) throw new Error('useCategories must be used within a CategoryProvider');
  return context;
};

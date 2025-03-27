"use client";

import { useState, useEffect } from "react";
import { Plus, MoreVertical, Trash } from "lucide-react";
import { toast } from "react-hot-toast";

interface Category {
  id: string;
  name: string;
  color: string;
  unit: string;
  stockAlert: string;
  productsCount: number;
}

// Color options - match the ones from the image
const colorOptions = [
  { name: "green", class: "bg-green-200 text-green-800" },
  { name: "lime", class: "bg-lime-200 text-lime-800" },
  { name: "emerald", class: "bg-emerald-200 text-emerald-800" },
  { name: "orange", class: "bg-orange-200 text-orange-800" },
  { name: "teal", class: "bg-teal-200 text-teal-800" },
  { name: "sky", class: "bg-sky-200 text-sky-800" },
  { name: "purple", class: "bg-purple-200 text-purple-800" },
  { name: "yellow", class: "bg-yellow-200 text-yellow-800" },
  { name: "amber", class: "bg-amber-200 text-amber-800" },
  { name: "indigo", class: "bg-indigo-200 text-indigo-800" },
  { name: "gray", class: "bg-gray-200 text-gray-800" },
  { name: "pink", class: "bg-pink-200 text-pink-800" },
  { name: "red", class: "bg-red-200 text-red-800" },
  { name: "rose", class: "bg-rose-200 text-rose-800" },
  { name: "blue", class: "bg-blue-200 text-blue-800" },
];

// Unit options
const unitOptions = ["weight", "piece"];

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  
  // State for add category modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: "",
    color: "green",
    unit: "piece",
    stockAlert: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State for dropdown menus
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  
  useEffect(() => {
    fetchCategories();
  }, []);
  
  const fetchCategories = async () => {
    setIsLoading(true);
    setError("");
    
    try {
      const response = await fetch("/api/categories");
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to load categories");
      }
      
      const data = await response.json();
      console.log("Categories data received:", data);
      setCategories(data.categories || []);
    } catch (error) {
      console.error("Error loading categories:", error);
      setError("Could not load categories. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewCategory(prev => ({ ...prev, [name]: value }));
  };
  
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCategory.name || !newCategory.color || !newCategory.unit || !newCategory.stockAlert) {
      toast.error("All fields are required");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(newCategory)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Error creating category");
      }
      
      toast.success("Category added successfully");
      
      // Reset form and close modal
      setNewCategory({
        name: "",
        color: "green",
        unit: "piece",
        stockAlert: ""
      });
      setShowAddModal(false);
      
      // Refresh categories list
      fetchCategories();
    } catch (error: any) {
      console.error("Error creating category:", error);
      toast.error(error.message || "Error creating category. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm("Are you sure you want to delete this category? This action cannot be undone.")) {
      return;
    }
    
    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: "DELETE"
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Error deleting category");
      }
      
      toast.success("Category deleted successfully");
      
      // Update local state to remove the deleted category
      setCategories(prev => prev.filter(category => category.id !== categoryId));
      
    } catch (error: any) {
      console.error("Error deleting category:", error);
      toast.error(error.message || "Error deleting category. Please try again.");
    }
    
    // Close dropdown
    setOpenDropdownId(null);
  };
  
  const toggleDropdown = (categoryId: string) => {
    if (openDropdownId === categoryId) {
      setOpenDropdownId(null);
    } else {
      setOpenDropdownId(categoryId);
    }
  };
  
  // Get color class by name
  const getColorClass = (colorName: string) => {
    return colorOptions.find(c => c.name === colorName)?.class || "bg-gray-200 text-gray-800";
  };
  
  return (
    <div className="p-4 mx-auto max-w-7xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-gray-900">Categories</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          <Plus className="h-4 w-4 mr-1" /> Add Category
        </button>
      </div>
      
      {error && (
        <div className="mb-4 p-2 bg-red-50 text-red-700 rounded-md border border-red-200 text-sm">
          {error}
        </div>
      )}
      
      {isLoading ? (
        <div className="flex justify-center my-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-4 text-center">
          <h3 className="text-base font-medium text-gray-900">No categories found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Start by adding your first category
          </p>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-100">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Color
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Products No.
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock Alert
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                  
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {categories.map((category) => (
                <tr key={category.id}>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">{category.name}</span>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-medium rounded-full ${getColorClass(category.color)}`}>
                      {category.color}
                    </span>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {category.unit}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {category.productsCount}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {category.stockAlert}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                    <div className="relative">
                      <button
                        onClick={() => toggleDropdown(category.id)}
                        className="text-gray-400 hover:text-gray-500"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      
                      {openDropdownId === category.id && (
                        <div className="absolute right-0 z-10 mt-1 w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                          <div className="py-1" role="menu" aria-orientation="vertical">
                            <button
                              onClick={() => handleDeleteCategory(category.id)}
                              className={`
                                px-3 py-1 text-xs text-red-700 hover:bg-red-50 w-full text-left flex items-center
                                ${category.productsCount > 0 ? 'opacity-50 cursor-not-allowed' : ''}
                              `}
                              disabled={category.productsCount > 0}
                              title={category.productsCount > 0 ? "Cannot delete category with products" : ""}
                            >
                              <Trash className="h-3 w-3 mr-1" />
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Add Category Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-auto">
            <div className="px-4 py-3 border-b">
              <h3 className="text-base font-medium text-gray-900">Add Category</h3>
            </div>
            
            <form onSubmit={handleAddCategory}>
              <div className="p-4 space-y-3">
                {/* Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={newCategory.name}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                    required
                  />
                </div>
                
                {/* Color */}
                <div>
                  <label htmlFor="color" className="block text-sm font-medium text-gray-700">
                    Color
                  </label>
                  <select
                    id="color"
                    name="color"
                    value={newCategory.color}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                    required
                  >
                    {colorOptions.map(color => (
                      <option key={color.name} value={color.name}>{color.name}</option>
                    ))}
                  </select>
                </div>
                
                {/* Unit */}
                <div>
                  <label htmlFor="unit" className="block text-sm font-medium text-gray-700">
                    Unit
                  </label>
                  <select
                    id="unit"
                    name="unit"
                    value={newCategory.unit}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                    required
                  >
                    {unitOptions.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
                
                {/* Stock Alert */}
                <div>
                  <label htmlFor="stockAlert" className="block text-sm font-medium text-gray-700">
                    Stock Alert
                  </label>
                  <input
                    type="text"
                    id="stockAlert"
                    name="stockAlert"
                    placeholder="e.g., 10pcs or 5g"
                    value={newCategory.stockAlert}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                    required
                  />
                </div>
              </div>
              
              <div className="px-4 py-3 bg-gray-50 flex justify-end space-x-2 rounded-b-lg">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-white py-1.5 px-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-green-600 py-1.5 px-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-400"
                >
                  {isSubmitting ? "Creating..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 
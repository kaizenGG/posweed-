"use client";

import { useState, useEffect } from "react";
import { Trash, PenSquare, Plus, Check, X } from "lucide-react";

interface Supplier {
  id: string;
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for create supplier modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    name: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
    notes: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State for edit supplier modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
    notes: ""
  });
  
  // State for delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<string | null>(null);
  
  // Load suppliers when component mounts
  useEffect(() => {
    fetchSuppliers();
  }, []);
  
  // Function to load the suppliers list
  const fetchSuppliers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/suppliers");
      if (!response.ok) throw new Error("Error loading suppliers");
      
      const data = await response.json();
      setSuppliers(data);
      setError(null);
    } catch (err: any) {
      console.error("Error loading suppliers:", err);
      setError(err.message || "Error loading suppliers");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to create a new supplier
  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newSupplier.name.trim()) {
      setError("Supplier name is required");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const response = await fetch("/api/suppliers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newSupplier),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error creating supplier");
      }
      
      await fetchSuppliers();
      setShowAddModal(false);
      setNewSupplier({
        name: "",
        contactName: "",
        email: "",
        phone: "",
        address: "",
        notes: ""
      });
      setError(null);
    } catch (err: any) {
      console.error("Error creating supplier:", err);
      setError(err.message || "Error creating supplier");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Open edit modal with supplier data
  const openEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setEditForm({
      name: supplier.name,
      contactName: supplier.contactName || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      notes: supplier.notes || ""
    });
    setShowEditModal(true);
  };
  
  // Function to update a supplier
  const handleUpdateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingSupplier) return;
    
    if (!editForm.name.trim()) {
      setError("Supplier name is required");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const response = await fetch(`/api/suppliers/${editingSupplier.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editForm),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error updating supplier");
      }
      
      await fetchSuppliers();
      setShowEditModal(false);
      setEditingSupplier(null);
      setError(null);
    } catch (err: any) {
      console.error("Error updating supplier:", err);
      setError(err.message || "Error updating supplier");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Open delete confirmation modal
  const openDeleteModal = (id: string) => {
    setSupplierToDelete(id);
    setShowDeleteModal(true);
  };
  
  // Function to delete a supplier
  const handleDeleteSupplier = async () => {
    if (!supplierToDelete) return;
    
    try {
      setIsSubmitting(true);
      
      const response = await fetch(`/api/suppliers/${supplierToDelete}`, {
        method: "DELETE"
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error deleting supplier");
      }
      
      await fetchSuppliers();
      setShowDeleteModal(false);
      setSupplierToDelete(null);
      setError(null);
    } catch (err: any) {
      console.error("Error deleting supplier:", err);
      setError(err.message || "Error deleting supplier");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };
  
  return (
    <div className="p-4 mx-auto max-w-7xl bg-gradient-to-br from-gray-50 to-white">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your sources of products and materials</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-full shadow-md flex items-center transform transition-transform hover:scale-105"
        >
          <Plus className="h-4 w-4 mr-1" />
          New Supplier
        </button>
      </div>
      
      {error && (
        <div className="mb-6 rounded-lg bg-red-50 border-l-4 border-red-500 p-4 animate-pulse">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {isLoading ? (
        <div className="flex flex-col justify-center items-center py-12">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-green-600 absolute top-0 left-0"></div>
          </div>
          <p className="mt-4 text-gray-600">Loading suppliers...</p>
        </div>
      ) : (
        <>
          {suppliers.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No suppliers found</h2>
              <p className="text-gray-500 mb-6">Start by adding your first supplier.</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Supplier
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {suppliers.map((supplier) => (
                <div 
                  key={supplier.id} 
                  className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 transition-all hover:shadow-lg hover:border-green-200"
                >
                  <div className="bg-gradient-to-r from-green-50 to-teal-50 px-6 py-4 border-b border-gray-100">
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-semibold text-gray-900">{supplier.name}</h3>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => openEditModal(supplier)}
                          className="p-1.5 rounded-md text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                        >
                          <PenSquare className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(supplier.id)}
                          className="p-1.5 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {supplier.contactName && (
                      <p className="text-sm text-gray-600 mt-1">{supplier.contactName}</p>
                    )}
                  </div>
                  
                  <div className="px-6 py-4 space-y-3">
                    <div className="grid grid-cols-6 gap-1 text-sm">
                      <div className="col-span-6 flex items-start">
                        <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center mr-2 mt-0.5">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-blue-700" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                          </svg>
                        </div>
                        <div className="flex-grow">
                          <p className="text-gray-700">{supplier.email || "Not registered"}</p>
                        </div>
                      </div>
                      
                      <div className="col-span-6 flex items-start">
                        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mr-2 mt-0.5">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-green-700" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                          </svg>
                        </div>
                        <div className="flex-grow">
                          <p className="text-gray-700">{supplier.phone || "Not registered"}</p>
                        </div>
                      </div>
                      
                      {supplier.address && (
                        <div className="col-span-6 flex items-start">
                          <div className="w-5 h-5 rounded-full bg-yellow-100 flex items-center justify-center mr-2 mt-0.5">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-yellow-700" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="flex-grow">
                            <p className="text-gray-700">{supplier.address}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {supplier.notes && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-start">
                          <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center mr-2 mt-0.5">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-purple-700" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                              <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <p className="text-gray-600 text-sm">{supplier.notes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-gray-50 px-6 py-3 flex justify-between items-center">
                    <div className="text-xs text-gray-500">
                      Created: {formatDate(supplier.createdAt)}
                    </div>
                    <button
                      onClick={() => openEditModal(supplier)}
                      className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                    >
                      View details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      
      {/* Add Supplier Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 transform transition-all">
            <div className="bg-gradient-to-r from-green-50 to-teal-50 px-6 py-4 rounded-t-xl border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">New Supplier</h2>
            </div>
            
            <form onSubmit={handleAddSupplier}>
              <div className="p-6 space-y-4">
                {/* Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    value={newSupplier.name}
                    onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                    required
                  />
                </div>
                
                {/* Contact Name */}
                <div>
                  <label htmlFor="contactName" className="block text-sm font-medium mb-1">
                    Contact Name
                  </label>
                  <input
                    type="text"
                    id="contactName"
                    className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    value={newSupplier.contactName}
                    onChange={(e) => setNewSupplier({ ...newSupplier, contactName: e.target.value })}
                  />
                </div>
                
                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    value={newSupplier.email}
                    onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                  />
                </div>
                
                {/* Phone */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    id="phone"
                    className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    value={newSupplier.phone}
                    onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                  />
                </div>
                
                {/* Address */}
                <div>
                  <label htmlFor="address" className="block text-sm font-medium mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    id="address"
                    className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    value={newSupplier.address}
                    onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                  />
                </div>
                
                {/* Notes */}
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium mb-1">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    value={newSupplier.notes}
                    onChange={(e) => setNewSupplier({ ...newSupplier, notes: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="flex rounded-b-xl overflow-hidden">
                <button
                  type="button"
                  className="w-full py-3 text-center text-gray-700 bg-gray-100 font-medium hover:bg-gray-200 transition-colors"
                  onClick={() => setShowAddModal(false)}
                  disabled={isSubmitting}
                >
                  <X className="inline-block h-4 w-4 mr-1" />
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full py-3 text-center text-white bg-green-600 font-medium hover:bg-green-700 transition-colors"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="inline-block animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="inline-block h-4 w-4 mr-1" />
                      Save
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Edit Supplier Modal - Keep similar structure to the add modal but adapt it to the style */}
      {showEditModal && editingSupplier && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 transform transition-all">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 rounded-t-xl border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Edit Supplier</h2>
            </div>
            
            <form onSubmit={handleUpdateSupplier}>
              <div className="p-6 space-y-4">
                {/* Keep the same fields as in the add form */}
                {/* Name */}
                <div>
                  <label htmlFor="edit-name" className="block text-sm font-medium mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="edit-name"
                    className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                  />
                </div>
                
                {/* Contact Name */}
                <div>
                  <label htmlFor="edit-contactName" className="block text-sm font-medium mb-1">
                    Contact Name
                  </label>
                  <input
                    type="text"
                    id="edit-contactName"
                    className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={editForm.contactName}
                    onChange={(e) => setEditForm({ ...editForm, contactName: e.target.value })}
                  />
                </div>
                
                {/* Email */}
                <div>
                  <label htmlFor="edit-email" className="block text-sm font-medium mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="edit-email"
                    className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  />
                </div>
                
                {/* Phone */}
                <div>
                  <label htmlFor="edit-phone" className="block text-sm font-medium mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    id="edit-phone"
                    className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>
                
                {/* Address */}
                <div>
                  <label htmlFor="edit-address" className="block text-sm font-medium mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    id="edit-address"
                    className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  />
                </div>
                
                {/* Notes */}
                <div>
                  <label htmlFor="edit-notes" className="block text-sm font-medium mb-1">
                    Notes
                  </label>
                  <textarea
                    id="edit-notes"
                    className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="flex rounded-b-xl overflow-hidden">
                <button
                  type="button"
                  className="w-full py-3 text-center text-gray-700 bg-gray-100 font-medium hover:bg-gray-200 transition-colors"
                  onClick={() => setShowEditModal(false)}
                  disabled={isSubmitting}
                >
                  <X className="inline-block h-4 w-4 mr-1" />
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full py-3 text-center text-white bg-blue-600 font-medium hover:bg-blue-700 transition-colors"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="inline-block animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Updating...
                    </>
                  ) : (
                    <>
                      <Check className="inline-block h-4 w-4 mr-1" />
                      Update
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 transform transition-all">
            <div className="bg-gradient-to-r from-red-50 to-orange-50 px-6 py-4 rounded-t-xl border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Delete Supplier</h2>
            </div>
            
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <Trash className="h-6 w-6 text-red-600" />
                </div>
                <p className="text-gray-600">
                  Are you sure you want to delete this supplier? This action cannot be undone.
                </p>
              </div>
              <div className="bg-amber-50 border-l-4 border-amber-400 p-4 text-sm text-amber-700">
                All data associated with this supplier will be deleted.
              </div>
            </div>
            
            <div className="flex rounded-b-xl overflow-hidden">
              <button
                type="button"
                className="w-full py-3 text-center text-gray-700 bg-gray-100 font-medium hover:bg-gray-200 transition-colors"
                onClick={() => setShowDeleteModal(false)}
                disabled={isSubmitting}
              >
                <X className="inline-block h-4 w-4 mr-1" />
                Cancel
              </button>
              <button
                type="button"
                className="w-full py-3 text-center text-white bg-red-600 font-medium hover:bg-red-700 transition-colors"
                onClick={handleDeleteSupplier}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <svg className="inline-block animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash className="inline-block h-4 w-4 mr-1" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
import prisma from '@/lib/prisma';

// Default categories from the image
export const defaultCategories = [
  { name: "Flowers", color: "green", unit: "weight", stockAlert: "10g" },
  { name: "Rolling Papers", color: "lime", unit: "piece", stockAlert: "5pcs" },
  { name: "Others", color: "orange", unit: "piece", stockAlert: "5pcs" },
  { name: "Pre-Rolls", color: "emerald", unit: "piece", stockAlert: "0pcs" },
  { name: "Edibles", color: "lime", unit: "piece", stockAlert: "0pcs" },
  { name: "Filters", color: "sky", unit: "piece", stockAlert: "0pcs" },
  { name: "Lighters", color: "teal", unit: "piece", stockAlert: "10pcs" },
  { name: "Bongs", color: "orange", unit: "piece", stockAlert: "0pcs" },
  { name: "Accessories", color: "orange", unit: "piece", stockAlert: "5pcs" },
  { name: "Grinders", color: "orange", unit: "piece", stockAlert: "0pcs" },
  { name: "Concentrates", color: "purple", unit: "weight", stockAlert: "0g" },
  { name: "Drinks", color: "yellow", unit: "piece", stockAlert: "0pcs" },
  { name: "Oils", color: "lime", unit: "piece", stockAlert: "0pcs" },
  { name: "Pipes", color: "amber", unit: "piece", stockAlert: "0pcs" },
  { name: "Food", color: "indigo", unit: "piece", stockAlert: "0pcs" },
  { name: "Otherss", color: "gray", unit: "piece", stockAlert: "12pcs" },
  { name: "Snacks", color: "pink", unit: "piece", stockAlert: "0pcs" },
  { name: "Othersssss", color: "red", unit: "weight", stockAlert: "0g" },
  { name: "Apparel", color: "rose", unit: "piece", stockAlert: "0pcs" },
  { name: "Abc", color: "gray", unit: "weight", stockAlert: "0.04g" },
  { name: "Vape", color: "blue", unit: "piece", stockAlert: "0pcs" }
];

/**
 * Function to create default categories for a new store
 */
export async function createDefaultCategoriesForStore(storeId: string) {
  try {
    console.log(`[Categories] Creating default categories for store: ${storeId}`);
    
    // Create all categories in parallel
    const categories = await Promise.all(
      defaultCategories.map(async (category) => {
        try {
          return await prisma.category.create({
            data: {
              ...category,
              storeId
            }
          });
        } catch (error) {
          console.error(`[Categories] Error creating category ${category.name}:`, error);
          return null;
        }
      })
    );
    
    const successfulCategories = categories.filter(Boolean);
    console.log(`[Categories] Created ${successfulCategories.length} categories for store ${storeId}`);
    
    return successfulCategories;
  } catch (error) {
    console.error(`[Categories] Error creating default categories:`, error);
    throw error;
  }
} 
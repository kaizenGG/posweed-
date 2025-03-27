import { PrismaClient } from '@prisma/client';
import { defaultCategories } from './src/lib/categories';

const prisma = new PrismaClient();

/**
 * Migration script for categories
 * 
 * This script:
 * 1. Creates default categories for all existing stores
 * 2. Associates existing products with the appropriate category based on name
 */
async function main() {
  try {
    console.log('Starting migration to categories...');
    
    // Get all existing stores
    const stores = await prisma.store.findMany();
    console.log(`Found ${stores.length} stores to migrate`);
    
    // Process each store
    for (const store of stores) {
      console.log(`\nProcessing store: ${store.name} (${store.id})`);
      
      // Create default categories for this store
      const categoriesMap = new Map();
      
      for (const categoryData of defaultCategories) {
        try {
          const category = await prisma.category.create({
            data: {
              ...categoryData,
              storeId: store.id
            }
          });
          
          console.log(`Created category: ${category.name}`);
          categoriesMap.set(category.name.toLowerCase(), category);
        } catch (error) {
          console.error(`Error creating category ${categoryData.name}:`, error);
          // Continue with other categories even if one fails
        }
      }
      
      // Get all products for this store
      const products = await prisma.product.findMany({
        where: { storeId: store.id }
      });
      
      console.log(`Found ${products.length} products to migrate for this store`);
      
      // Update products to link to the appropriate category
      for (const product of products) {
        // Try to find a matching category
        const productCategoryLower = product.category ? product.category.toLowerCase() : '';
        let matchingCategory = categoriesMap.get(productCategoryLower);
        
        // If no exact match, use "Others" as a fallback
        if (!matchingCategory) {
          matchingCategory = categoriesMap.get('others');
          
          // If even "Others" category doesn't exist, skip this product
          if (!matchingCategory) {
            console.warn(`No matching category found for product: ${product.name} (category: ${product.category})`);
            continue;
          }
        }
        
        // Update the product
        try {
          await prisma.product.update({
            where: { id: product.id },
            data: { categoryId: matchingCategory.id }
          });
          
          console.log(`Updated product: ${product.name} -> ${matchingCategory.name}`);
        } catch (error) {
          console.error(`Error updating product ${product.name}:`, error);
        }
      }
    }
    
    console.log('\nMigration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 
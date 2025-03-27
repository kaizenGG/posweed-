export const users = [
  {
    id: "user1",
    name: "Admin User",
    email: "admin@example.com",
    role: "ADMIN",
    image: "https://ui-avatars.com/api/?name=Admin+User&background=random",
    createdAt: new Date("2023-01-01"),
    updatedAt: new Date("2023-01-01"),
  },
  {
    id: "user2",
    name: "Store Manager",
    email: "manager@example.com",
    role: "USER",
    image: "https://ui-avatars.com/api/?name=Store+Manager&background=random",
    createdAt: new Date("2023-01-02"),
    updatedAt: new Date("2023-01-02"),
  }
];

export const stores = [
  {
    id: "store1",
    name: "Green Leaf Dispensary",
    description: "Dispensario especializado en productos de cannabis medicinal y recreativo",
    address: "Calle Principal 123, Ciudad Verde",
    phone: "+1234567890",
    email: "info@greenleaf.com",
    image: "https://images.unsplash.com/photo-1589579234096-29296a71930d?q=80&w=320&h=200",
    status: "ACTIVE",
    createdAt: new Date("2023-02-01"),
    updatedAt: new Date("2023-02-01"),
    userId: "user1"
  },
  {
    id: "store2",
    name: "Cannabliss",
    description: "Tienda premium de cannabis con variedad de productos orgánicos",
    address: "Avenida Central 456, Ciudad Verde",
    phone: "+0987654321",
    email: "contact@cannabliss.com",
    image: "https://images.unsplash.com/photo-1603909223429-69bb7101f94e?q=80&w=320&h=200",
    status: "ACTIVE",
    createdAt: new Date("2023-02-15"),
    updatedAt: new Date("2023-02-15"),
    userId: "user1"
  },
  {
    id: "store3",
    name: "High Times Shop",
    description: "Tienda especializada en accesorios y productos de cannabis premium",
    address: "Calle Secundaria 789, Ciudad Verde",
    phone: "+1122334455",
    email: "sales@hightimes.com",
    image: "https://images.unsplash.com/photo-1590114065496-29021faa8ad9?q=80&w=320&h=200",
    status: "INACTIVE",
    createdAt: new Date("2023-03-10"),
    updatedAt: new Date("2023-03-10"),
    userId: "user2"
  }
];

export const products = [
  {
    id: "product1",
    name: "Cannabis Sativa",
    description: "Variedad de cannabis sativa premium",
    price: 15.99,
    category: "Flores",
    image: "https://images.unsplash.com/photo-1603909223429-69bb7101f94e?q=80&w=320&h=200",
    stock: 100,
    createdAt: new Date("2023-02-05"),
    updatedAt: new Date("2023-02-05"),
    storeId: "store1"
  },
  {
    id: "product2",
    name: "Aceite CBD",
    description: "Aceite de CBD de espectro completo",
    price: 45.99,
    category: "Extractos",
    image: "https://images.unsplash.com/photo-1589579234096-29296a71930d?q=80&w=320&h=200",
    stock: 50,
    createdAt: new Date("2023-02-10"),
    updatedAt: new Date("2023-02-10"),
    storeId: "store1"
  },
  {
    id: "product3",
    name: "Gomitas de Cannabis",
    description: "Gomitas con THC/CBD",
    price: 25.99,
    category: "Comestibles",
    image: "https://images.unsplash.com/photo-1625517236224-70fcc6db5be4?q=80&w=320&h=200",
    stock: 75,
    createdAt: new Date("2023-02-15"),
    updatedAt: new Date("2023-02-15"),
    storeId: "store2"
  }
];

export const orders = [
  {
    id: "order1",
    status: "COMPLETED",
    total: 61.98,
    createdAt: new Date("2023-03-01"),
    updatedAt: new Date("2023-03-01"),
    items: [
      {
        id: "item1",
        quantity: 2,
        price: 15.99,
        orderId: "order1",
        productId: "product1"
      },
      {
        id: "item2",
        quantity: 1,
        price: 30.00,
        orderId: "order1",
        productId: "product2"
      }
    ]
  },
  {
    id: "order2",
    status: "PENDING",
    total: 25.99,
    createdAt: new Date("2023-03-05"),
    updatedAt: new Date("2023-03-05"),
    items: [
      {
        id: "item3",
        quantity: 1,
        price: 25.99,
        orderId: "order2",
        productId: "product3"
      }
    ]
  }
]; 
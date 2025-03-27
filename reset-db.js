/**
 * Script para resetear la base de datos PostgreSQL y reconstruirla desde cero
 * Ejecutar con: node reset-db.js
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf');

// Función para ejecutar comandos y mostrar output
function runCommand(command) {
  return new Promise((resolve, reject) => {
    console.log(`\n> Ejecutando: ${command}\n`);
    
    const childProcess = exec(command, { maxBuffer: 1024 * 5000 }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        reject(error);
        return;
      }
      
      if (stderr) {
        console.log(`STDERR: ${stderr}`);
      }
      
      console.log(`STDOUT: ${stdout}`);
      resolve(stdout);
    });

    // Mostrar output en tiempo real
    childProcess.stdout.on('data', (data) => {
      process.stdout.write(data);
    });
    
    childProcess.stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}

// Función para eliminar directorio de forma segura (compatible con Windows)
function removeDirectory(dirPath) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dirPath)) {
      console.log(`Eliminando directorio: ${dirPath}`);
      
      // Usar rimraf para eliminar directorios en Windows (si está instalado)
      if (typeof rimraf === 'function') {
        rimraf(dirPath, (error) => {
          if (error) {
            console.error('Error al eliminar directorio:', error);
            // Intentar método alternativo
            try {
              fs.rmdirSync(dirPath, { recursive: true });
              resolve();
            } catch (err) {
              reject(err);
            }
          } else {
            resolve();
          }
        });
      } else {
        // Alternativa nativa para Windows
        try {
          fs.rmdirSync(dirPath, { recursive: true });
          resolve();
        } catch (error) {
          reject(error);
        }
      }
    } else {
      resolve();
    }
  });
}

async function resetDatabase() {
  try {
    console.log('🗑️  Iniciando el proceso de reseteo de la base de datos...');
    
    // 1. Verificar que estamos en la carpeta correcta
    if (!fs.existsSync('./prisma/schema.prisma')) {
      console.error('Error: Este script debe ejecutarse desde la raíz del proyecto.');
      process.exit(1);
    }
    
    // 2. Borrar la carpeta migrations si existe
    console.log('🗂️  Eliminando migraciones antiguas...');
    const migrationsPath = path.join(__dirname, 'prisma', 'migrations');
    await removeDirectory(migrationsPath);
    
    // 3. Eliminar y recrear la base de datos
    console.log('🔄 Reiniciando base de datos...');
    try {
      await runCommand('npx prisma migrate reset --force');
    } catch (error) {
      console.log('Continuando a pesar del error...');
    }
    
    // 4. Crear una nueva migración inicial
    console.log('📝 Creando nueva migración...');
    await runCommand('npx prisma migrate dev --name initial --create-only');
    
    // 5. Aplicar la migración
    console.log('🚀 Aplicando migración...');
    await runCommand('npx prisma migrate deploy');
    
    // 6. Generar el cliente Prisma
    console.log('🔧 Generando cliente Prisma...');
    await runCommand('npx prisma generate');
    
    // 7. Ejecutar el seed para crear datos iniciales
    console.log('🌱 Ejecutando seed para crear datos iniciales...');
    await runCommand('npx prisma db seed');
    
    console.log('\n✅ ¡Base de datos reiniciada exitosamente!');
    console.log('\n📊 Puedes ver tu base de datos con: npx prisma studio');
    console.log('\n🔑 Credenciales:');
    console.log('   Admin: admin@posweed.com / Admin123!');
    console.log('   Tienda: tienda1 / Tienda123!');
    
  } catch (error) {
    console.error('❌ Error al resetear la base de datos:', error);
    process.exit(1);
  }
}

// Ejecutar la función principal
resetDatabase(); 
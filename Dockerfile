FROM node:18-alpine

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY server/package*.json ./server/

# Instalar dependencias del servidor
WORKDIR /app/server
RUN npm ci --only=production

# Volver al directorio raíz
WORKDIR /app

# Copiar el resto de la aplicación
COPY . .

# Crear directorio para la base de datos
RUN mkdir -p /app/server/data

# Exponer el puerto
EXPOSE 3000

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=3000

# Comando para iniciar el servidor
CMD ["node", "server/server.js"]

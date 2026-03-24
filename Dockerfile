# Imagen base de Node
FROM node:20

# Carpeta de trabajo dentro del contenedor
WORKDIR /app

# Copiar package.json
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del proyecto
COPY . .

# Puerto que usa tu app
EXPOSE 4500

# Comando para arrancar
CMD ["node", "index.js"]

# Usamos una imagen base de NGINX
FROM nginx:alpine

# Removemos el archivo por defecto de NGINX
RUN rm /usr/share/nginx/html/index.html

# Copiamos nuestro archivo HTML al contenedor
COPY index.html /usr/share/nginx/html/

# Exponemos el puerto 80
EXPOSE 80

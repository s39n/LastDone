FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
RUN npm install --omit=dev
COPY index.js store.js ./
RUN mkdir -p /app/data
EXPOSE 4000
VOLUME ["/app/data"]
CMD ["node", "index.js"]

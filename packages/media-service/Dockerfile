FROM node:20-alpine
WORKDIR /app

# Install deps first (cached layer)
COPY package.json ./
RUN npm install --omit=dev

# Copy source
COPY src/ ./src/

# Storage dirs created at runtime via ensureStorageDir()
EXPOSE 3003
CMD ["node", "src/index.js"]

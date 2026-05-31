FROM node:20-alpine
WORKDIR /app

# Install deps first (cached layer)
COPY package.json ./
RUN npm install --omit=dev

# Copy source
COPY src/ ./src/

EXPOSE 3001
CMD ["node", "src/index.js"]

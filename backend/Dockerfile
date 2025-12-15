# Backend Dockerfile
FROM node:20-alpine AS backend

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create data and logs directories
RUN mkdir -p data logs

# Expose port
EXPOSE 3001

# Start backend
CMD ["npm", "start"]

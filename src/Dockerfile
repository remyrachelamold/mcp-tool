# Use base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json tsconfig.json ./
RUN npm install 

# Copy all source code
COPY . .

# Build typescript to Javascript
RUN npm run build

# Expose port
EXPOSE 3000

# Command to start app
CMD ["node", "dist/index.js"]
# Stage 1: Build stage
FROM node:22-alpine AS builder
WORKDIR /app
COPY code/package*.json ./
RUN npm install
COPY code .
RUN npm run build

# Stage 2: Production stage
FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public

# เปิด Port 3000 (Port มาตรฐานของ Next.js)
EXPOSE 3000

# คำสั่งสำหรับ run แอปพลิเคชัน
CMD ["npm", "start"]
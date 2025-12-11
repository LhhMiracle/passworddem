# 后端 Dockerfile
FROM node:20-alpine AS base

# 安装必要的构建工具
RUN apk add --no-cache python3 make g++

WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装生产依赖
FROM base AS deps
RUN npm ci --only=production

# 开发环境
FROM base AS dev
RUN npm ci
COPY . .
EXPOSE 3001
CMD ["npm", "run", "dev"]

# 生产环境
FROM node:20-alpine AS production

WORKDIR /app

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 复制生产依赖
COPY --from=deps /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

# 创建数据目录
RUN mkdir -p /app/data /app/uploads && \
    chown -R nodejs:nodejs /app/data /app/uploads

# 切换到非 root 用户
USER nodejs

# 环境变量
ENV NODE_ENV=production
ENV PORT=3001

# 暴露端口
EXPOSE 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# 启动命令
CMD ["node", "src/index.js"]

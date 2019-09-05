FROM node:12-alpine
RUN apk add --no-cache git bash
RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app
WORKDIR /home/node/app
COPY package*.json ./
USER node
RUN npm install --no-optional --production
COPY --chown=node:node . .
EXPOSE 18443
CMD [ "node", "primary", "--docker" ]

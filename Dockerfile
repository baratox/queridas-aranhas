FROM node:9.3.0

WORKDIR /usr/xeretas

# Install dependencies during build to benefit from cache.
#COPY package.json package-lock.json ./
#RUN npm install

# To execute local commands like `gulp`.
ENV PATH "$PATH:./node_modules/.bin/"

VOLUME /usr/xeretas

CMD ["/usr/local/bin/node", "xereta.js", "--help"]
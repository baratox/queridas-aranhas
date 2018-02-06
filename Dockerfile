FROM node:9.3.0

WORKDIR /usr/xeretas

# Install dependencies during build to benefit from cache.
#COPY package.json package-lock.json ./
#RUN npm install

# To execute local commands like `gulp`.
ENV PATH "$PATH:./node_modules/.bin/"

VOLUME /usr/xeretas

RUN echo '#!/bin/bash\n/usr/local/bin/node /usr/xeretas/xereta.js $*' > /usr/local/bin/xereta && \
    chmod +x /usr/local/bin/xereta

CMD ["/usr/local/bin/xereta", "--help"]
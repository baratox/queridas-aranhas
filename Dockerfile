FROM node:9.3.0

WORKDIR /usr/queridas

# Install dependencies during build to benefit from cache.
COPY package.json package-lock.json ./
RUN npm install

# To execute local commands like `gulp`.
ENV PATH "$PATH:./node_modules/.bin/"

VOLUME /usr/queridas

RUN echo '#!/bin/bash\n/usr/local/bin/node /usr/queridas/index.js $*' > /usr/local/bin/aranhas && \
    chmod +x /usr/local/bin/aranhas

CMD ["/usr/local/bin/aranhas", "--help"]
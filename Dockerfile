FROM node:8

WORKDIR /app
ADD package.json .
ADD package-lock.json .
ADD src src
ADD html html

RUN npm install
RUN npm run-script sass

EXPOSE 3000

ARG upstream=https://jsonplaceholder.typicode.com/todos/1
ARG label=unknown

ENV SNR_UPSTREAM=${upstream}
ENV SNR_LABEL=${label}

CMD npm start

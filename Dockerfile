FROM node:8-alpine
COPY src .

EXPOSE 3000

ARG upstream
ARG label

ENV SNR_UPSTREAM=${upstream}
ENV SNR_LABEL=${label}

RUN node index.js

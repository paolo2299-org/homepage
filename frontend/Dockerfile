FROM nginx:1.27-alpine

ENV PORT=8080
ENV BACKEND_ORIGIN=https://api.pdlawson.com

COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY index.html /usr/share/nginx/html/index.html
COPY style.css /usr/share/nginx/html/style.css
COPY llm /usr/share/nginx/html/llm

FROM nginx:1.27-alpine

ENV PORT=8080

COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY index.html /usr/share/nginx/html/index.html
COPY style.css /usr/share/nginx/html/style.css
COPY ai-news/ /usr/share/nginx/html/ai-news/

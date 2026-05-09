FROM nginx:1.27-alpine

ENV PORT=8080

COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY . /usr/share/nginx/html/

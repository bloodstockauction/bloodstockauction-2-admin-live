#!/bin/sh

cp ./src/environments/config_prod.js ./src/environments/config.js 
npm run build

cp ./src/environments/config_dev.js ./src/environments/config.js 

##set AWS profile
export AWS_DEFAULT_PROFILE=bloodstockauction2

#delete old version files
aws s3 rm s3://bloodstockauction2-admin-live/ --recursive

#upload web application files without browser/CDN caching
aws s3 sync ./public/ s3://bloodstockauction2-admin-live/ \
  --cache-control "no-cache, no-store, must-revalidate, max-age=0"

# ensure entry HTML and version manifest are never cached at the edge
aws s3 cp ./public/index.html s3://bloodstockauction2-admin-live/index.html \
  --cache-control "no-cache, no-store, must-revalidate, max-age=0" \
  --content-type "text/html; charset=utf-8"

aws s3 cp ./public/version.json s3://bloodstockauction2-admin-live/version.json \
  --cache-control "no-cache, no-store, must-revalidate, max-age=0" \
  --content-type "application/json; charset=utf-8"

#invalidation for new Web resources
aws cloudfront create-invalidation --distribution-id E2VPVRY6G8PIEO --paths "/*"

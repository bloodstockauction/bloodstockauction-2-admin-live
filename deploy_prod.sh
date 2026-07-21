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

#invalidation for new Web resources
aws cloudfront create-invalidation --distribution-id E2VPVRY6G8PIEO --paths "/*"

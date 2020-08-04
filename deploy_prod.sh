#!/bin/sh

cp ./src/environments/config_prod.js ./src/environments/config.js 
npm run build

cp ./src/environments/config_dev.js ./src/environments/config.js 

##set AWS profile
export AWS_DEFAULT_PROFILE=bloodstockauction2-us

#delete old version files
aws s3 rm s3://bloodstockauction2-us-admin-live/ --recursive

#upload web application files
aws s3 sync ./public/ s3://bloodstockauction2-us-admin-live/

#invalidation for new Web resources
# aws cloudfront create-invalidation --distribution-id E2VPVRY6G8PIEO --paths "/*"

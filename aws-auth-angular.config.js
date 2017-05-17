(function() {
  'use strict';
  angular.module('aws-auth-angular-config', [])
  .constant('awsAuthAngularInfo', {
    AUTH0_CLIENT_ID: 'XXX',
    AUTH0_DOMAIN: 'XXX.eu.auth0.com',
    AUTH0_CALLBACK_URL: '/',
    AWS_REGION: 'eu-central-1',
    AWS_SERVICE: 'execute-api',
    AWS_URLREGEX: 'amazonaws.com/.*/admin'
  });
}());

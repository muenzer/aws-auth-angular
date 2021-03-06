(function() {
  'use strict';

  angular.module('aws-auth-angular')
  .config(authConfig)
  .config(awsConfig)
  .run(authServiceConfig)
  .run(stateChange);

  authConfig.$inject = ['lockProvider', 'angularAuth0Provider', 'awsAuthAngularInfo'];
  function authConfig(lockProvider, angularAuth0Provider, awsAuthAngularInfo) {
    var options = {auth: { redirect: false }};
    lockProvider.init({
      clientID: awsAuthAngularInfo.AUTH0_CLIENT_ID,
      domain: awsAuthAngularInfo.AUTH0_DOMAIN,
      options: {
        auth: {
          params: {
            callbackURL: awsAuthAngularInfo.AUTH0_CALLBACK_URL,
            respone: 'token'
          }
        }
      }
    });

    angularAuth0Provider.init({
      clientID: awsAuthAngularInfo.AUTH0_CLIENT_ID,
      domain: awsAuthAngularInfo.AUTH0_DOMAIN
    });
  }

  stateChange.$inject = ['$rootScope', '$state'];
  function stateChange($rootScope, $state) {
    $rootScope.$on('$stateChangeStart', function(e, to, params) {
      localStorage.setItem('redirect_url', $state.href(to.name, params));
    });
  }

  awsConfig.$inject = ['$httpProvider', 'APIGInterceptorProvider', 'awsAuthAngularInfo'];
  function awsConfig($httpProvider, APIGInterceptorProvider, awsAuthAngularInfo) {
    APIGInterceptorProvider.config({
      headers: {},
      region: awsAuthAngularInfo.AWS_REGION,
      service: awsAuthAngularInfo.AWS_SERVICE,
      urlRegex: awsAuthAngularInfo.AWS_URLREGEX
    });

    credentialsGetter.$inject = ['authService'];
    function credentialsGetter(authService) {
      return authService.getAWSToken().then(function (token) {
        var aws =   {
          accessKeyId: token.AccessKeyId,
          secretAccessKey: token.SecretAccessKey,
          sessionToken: token.SessionToken
        };
        return aws;
      }).catch(function () {
      });
    }

    APIGInterceptorProvider.credentialsGetter = credentialsGetter;

    $httpProvider.interceptors.push('APIGInterceptor');
  }

  authServiceConfig.$inject = ['$rootScope', 'authService', 'lock'];
  function authServiceConfig($rootScope, authService, lock) {
    // Put the authService on $rootScope so its methods
    // can be accessed from the nav bar
    $rootScope.authService = authService;

    // Register the authentication listener that is
    // set up in auth.service.js
    authService.registerAuthenticationListener();

    // Register the synchronous hash parser
    lock.interceptHash();

  }

}());

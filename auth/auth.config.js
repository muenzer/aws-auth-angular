(function() {
  'use strict';

  angular.module('aws-auth-angular')
  .config(authConfig)
  .config(awsConfig)
  .constant('accountInfo', {
    AUTH0_CLIENT_ID: AUTH0_CLIENT_ID,
    AUTH0_DOMAIN: AUTH0_DOMAIN,
    AUTH0_CALLBACK_URL: AUTH0_CALLBACK_URL
  })
  .run(authServiceConfig);

  authConfig.$inject = ['lockProvider', 'angularAuth0Provider', 'accountInfo'];
  function authConfig(lockProvider, angularAuth0Provider, accountInfo) {
    var options = {auth: { redirect: false }};
    lockProvider.init({
      clientID: accountInfo.AUTH0_CLIENT_ID,
      domain: accountInfo.AUTH0_DOMAIN,
      options: {
        auth: {
          params: {
            callbackURL: accountInfo.AUTH0_CALLBACK_URL,
            respone: 'token'
          }
        }
      }
    });

    angularAuth0Provider.init({
      clientID: accountInfo.AUTH0_CLIENT_ID,
      domain: accountInfo.AUTH0_DOMAIN
    });
  }

  awsConfig.$inject = ['$httpProvider', 'APIGInterceptorProvider'];
  function awsConfig($httpProvider, APIGInterceptorProvider) {
    APIGInterceptorProvider.config({
      headers: {},
      region: 'eu-central-1',
      service: 'execute-api',
      urlRegex: 'amazonaws.com/.*/admin'
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
        //authService.login();
      });
    }

    APIGInterceptorProvider.credentialsGetter = credentialsGetter;

    $httpProvider.interceptors.push('APIGInterceptor');
  }

  // stateChange.$inject = ['$rootScope', '$state', 'authService'];
  // function stateChange($rootScope, $state, authService) {
  //   $rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams){
  //     if (toState.name !== 'login' && toState.name.includes('admin')){
  //       authService.getToken().catch(function () {
  //         // User isn’t authenticated
  //         $state.transitionTo('login');
  //         event.preventDefault();
  //       });
  //     }
  //   });
  //
  // }

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

  //localStorage.removeItem('AWS.config.credentials');
}

}());
